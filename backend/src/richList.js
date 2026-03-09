const fs = require('fs').promises;
const path = require('path');
const rpc = require('./rpc/MazacoinRPC');

const DATA_FILE = path.join(__dirname, '../data/rich-list.json');
const STATE_FILE = path.join(__dirname, '../data/rich-list-state.json');

// In-memory cache
let richList = [];
let balanceMap = new Map(); // Full balance map for all addresses during scanning
let txCache = new Map(); // Cache for transaction lookups (LRU, max 10000 entries)
let lastScannedBlock = 0;
let isScanning = false;

// Simple LRU cache management
const MAX_TX_CACHE_SIZE = 10000;
function addToTxCache(txid, tx) {
  if (txCache.size >= MAX_TX_CACHE_SIZE) {
    // Remove oldest entry (first key)
    const firstKey = txCache.keys().next().value;
    txCache.delete(firstKey);
  }
  txCache.set(txid, tx);
}

function getCachedTx(txid) {
  return txCache.get(txid);
}

// Load data from disk
async function loadData() {
  try {
    // Ensure data directory exists
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    
    // Load rich list
    try {
      const data = await fs.readFile(DATA_FILE, 'utf8');
      richList = JSON.parse(data);
      // Populate balance map from loaded data
      balanceMap.clear();
      richList.forEach(item => {
        balanceMap.set(item.address, { balance: item.balance, lastSeen: item.lastSeen });
      });
    } catch (err) {
      richList = [];
      balanceMap.clear();
    }
    
    // Load state
    try {
      const state = await fs.readFile(STATE_FILE, 'utf8');
      const parsed = JSON.parse(state);
      lastScannedBlock = parsed.lastScannedBlock || 0;
    } catch (err) {
      // Start from genesis block (full blockchain scan)
      lastScannedBlock = 0;
      console.log(`[Rich List] Starting fresh from genesis block 0`);
    }
    
    console.log(`[Rich List] Loaded ${richList.length} addresses, last scanned block: ${lastScannedBlock}`);
  } catch (error) {
    console.error('[Rich List] Error loading data:', error);
  }
}

// Save data to disk
async function saveData() {
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    
    // Save rich list (top 1000 to limit file size)
    await fs.writeFile(DATA_FILE, JSON.stringify(richList.slice(0, 1000), null, 2));
    
    // Save state (including cache stats)
    await fs.writeFile(STATE_FILE, JSON.stringify({ 
      lastScannedBlock,
      lastUpdate: new Date().toISOString(),
      totalAddresses: balanceMap.size,
      txCacheSize: txCache.size
    }, null, 2));
    
    // Clear transaction cache if it's getting too large (keep most recent)
    if (txCache.size > MAX_TX_CACHE_SIZE * 0.9) {
      const entriesToKeep = Array.from(txCache.entries()).slice(-Math.floor(MAX_TX_CACHE_SIZE * 0.5));
      txCache.clear();
      entriesToKeep.forEach(([key, value]) => txCache.set(key, value));
    }
  } catch (error) {
    console.error('[Rich List] Error saving data:', error);
  }
}

