const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/price_history.db');
const INIT_SQL = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to price history database');
    // Run init SQL
    db.exec(INIT_SQL, (err) => {
      if (err) {
        console.error('Error initializing database:', err);
      } else {
        console.log('Price history database initialized');
      }
    });
  }
});

/**
 * Log a price entry
 */
function logPrice(priceBtc, priceLtc, priceEth, volume24h, change24h, source = 'live') {
  const timestamp = Math.floor(Date.now() / 1000);
  
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO price_history (timestamp, price_btc, price_ltc, price_eth, volume_24h, change_24h, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [timestamp, priceBtc, priceLtc, priceEth, volume24h, change24h, source],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, timestamp });
      }
    );
  });
}

/**
 * Get price history for a timeframe
 * @param {string} timeframe - '1h', '24h', '7d', '30d', '1y', 'all'
 */
function getHistory(timeframe = '24h') {
  const now = Math.floor(Date.now() / 1000);
  let since = 0;
  
  switch(timeframe) {
    case '1h':
      since = now - (60 * 60);
      break;
    case '24h':
      since = now - (24 * 60 * 60);
      break;
    case '7d':
      since = now - (7 * 24 * 60 * 60);
      break;
    case '30d':
      since = now - (30 * 24 * 60 * 60);
      break;
    case '1y':
      since = now - (365 * 24 * 60 * 60);
      break;
    case 'all':
      since = 0;
      break;
    default:
      since = now - (24 * 60 * 60);
  }
  
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT timestamp, price_btc, price_ltc, price_eth, volume_24h, change_24h, source
       FROM price_history
       WHERE timestamp >= ?
       ORDER BY timestamp ASC`,
      [since],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

/**
 * Get latest price entry
 */
function getLatest() {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM price_history ORDER BY timestamp DESC LIMIT 1`,
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

module.exports = {
  db,
  logPrice,
  getHistory,
  getLatest
};
