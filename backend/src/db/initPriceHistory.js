const Database = require('better-sqlite3');
const path = require('path');

// Create/connect to database
const dbPath = path.join(__dirname, '../../data/price-history.db');
const db = new Database(dbPath);

// Create price_history table
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
  CREATE INDEX IF NOT EXISTS idx_created_at ON price_history(created_at);
`);

console.log('✅ Price history database initialized');
console.log('📍 Database location:', dbPath);

// Test insert
const now = Math.floor(Date.now() / 1000);
const stmt = db.prepare(`
  INSERT OR IGNORE INTO price_history 
  (timestamp, price_btc, price_ltc, price_eth, volume_24h) 
  VALUES (?, ?, ?, ?, ?)
`);

const testResult = stmt.run(now, 0.00000004, 0.0000025, 0.0000001, 100);
console.log('🧪 Test insert:', testResult.changes > 0 ? 'SUCCESS' : 'SKIPPED (duplicate)');

// Show latest entry
const latest = db.prepare('SELECT * FROM price_history ORDER BY timestamp DESC LIMIT 1').get();
console.log('📊 Latest entry:', latest);

db.close();
