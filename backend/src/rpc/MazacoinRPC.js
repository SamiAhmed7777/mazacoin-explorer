const { NodeSSH } = require('node-ssh');
const NodeCache = require('node-cache');
const winston = require('winston');

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/rpc.log' })
  ]
});

class MazacoinRPC {
  constructor() {
    this.ssh = new NodeSSH();
    this.cache = new NodeCache({ stdTTL: 30 }); // 30 second cache
    this.connected = false;
    
    this.config = {
      host: '100.85.236.10',
      username: 'hello',
      privateKeyPath: process.env.SSH_KEY_PATH || '/root/.ssh/krystie_to_sami_pc'
    };
    
    this.cliPath = 'E:\\coins\\MAZA\\daemon\\maza-cli.exe';
  }

  async connect() {
    if (this.connected) {
      // Test if connection is still alive
      try {
        await this.ssh.execCommand('echo test', { options: { timeout: 5000 } });
        return; // Connection still good
      } catch (error) {
        logger.warn('SSH connection test failed, reconnecting...');
        this.connected = false;
        try {
          this.ssh.dispose();
        } catch (e) {
          // Ignore disposal errors
        }
        this.ssh = new (require('node-ssh').NodeSSH)();
      }
    }
    
    try {
      await this.ssh.connect({
        host: this.config.host,
        username: this.config.username,
        privateKeyPath: this.config.privateKeyPath,
        keepaliveInterval: 10000, // Send keepalive every 10 seconds
        keepaliveCountMax: 3
      });
      this.connected = true;
      logger.info('Connected to Mazacoin node via SSH');
    } catch (error) {
      logger.error('SSH connection failed:', error);
      this.connected = false;
      throw new Error(`Failed to connect to Mazacoin node: ${error.message}`);
    }
  }

  async execCommand(command, retries = 1) {
    await this.connect();
    
    const fullCommand = `powershell.exe -Command "${this.cliPath} -datadir=E:\\coins\\MAZA ${command}"`;
    logger.debug(`Executing: ${fullCommand}`);
    
    try {
      const result = await this.ssh.execCommand(fullCommand, {
        execOptions: { pty: false },
        options: { timeout: 30000 } // 30 second timeout
      });
      
      if (result.code !== 0) {
        throw new Error(`Command failed: ${result.stderr}`);
      }
      
      return result.stdout.trim();
    } catch (error) {
      // If connection error and we have retries left, reconnect and try again
      if ((error.code === 'ECONNRESET' || error.message?.includes('Not connected')) && retries > 0) {
        logger.warn(`Connection error, retrying... (${retries} attempts left)`);
        this.connected = false;
        return this.execCommand(command, retries - 1);
      }
      
      logger.error(`RPC command failed (${command}):`, error);
      throw error;
    }
  }

  async call(method, ...params) {
    const cacheKey = `${method}:${params.join(':')}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    
    const paramsStr = params.map(p => `"${p}"`).join(' ');
    const command = params.length > 0 ? `${method} ${paramsStr}` : method;
    
    const output = await this.execCommand(command);
    
    let result;
    try {
      result = JSON.parse(output);
    } catch {
      result = output; // Return raw if not JSON
    }
    
    // Cache the result
    this.cache.set(cacheKey, result);
    
    return result;
  }

  // Blockchain methods
  async getBlockCount() {
    return parseInt(await this.call('getblockcount'));
  }

  async getBlockHash(height) {
    return await this.call('getblockhash', height);
  }

  async getBlock(hashOrHeight) {
    // If numeric, get hash first
    if (typeof hashOrHeight === 'number' || /^\d+$/.test(hashOrHeight)) {
      const hash = await this.getBlockHash(parseInt(hashOrHeight));
      return await this.call('getblock', hash);
    }
    return await this.call('getblock', hashOrHeight);
  }

  async getTransaction(txid) {
    return await this.call('getrawtransaction', txid, '1');
  }

  async getAddressBalance(address) {
    // Note: This may require txindex enabled on the node
    try {
      return await this.call('getaddressbalance', `{"addresses":["${address}"]}`);
    } catch (error) {
      logger.warn(`getaddressbalance not available, falling back to manual calculation`);
      return null;
    }
  }

  async getPeerInfo() {
    return await this.call('getpeerinfo');
  }

  async getNetworkInfo() {
    return await this.call('getnetworkinfo');
  }

  async getMiningInfo() {
    return await this.call('getmininginfo');
  }

  async getDifficulty() {
    return parseFloat(await this.call('getdifficulty'));
  }

  async getConnectionCount() {
    return parseInt(await this.call('getconnectioncount'));
  }

  disconnect() {
    if (this.connected) {
      this.ssh.dispose();
      this.connected = false;
      logger.info('Disconnected from Mazacoin node');
    }
  }
}

module.exports = new MazacoinRPC();