// Update balances from a block
async function processBlock(blockHeight) {
  try {
    const blockHash = await rpc.getBlockHash(blockHeight);
    const block = await rpc.getBlock(blockHash);
    
    if (!block || !block.tx) {
      return;
    }
    
    // Build a map of address => balance change for this block
    const balanceChanges = new Map();
    
    // Process all transactions in the block
    for (const txid of block.tx) {
      const tx = await rpc.getTransaction(txid);
      
      if (!tx) continue;
      
      // Cache current transaction for future lookups
      addToTxCache(txid, tx);
      
      // Process inputs (debits) - subtract spent amounts
      // Skip coinbase transactions (no inputs)
      if (tx.vin && tx.vin.length > 0 && !tx.vin[0].coinbase) {
        for (const vin of tx.vin) {
          try {
            // Look up the previous transaction (check cache first)
            let prevTx = getCachedTx(vin.txid);
            if (!prevTx) {
              prevTx = await rpc.getTransaction(vin.txid);
              if (prevTx) {
                addToTxCache(vin.txid, prevTx);
              }
            }
            
            if (prevTx && prevTx.vout && prevTx.vout[vin.vout]) {
              const spentOutput = prevTx.vout[vin.vout];
              if (spentOutput.scriptPubKey && spentOutput.scriptPubKey.addresses && spentOutput.scriptPubKey.addresses.length > 0) {
                const address = spentOutput.scriptPubKey.addresses[0];
                const current = balanceChanges.get(address) || 0;
                balanceChanges.set(address, current - spentOutput.value);
              }
            }
          } catch (err) {
            // Skip if we can't look up the previous transaction
            // This might happen for very old transactions or edge cases
          }
        }
      }
      
      // Add outputs (credits to addresses)
      if (tx.vout) {
        for (const vout of tx.vout) {
          if (vout.scriptPubKey && vout.scriptPubKey.addresses && vout.scriptPubKey.addresses.length > 0) {
            const address = vout.scriptPubKey.addresses[0];
            const current = balanceChanges.get(address) || 0;
            balanceChanges.set(address, current + vout.value);
          }
        }
      }
    }
    
    // Update balance map with changes
    balanceChanges.forEach((change, address) => {
      const existing = balanceMap.get(address);
      if (existing) {
        existing.balance += change;
        existing.lastSeen = blockHeight;
      } else {
        balanceMap.set(address, {
          balance: change,
          lastSeen: blockHeight
        });
      }
    });
    
    // Remove addresses with zero or negative balances (dust cleanup)
    for (const [address, data] of balanceMap.entries()) {
      if (data.balance <= 0.00000001) {
        balanceMap.delete(address);
      }
    }
    
    // Update richList from balanceMap (top 1000)
    richList = Array.from(balanceMap.entries())
      .map(([address, data]) => ({
        address,
        balance: data.balance,
        lastSeen: data.lastSeen
      }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 1000);
    
    lastScannedBlock = blockHeight;
  } catch (error) {
    console.error(`[Rich List] Error processing block ${blockHeight}:`, error.message);
  }
}

// Scan blocks incrementally
async function scanBlocks(maxBlocks = 10000) {
  if (isScanning) {
    return;
  }
  
  isScanning = true;
  const scanStartTime = Date.now();
  
  try {
    const currentHeight = await rpc.getBlockCount();
    const startBlock = lastScannedBlock + 1;
    const endBlock = Math.min(startBlock + maxBlocks - 1, currentHeight);
    
    if (startBlock > currentHeight) {
      console.log('[Rich List] Already up to date');
      isScanning = false;
      return;
    }
    
    const totalBlocks = endBlock - startBlock + 1;
    const blocksRemaining = currentHeight - startBlock + 1;
    console.log(`[Rich List] Scanning blocks ${startBlock} to ${endBlock}... (${blocksRemaining.toLocaleString()} blocks behind)`);
    
    let lastProgressTime = Date.now();
    let blocksProcessed = 0;
    
    for (let height = startBlock; height <= endBlock; height++) {
      await processBlock(height);
      blocksProcessed++;
      
      // Save progress every 50 blocks
      if (height % 50 === 0) {
        await saveData();
        const elapsed = (Date.now() - scanStartTime) / 1000;
        const blocksPerSec = blocksProcessed / elapsed;
        const remainingBlocks = currentHeight - height;
        const etaSeconds = remainingBlocks / blocksPerSec;
        const etaDays = (etaSeconds / 86400).toFixed(1);
        const cacheHitRate = txCache.size > 0 ? ((txCache.size / blocksProcessed) * 100).toFixed(1) : '0';
        
        console.log(`[Rich List] Progress: ${height.toLocaleString()}/${currentHeight.toLocaleString()} | ${balanceMap.size} addresses | Top: ${richList[0]?.balance.toFixed(2) || 0} MAZA | Speed: ${blocksPerSec.toFixed(2)} blocks/sec | ETA: ${etaDays} days | TX cache: ${txCache.size}`);
      }
    }
    
    await saveData();
    const elapsed = (Date.now() - scanStartTime) / 1000;
    console.log(`[Rich List] Scan complete: ${richList.length} addresses tracked in ${elapsed.toFixed(1)}s`);
  } catch (error) {
    console.error('[Rich List] Error during scan:', error);
  } finally {
    isScanning = false;
  }
}

// Get top N addresses
function getTopAddresses(limit = 100) {
  return {
    addresses: richList.slice(0, limit).map((item, index) => ({
      rank: index + 1,
      address: item.address,
      balance: item.balance,
      lastSeen: item.lastSeen
    })),
    lastScannedBlock,
    totalAddresses: richList.length,
    isScanning
  };
}

// Background updater
let updateInterval;

function startBackgroundUpdater(intervalMinutes = 5) {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  
  updateInterval = setInterval(async () => {
    console.log('[Rich List] Starting background scan...');
    await scanBlocks(50000);
  }, intervalMinutes * 60 * 1000);
  
  console.log(`[Rich List] Background updater started (every ${intervalMinutes} min, 50000 blocks per scan)`);
}

function stopBackgroundUpdater() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

// Initialize
async function initialize() {
  await loadData();
  
  // Do an initial scan if we're behind
  const currentHeight = await rpc.getBlockCount();
  if (currentHeight - lastScannedBlock > 100) {
    console.log(`[Rich List] Behind by ${(currentHeight - lastScannedBlock).toLocaleString()} blocks, starting catch-up scan...`);
    // Scan in large chunks - will continue in background
    scanBlocks(50000); // Non-blocking - continues in background
  }
  
  // Start background updater
  startBackgroundUpdater(5);
}

module.exports = {
  initialize,
  getTopAddresses,
  scanBlocks,
  startBackgroundUpdater,
  stopBackgroundUpdater
};
