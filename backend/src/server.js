const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const winston = require('winston');
require('dotenv').config();

const rpc = require('./rpc/MazacoinRPC');
const priceHistory = require('./db/priceHistory');
const nodeHistory = require('./nodeHistory');
const richList = require('./richList');

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get latest block height
app.get('/api/blockcount', async (req, res) => {
  try {
    const count = await rpc.getBlockCount();
    res.json({ height: count });
  } catch (error) {
    logger.error('Error getting block count:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get block by hash or height
app.get('/api/block/:hashOrHeight', async (req, res) => {
  try {
    const { hashOrHeight } = req.params;
    const block = await rpc.getBlock(hashOrHeight);
    res.json(block);
  } catch (error) {
    logger.error(`Error getting block ${req.params.hashOrHeight}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get transaction by txid (with input amounts)
app.get('/api/tx/:txid', async (req, res) => {
  try {
    const { txid } = req.params;
    const tx = await rpc.getTransaction(txid);
    
    // Enrich vin with amounts from previous transactions
    if (tx.vin && Array.isArray(tx.vin)) {
      const vinWithAmounts = await Promise.all(
        tx.vin.map(async (input) => {
          // Skip coinbase transactions (no previous tx)
          if (input.coinbase) {
            return { ...input, value: 0, isCoinbase: true };
          }
          
          try {
            // Fetch the previous transaction
            const prevTx = await rpc.getTransaction(input.txid);
            // Get the output being spent (vout index)
            const prevOut = prevTx.vout[input.vout];
            
            return {
              ...input,
              value: prevOut?.value || 0,
              address: prevOut?.scriptPubKey?.addresses?.[0] || 'Unknown'
            };
          } catch (error) {
            logger.warn(`Could not fetch input amount for ${input.txid}:`, error.message);
            return { ...input, value: null, error: 'txindex may not be enabled' };
          }
        })
      );
      
      tx.vin = vinWithAmounts;
      
      // Calculate total input value
      tx.totalInput = vinWithAmounts
        .filter(v => !v.isCoinbase && v.value !== null)
        .reduce((sum, v) => sum + v.value, 0);
    }
    
    // Calculate total output value
    if (tx.vout && Array.isArray(tx.vout)) {
      tx.totalOutput = tx.vout.reduce((sum, v) => sum + (v.value || 0), 0);
    }
    
    // Calculate fees (input - output)
    if (tx.totalInput !== undefined && tx.totalOutput !== undefined) {
      tx.fees = tx.totalInput - tx.totalOutput;
    }
    
    res.json(tx);
  } catch (error) {
    logger.error(`Error getting transaction ${req.params.txid}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get network stats
app.get('/api/stats', async (req, res) => {
  try {
    const [blockCount, difficulty, networkInfo, miningInfo, peerCount] = await Promise.all([
      rpc.getBlockCount(),
      rpc.getDifficulty(),
      rpc.getNetworkInfo(),
      rpc.getMiningInfo(),
      rpc.getConnectionCount()
    ]);

    res.json({
      blockHeight: blockCount,
      difficulty: difficulty,
      connections: peerCount,
      networkHashrate: miningInfo.networkhashps || 0,
      version: networkInfo.version,
      protocolVersion: networkInfo.protocolversion,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get peer info (for node map)
app.get('/api/peers', async (req, res) => {
  try {
    const peers = await rpc.getPeerInfo();
    res.json(peers);
  } catch (error) {
    logger.error('Error getting peers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get peers with geolocation data (24-hour history)
app.get('/api/nodes', async (req, res) => {
  try {
    // Get current connected peers
    const peers = await rpc.getPeerInfo();
    
    // Helper to extract IP from addr (handles both IPv4 and IPv6)
    const extractIP = (addr) => {
      if (!addr) return null;
      
      // IPv6 format: [2001:db8::1]:8333
      const ipv6Match = addr.match(/^\[([^\]]+)\]/);
      if (ipv6Match) return ipv6Match[1];
      
      // IPv4 format: 192.168.1.1:8333
      return addr.split(':')[0];
    };
    
    // Helper to check if IP is private/local
    const isPrivateIP = (ip) => {
      if (!ip) return true;
      
      // IPv4 private ranges
      if (ip.startsWith('127.') || 
          ip.startsWith('192.168.') || 
          ip.startsWith('10.') ||
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) {
        return true;
      }
      
      // IPv6 private/local ranges
      const lower = ip.toLowerCase();
      if (lower.startsWith('::1') ||          // localhost
          lower.startsWith('fe80:') ||        // link-local
          lower.startsWith('fc00:') ||        // unique local
          lower.startsWith('fd00:')) {        // unique local
        return true;
      }
      
      return false;
    };
    
    // Extract unique public IPs from currently connected peers
    const currentIPs = new Set(
      peers
        .map(p => extractIP(p.addr))
        .filter(ip => ip && !isPrivateIP(ip))
    );
    
    // Cleanup old nodes (older than 24 hours)
    await nodeHistory.cleanup();
    
    // Get nodes from history (last 24 hours)
    const historicalNodes = await nodeHistory.getRecentNodes();
    
    // Find new IPs that need geolocation
    const knownIPs = new Set(historicalNodes.map(n => n.ip));
    const newIPs = Array.from(currentIPs).filter(ip => !knownIPs.has(ip));
    
    // Geolocate new IPs
    if (newIPs.length > 0) {
      const axios = require('axios');
      const batchResponse = await axios.post(
        'http://ip-api.com/batch?fields=status,country,countryCode,city,lat,lon,query',
        newIPs.slice(0, 100).map(ip => ({ query: ip })), // Limit to 100 IPs per batch
        { 
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      const geoResults = batchResponse.data;
      
      for (const geo of geoResults) {
        if (geo.status === 'success' && geo.lat && geo.lon) {
          const isIPv6 = geo.query.includes(':');
          
          await nodeHistory.updateNode(geo.query, {
            lat: geo.lat,
            lon: geo.lon,
            city: geo.city,
            country: geo.country,
            countryCode: geo.countryCode,
            ipVersion: isIPv6 ? 6 : 4
          }, true);
        }
      }
    }
    
    // Update lastSeen for currently connected nodes
    for (const ip of currentIPs) {
      const existing = historicalNodes.find(n => n.ip === ip);
      if (existing) {
        await nodeHistory.updateNode(ip, {
          lat: existing.lat,
          lon: existing.lon,
          city: existing.city,
          country: existing.country,
          countryCode: existing.countryCode,
          ipVersion: existing.ipVersion
        }, true);
      }
    }
    
    // Mark nodes not currently connected as inactive
    for (const node of historicalNodes) {
      if (!currentIPs.has(node.ip)) {
        await nodeHistory.updateNode(node.ip, {
          lat: node.lat,
          lon: node.lon,
          city: node.city,
          country: node.country,
          countryCode: node.countryCode,
          ipVersion: node.ipVersion
        }, false);
      }
    }
    
    // Save updated history
    await nodeHistory.save();
    
    // Get stats (all nodes from last 24 hours)
    const stats = await nodeHistory.getStats();
    
    res.json({
      total: stats.total,
      active: stats.active,
      geolocated: stats.nodes.filter(n => n.lat && n.lon).length,
      nodes: stats.nodes,
      countries: stats.countries
    });
  } catch (error) {
    logger.error('Error getting nodes with geolocation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get rich list (top addresses by balance)
app.get('/api/richlist/:limit?', async (req, res) => {
  try {
    const limit = parseInt(req.params.limit) || 100;
    const data = richList.getTopAddresses(Math.min(limit, 1000)); // Max 1000
    res.json(data);
  } catch (error) {
    logger.error('Error getting rich list:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get address balance from rich list
app.get('/api/address/:address/balance', async (req, res) => {
  try {
    const { address } = req.params;
    const data = richList.getTopAddresses(1000); // Get top 1000
    const addressData = data.addresses.find(a => a.address === address);
    
    if (addressData) {
      res.json({
        address,
        balance: addressData.balance,
        rank: addressData.rank,
        lastSeen: addressData.lastSeen,
        source: 'richlist'
      });
    } else {
      res.json({
        address,
        balance: null,
        message: 'Address not found in rich list. It may have low balance or scanner hasn\'t reached this address yet.',
        lastScannedBlock: data.lastScannedBlock,
        source: 'richlist'
      });
    }
  } catch (error) {
    logger.error('Error getting address balance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get latest blocks
app.get('/api/blocks/latest/:count?', async (req, res) => {
  try {
    const count = Math.min(parseInt(req.params.count) || 10, 50);
    const currentHeight = await rpc.getBlockCount();
    
    // Fetch blocks in batches of 5 (balance between speed and SSH connection limits)
    const heights = Array.from({ length: count }, (_, i) => currentHeight - i).filter(h => h >= 0);
    const blocks = [];
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < heights.length; i += BATCH_SIZE) {
      const batch = heights.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (height) => {
          try {
            const block = await rpc.getBlock(height);
            return {
              height: block.height,
              hash: block.hash,
              time: block.time,
              size: block.size,
              txCount: block.tx ? block.tx.length : 0,
              totalAmount: 0  // Skipped - would require additional SSH calls per tx
            };
          } catch (error) {
            logger.warn(`Skipping block ${height}:`, error.message);
            return null;
          }
        })
      );
      blocks.push(...batchResults.filter(b => b !== null));
    }
    
    res.json(blocks);
  } catch (error) {
    logger.error('Error getting latest blocks:', error);
    res.status(500).json({ error: error.message });
  }
});


// Get MAZA price in BTC, LTC, ETH (cached 60s)
let priceCache = { data: null, ts: 0 };
app.get("/api/price", async (req, res) => {
  try {
    if (Date.now() - priceCache.ts < 60000 && priceCache.data) {
      return res.json(priceCache.data);
    }
    
    const https = require("https");
    const fetch = (url) => new Promise((resolve, reject) => {
      const options = {
        headers: {
          'User-Agent': 'Mazacoin Explorer/1.0 (https://maza.samiahmed7777.me)'
        }
      };
      https.get(url, options, (r) => {
        let d = "";
        r.on("data", c => d += c);
        r.on("end", () => resolve(JSON.parse(d)));
      }).on("error", reject);
    });
    
    // Get MAZA/BTC from FreiExchange
    const ticker = await fetch("https://api.freiexchange.com/public/ticker/MAZA");
    const mazaBtc = ticker.MAZA_BTC ? ticker.MAZA_BTC[0] : null;
    const mazaBtcPrice = mazaBtc ? parseFloat(mazaBtc.last) : 0;
    
    // Get BTC/LTC and BTC/ETH ratios from CoinGecko
    const cryptoRatios = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=litecoin,ethereum&vs_currencies=btc");
    const ltcBtcRatio = cryptoRatios.litecoin ? cryptoRatios.litecoin.btc : 0;
    const ethBtcRatio = cryptoRatios.ethereum ? cryptoRatios.ethereum.btc : 0;
    
    // Calculate MAZA/LTC and MAZA/ETH
    const mazaLtcPrice = ltcBtcRatio > 0 ? mazaBtcPrice / ltcBtcRatio : 0;
    const mazaEthPrice = ethBtcRatio > 0 ? mazaBtcPrice / ethBtcRatio : 0;
    
    const result = {
      btc: mazaBtcPrice,
      ltc: mazaLtcPrice,
      eth: mazaEthPrice,
      volume24h: mazaBtc ? parseFloat(mazaBtc.volume24h) : 0,
      volume24hBtc: mazaBtc ? parseFloat(mazaBtc.volume24h_btc) : 0,
      change24h: mazaBtc ? parseFloat(mazaBtc.percent_change_24h) : 0,
      high24h: mazaBtc ? parseFloat(mazaBtc.high) : 0,
      low24h: mazaBtc ? parseFloat(mazaBtc.low) : 0,
      exchange: "FreiExchange + CoinGecko",
      timestamp: new Date().toISOString()
    };
    
    // Log price to database (async, don't wait)
    priceHistory.logPrice(
      mazaBtcPrice,
      mazaLtcPrice,
      mazaEthPrice,
      result.volume24h,
      result.change24h,
      'live'
    ).catch(err => logger.error('Error logging price to DB:', err));
    
    priceCache = { data: result, ts: Date.now() };
    res.json(result);
  } catch (error) {
    logger.error("Error fetching price:", error);
    if (priceCache.data) return res.json(priceCache.data);
    res.status(500).json({ error: error.message });
  }
});

// Get price history for charts
app.get('/api/price/history/:timeframe?', async (req, res) => {
  try {
    const timeframe = req.params.timeframe || '24h';
    const history = await priceHistory.getHistory(timeframe);
    
    res.json({
      timeframe,
      data: history.map(row => ({
        timestamp: row.timestamp,
        time: new Date(row.timestamp * 1000).toISOString(),
        btc: row.price_btc,
        ltc: row.price_ltc,
        eth: row.price_eth,
        volume: row.volume_24h,
        change: row.change_24h,
        source: row.source
      })),
      count: history.length
    });
  } catch (error) {
    logger.error('Error getting price history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search endpoint
app.get('/api/search/:query', async (req, res) => {
  const { query } = req.params;
  
  try {
    // Try as block height
    if (/^\d+$/.test(query)) {
      const height = parseInt(query);
      const currentHeight = await rpc.getBlockCount();
      
      if (height <= currentHeight) {
        const block = await rpc.getBlock(height);
        return res.json({ type: 'block', data: block });
      }
    }
    
    // Try as block hash (64 hex chars)
    if (/^[0-9a-f]{64}$/i.test(query)) {
      try {
        const block = await rpc.getBlock(query);
        return res.json({ type: 'block', data: block });
      } catch {}
      
      // Maybe it's a transaction
      try {
        const tx = await rpc.getTransaction(query);
        return res.json({ type: 'transaction', data: tx });
      } catch {}
    }
    
    // Try as Mazacoin address (starts with M)
    if (query.startsWith('M')) {
      // For now, return address placeholder
      // Full implementation requires txindex
      return res.json({
        type: 'address',
        data: {
          address: query,
          note: 'Address lookup requires full node with txindex enabled'
        }
      });
    }
    
    res.status(404).json({ error: 'Not found' });
  } catch (error) {
    logger.error(`Search error for ${query}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket for real-time updates
io.on('connection', (socket) => {
  logger.info('Client connected to WebSocket');
  
  socket.on('subscribe:blocks', async () => {
    logger.info('Client subscribed to blocks');
    // Send current block height
    try {
      const height = await rpc.getBlockCount();
      socket.emit('block:height', { height });
    } catch (error) {
      logger.error('Error sending initial block height:', error);
    }
  });
  
  socket.on('disconnect', () => {
    logger.info('Client disconnected');
  });
});

// Poll for new blocks and emit to clients
let lastBlockHeight = 0;
setInterval(async () => {
  try {
    const currentHeight = await rpc.getBlockCount();
    
    if (currentHeight > lastBlockHeight) {
      logger.info(`New block detected: ${currentHeight}`);
      const block = await rpc.getBlock(currentHeight);
      
      io.emit('block:new', {
        height: currentHeight,
        hash: block.hash,
        time: block.time,
        txCount: block.tx ? block.tx.length : 0
      });
      
      lastBlockHeight = currentHeight;
    }
  } catch (error) {
    logger.error('Error polling for blocks:', error);
  }
}, 15000); // Poll every 15 seconds

// Background node discovery - poll peers every 5 minutes to build 24h history
setInterval(async () => {
  try {
    const axios = require('axios');
    const peers = await rpc.getPeerInfo();
    
    const extractIP = (addr) => {
      if (!addr) return null;
      const ipv6Match = addr.match(/^\[([^\]]+)\]/);
      if (ipv6Match) return ipv6Match[1];
      return addr.split(':')[0];
    };
    
    const isPrivateIP = (ip) => {
      if (!ip) return true;
      if (ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.') ||
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
      const lower = ip.toLowerCase();
      if (lower.startsWith('::1') || lower.startsWith('fe80:') || 
          lower.startsWith('fc00:') || lower.startsWith('fd00:')) return true;
      return false;
    };
    
    const currentIPs = new Set(
      peers.map(p => extractIP(p.addr)).filter(ip => ip && !isPrivateIP(ip))
    );
    
    // Check for new IPs not in history
    const recentNodes = await nodeHistory.getRecentNodes();
    const knownIPs = new Set(recentNodes.map(n => n.ip));
    const newIPs = Array.from(currentIPs).filter(ip => !knownIPs.has(ip));
    
    if (newIPs.length > 0) {
      const batchResponse = await axios.post(
        'http://ip-api.com/batch?fields=status,country,countryCode,city,lat,lon,query',
        newIPs.slice(0, 100).map(ip => ({ query: ip })),
        { timeout: 10000, headers: { 'Content-Type': 'application/json' } }
      );
      
      for (const geo of batchResponse.data) {
        if (geo.status === 'success' && geo.lat && geo.lon) {
          await nodeHistory.updateNode(geo.query, {
            lat: geo.lat, lon: geo.lon, city: geo.city,
            country: geo.country, countryCode: geo.countryCode,
            ipVersion: geo.query.includes(':') ? 6 : 4
          }, true);
        }
      }
    }
    
    // Update lastSeen for known active nodes
    for (const ip of currentIPs) {
      const existing = recentNodes.find(n => n.ip === ip);
      if (existing) {
        await nodeHistory.updateNode(ip, {
          lat: existing.lat, lon: existing.lon, city: existing.city,
          country: existing.country, countryCode: existing.countryCode,
          ipVersion: existing.ipVersion
        }, true);
      }
    }
    
    // Mark disconnected nodes as inactive
    for (const node of recentNodes) {
      if (!currentIPs.has(node.ip)) {
        await nodeHistory.updateNode(node.ip, {
          lat: node.lat, lon: node.lon, city: node.city,
          country: node.country, countryCode: node.countryCode,
          ipVersion: node.ipVersion
        }, false);
      }
    }
    
    await nodeHistory.cleanup();
    await nodeHistory.save();
    
    const stats = await nodeHistory.getStats();
    logger.info(`Node discovery: ${stats.total} total (${stats.active} active) across ${Object.keys(stats.countries).length} countries`);
  } catch (error) {
    logger.error('Error in background node discovery:', error.message);
  }
}, 1 * 60 * 1000); // Every 1 minute

// Initialize
async function init() {
  // Start server immediately
  server.listen(PORT, () => {
    logger.info(`Mazacoin Explorer API running on port ${PORT}`);
  });
  
  try {
    // Test RPC connection
    const height = await rpc.getBlockCount();
    logger.info(`Connected to Mazacoin node at block height: ${height}`);
    lastBlockHeight = height;
    
    // Initialize rich list scanner (in background, don't block)
    richList.initialize().catch(err => {
      logger.error('Rich list initialization error:', err);
    });
  } catch (error) {
    logger.error('Failed to connect to Mazacoin node:', error);
    logger.info('Server will start but RPC calls will fail until node is running');
  }
}

init();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    rpc.disconnect();
    process.exit(0);
  });
});
