#!/usr/bin/env node
const Database = require('better-sqlite3');
const path = require('path');
// Node.js v20 has native fetch

const dbPath = path.join(__dirname, '../data/price-history.db');
const db = new Database(dbPath);

// Ensure table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL UNIQUE,
    price_btc REAL NOT NULL,
    price_ltc REAL,
    price_eth REAL,
    volume_24h REAL,
    high_24h REAL,
    low_24h REAL,
    source TEXT DEFAULT 'freiexchange',
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );
  CREATE INDEX IF NOT EXISTS idx_timestamp ON price_history(timestamp);
`);

async function collectPriceData() {
  try {
    console.log('[' + new Date().toISOString() + '] Fetching MAZA prices...');
    
    // Fetch from FreiExchange
    const freiResp = await fetch('https://api.freiexchange.com/public/ticker/MAZA');
    const freiData = await freiResp.json();
    
    // Fetch crypto ratios from CoinGecko
    const geckoResp = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=litecoin,ethereum&vs_currencies=btc',
      { headers: { 'User-Agent': 'Mazacoin Explorer/1.0 (https://maza.samiahmed7777.me)' } }
    );
    const geckoData = await geckoResp.json();
    
    // Extract MAZA/BTC price from FreiExchange response
    const mazaData = freiData.MAZA_BTC?.[0] || freiData.MAZA?.[0] || {};
    const mazaBTC = parseFloat(mazaData.last || 0);
    const volume24h = parseFloat(mazaData.volume24h_btc || 0);
    const high24h = parseFloat(mazaData.high || 0);
    const low24h = parseFloat(mazaData.low || 0);
    
    // Calculate MAZA/LTC and MAZA/ETH
    const ltcBTC = geckoData.litecoin?.btc || 0;
    const ethBTC = geckoData.ethereum?.btc || 0;
    
    const mazaLTC = ltcBTC > 0 ? mazaBTC / ltcBTC : null;
    const mazaETH = ethBTC > 0 ? mazaBTC / ethBTC : null;
    
    // Insert into database
    const timestamp = Math.floor(Date.now() / 1000);
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO price_history 
      (timestamp, price_btc, price_ltc, price_eth, volume_24h, high_24h, low_24h) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(timestamp, mazaBTC, mazaLTC, mazaETH, volume24h, high24h, low24h);
    
    console.log('✅ Price saved:', {
      timestamp: new Date(timestamp * 1000).toISOString(),
      mazaBTC,
      mazaLTC,
      mazaETH,
      volume24h
    });
    
    return { success: true, timestamp, mazaBTC, mazaLTC, mazaETH };
    
  } catch (error) {
    console.error('❌ Error collecting price:', error.message);
    return { success: false, error: error.message };
  } finally {
    db.close();
  }
}

// Run if called directly
if (require.main === module) {
  collectPriceData().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = collectPriceData;
