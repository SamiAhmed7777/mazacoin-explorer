# Mazacoin Explorer API Documentation

Complete API reference for the Mazacoin blockchain explorer backend.

**Base URL:** `https://maza.example.com/api`  
**Protocol:** REST + WebSocket  
**Format:** JSON  
**Authentication:** None (public read-only API)

---

## Table of Contents

1. [Health & Status](#health--status)
2. [Blockchain Data](#blockchain-data)
3. [Network Information](#network-information)
4. [Search](#search)
5. [Rich List](#rich-list)
6. [WebSocket Events](#websocket-events)
7. [Error Responses](#error-responses)
8. [Rate Limiting](#rate-limiting)

---

## Health & Status

### GET /api/health

Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "ok",
  "blockHeight": 4128056,
  "timestamp": "2026-03-09T05:49:12.000Z"
}
```

**Status Codes:**
- `200 OK` - Service is healthy
- `503 Service Unavailable` - Service is degraded or unavailable

---

## Blockchain Data

### GET /api/blockcount

Get the current blockchain height.

**Response:**
```json
{
  "height": 4128056
}
```

**Example:**
```bash
curl https://maza.example.com/api/blockcount
```

---

### GET /api/block/:hashOrHeight

Get detailed information about a specific block.

**Parameters:**
- `hashOrHeight` (string|number) - Block hash or block height

**Response:**
```json
{
  "hash": "0000000000000a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5",
  "confirmations": 125,
  "height": 4128000,
  "version": 536870912,
  "versionHex": "20000000",
  "merkleroot": "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
  "time": 1709964512,
  "mediantime": 1709963200,
  "nonce": 123456789,
  "bits": "1a0fffff",
  "difficulty": 1.234567,
  "chainwork": "000000000000000000000000000000000000000000000001234567890abcdef",
  "nTx": 3,
  "previousblockhash": "0000000000000b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b",
  "nextblockhash": "0000000000000c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c",
  "tx": [
    "tx1_hash",
    "tx2_hash",
    "tx3_hash"
  ]
}
```

**Example:**
```bash
# By height
curl https://maza.example.com/api/block/4128000

# By hash
curl https://maza.example.com/api/block/0000000000000a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5
```

---

### GET /api/blocks/latest/:count?

Get the latest N blocks with summary information.

**Parameters:**
- `count` (optional, number) - Number of blocks to return (default: 10, max: 100)

**Response:**
```json
{
  "blocks": [
    {
      "height": 4128056,
      "hash": "0000000000000...",
      "time": 1709964512,
      "txCount": 3,
      "totalAmount": 152.5,
      "size": 1234,
      "difficulty": 1.234567
    },
    {
      "height": 4128055,
      "hash": "0000000000001...",
      "time": 1709964312,
      "txCount": 5,
      "totalAmount": 328.75,
      "size": 2345,
      "difficulty": 1.234567
    }
  ],
  "count": 2
}
```

**Notes:**
- `totalAmount` excludes coinbase (mining reward) transactions
- Blocks are ordered newest first

**Example:**
```bash
curl https://maza.example.com/api/blocks/latest/20
```

---

### GET /api/tx/:txid

Get detailed information about a transaction.

**Parameters:**
- `txid` (string) - Transaction ID (hash)

**Response:**
```json
{
  "txid": "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
  "hash": "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
  "version": 1,
  "size": 225,
  "vsize": 225,
  "locktime": 0,
  "vin": [
    {
      "txid": "prev_tx_hash",
      "vout": 0,
      "scriptSig": {
        "asm": "...",
        "hex": "..."
      },
      "sequence": 4294967295
    }
  ],
  "vout": [
    {
      "value": 50.123456,
      "n": 0,
      "scriptPubKey": {
        "asm": "OP_DUP OP_HASH160 ... OP_EQUALVERIFY OP_CHECKSIG",
        "hex": "76a914...",
        "type": "pubkeyhash",
        "addresses": [
          "MAddress1234567890abcdefghijk"
        ]
      }
    },
    {
      "value": 10.654321,
      "n": 1,
      "scriptPubKey": {
        "asm": "...",
        "hex": "...",
        "type": "pubkeyhash",
        "addresses": [
          "MAddress0987654321zyxwvutsr"
        ]
      }
    }
  ],
  "hex": "...",
  "blockhash": "0000000000000...",
  "confirmations": 125,
  "time": 1709964512,
  "blocktime": 1709964512
}
```

**Example:**
```bash
curl https://maza.example.com/api/tx/1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2
```

---

### GET /api/address/:address/balance

Get balance for a specific address (from rich list cache).

**Parameters:**
- `address` (string) - Mazacoin address

**Response:**
```json
{
  "address": "MCU8e7DdJ8D2on5fBQfb4jTn2qX4DGiikw",
  "balance": 128183.78143,
  "rank": 1,
  "lastSeen": 4078045,
  "percentOfSupply": 0.0512
}
```

**Notes:**
- Only works for addresses in the top 1000 (rich list)
- Balance is approximate (tracks outputs only, not spent inputs)
- Returns 404 if address not in rich list

**Example:**
```bash
curl https://maza.example.com/api/address/MCU8e7DdJ8D2on5fBQfb4jTn2qX4DGiikw/balance
```

---

## Network Information

### GET /api/stats

Get current network statistics.

**Response:**
```json
{
  "height": 4128056,
  "difficulty": 1.234567,
  "networkhashps": 12345678901234,
  "connections": 8,
  "version": 1000000,
  "subversion": "/Satoshi:0.10.0/",
  "protocolversion": 70002,
  "timeoffset": 0,
  "warnings": ""
}
```

**Example:**
```bash
curl https://maza.example.com/api/stats
```

---

### GET /api/peers

Get list of connected peer nodes (for node map).

**Response:**
```json
{
  "peers": [
    {
      "addr": "123.45.67.89:12835",
      "version": 70002,
      "subver": "/Satoshi:0.10.0/",
      "conntime": 1709960000,
      "synced_blocks": 4128056,
      "synced_headers": 4128056
    }
  ],
  "count": 8
}
```

**Example:**
```bash
curl https://maza.example.com/api/peers
```

---

### GET /api/nodes

Get geolocated peer nodes for the node map (includes geolocation data).

**Response:**
```json
{
  "total": 8,
  "geolocated": 8,
  "nodes": [
    {
      "ip": "123.45.67.89",
      "port": 12835,
      "country": "United States",
      "countryCode": "US",
      "region": "California",
      "city": "San Francisco",
      "lat": 37.7749,
      "lon": -122.4194,
      "version": "/Satoshi:0.10.0/",
      "conntime": 1709960000
    }
  ],
  "countries": {
    "US": 2,
    "FI": 2,
    "NL": 1,
    "FR": 1,
    "BG": 1,
    "SG": 1
  }
}
```

**Notes:**
- Includes geolocation for all active peers
- `countries` object shows distribution
- Geolocation happens server-side via ip-api.com

**Example:**
```bash
curl https://maza.example.com/api/nodes
```

---

### GET /api/price

Get current MAZA price in BTC, LTC, and ETH.

**Response:**
```json
{
  "MAZA": {
    "BTC": 0.00000004,
    "LTC": 0.00000123,
    "ETH": 0.00000056
  },
  "timestamp": "2026-03-09T05:49:12.000Z",
  "sources": {
    "freiexchange": "https://freiexchange.com/market/MAZA/BTC",
    "coingecko": "https://www.coingecko.com/en/coins/litecoin"
  }
}
```

**Notes:**
- MAZA/BTC from FreiExchange API
- MAZA/LTC and MAZA/ETH calculated from CoinGecko BTC ratios
- Cached for 60 seconds server-side
- No USD price (design decision)

**Example:**
```bash
curl https://maza.example.com/api/price
```

---

## Search

### GET /api/search/:query

Universal search for blocks, transactions, or addresses.

**Parameters:**
- `query` (string) - Search term (block height, block hash, tx hash, or address)

**Response:**

**For block height:**
```json
{
  "type": "block",
  "result": { /* block object */ }
}
```

**For block hash:**
```json
{
  "type": "block",
  "result": { /* block object */ }
}
```

**For transaction:**
```json
{
  "type": "transaction",
  "result": { /* transaction object */ }
}
```

**For address:**
```json
{
  "type": "address",
  "result": {
    "address": "MAddress...",
    "balance": 123.45,
    "txCount": 10
  }
}
```

**Not found:**
```json
{
  "type": "unknown",
  "error": "Not found"
}
```

**Example:**
```bash
# Search by block height
curl https://maza.example.com/api/search/4128000

# Search by hash
curl https://maza.example.com/api/search/0000000000000a1b2c3d...

# Search by address
curl https://maza.example.com/api/search/MCU8e7DdJ8D2on5fBQfb4jTn2qX4DGiikw
```

---

## Rich List

### GET /api/richlist/:limit?

Get top addresses by balance.

**Parameters:**
- `limit` (optional, number) - Number of addresses to return (default: 100, max: 1000)

**Response:**
```json
{
  "addresses": [
    {
      "rank": 1,
      "address": "MCU8e7DdJ8D2on5fBQfb4jTn2qX4DGiikw",
      "balance": 128183.78143,
      "lastSeen": 4078045,
      "percentOfSupply": 0.0512
    },
    {
      "rank": 2,
      "address": "MMvvMybGw83fU1quLzCAHVYv7jE1dAm5QV",
      "balance": 15000.49,
      "lastSeen": 4077832,
      "percentOfSupply": 0.0060
    }
  ],
  "lastScannedBlock": 4078232,
  "totalAddresses": 132,
  "isScanning": true,
  "blocksBehind": 49824
}
```

**Notes:**
- Balances are approximate (tracks outputs only)
- Scanner runs in background, updating every 5 minutes
- `isScanning: true` means scanner is actively catching up
- `percentOfSupply` calculated based on max supply (2.4 billion MAZA)

**Example:**
```bash
# Get top 10
curl https://maza.example.com/api/richlist/10

# Get top 100 (default)
curl https://maza.example.com/api/richlist
```

---

## WebSocket Events

The explorer uses Socket.IO for real-time updates.

**Connection:**
```javascript
import io from 'socket.io-client';

const socket = io('https://maza.example.com');

socket.on('connect', () => {
  console.log('Connected to explorer');
});
```

### Event: `block:new`

Emitted when a new block is mined.

**Payload:**
```json
{
  "height": 4128057,
  "hash": "0000000000000...",
  "time": 1709964712,
  "txCount": 3,
  "difficulty": 1.234567
}
```

**Example:**
```javascript
socket.on('block:new', (block) => {
  console.log('New block:', block.height);
  // Update UI with new block
});
```

### Event: `block:height`

Emitted periodically with current blockchain height.

**Payload:**
```json
{
  "height": 4128057
}
```

**Example:**
```javascript
socket.on('block:height', (data) => {
  console.log('Current height:', data.height);
});
```

### Subscribe to New Blocks

```javascript
socket.emit('subscribe:blocks');

socket.on('block:new', (block) => {
  console.log('New block mined:', block);
});
```

---

## Error Responses

All API errors return JSON with the following structure:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { /* optional additional info */ }
}
```

### Common Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `INVALID_PARAMETER` | Invalid request parameter |
| 404 | `NOT_FOUND` | Block, transaction, or address not found |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |
| 503 | `SERVICE_UNAVAILABLE` | Mazacoin node is unreachable |

**Example Error Response:**
```json
{
  "error": "Block not found",
  "code": "NOT_FOUND",
  "details": {
    "query": "999999999"
  }
}
```

---

## Rate Limiting

**Current Limits:**
- **General API:** 100 requests per minute per IP
- **Search endpoint:** 30 requests per minute per IP
- **WebSocket connections:** 10 concurrent connections per IP

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1709964800
```

**Rate Limit Exceeded Response:**
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

---

## Best Practices

### Caching

Cache responses client-side to reduce API calls:
- Block data: Cache for 10+ minutes (blocks are immutable after confirmations)
- Network stats: Cache for 30-60 seconds
- Price data: Cache for 60 seconds (already cached server-side)

### Pagination

For large datasets (e.g., transaction history), use pagination:
```
/api/address/:address/txs?page=1&limit=50
```

### Error Handling

Always handle errors gracefully:
```javascript
try {
  const response = await fetch('/api/block/4128000');
  if (!response.ok) {
    const error = await response.json();
    console.error('API error:', error.message);
  }
  const data = await response.json();
} catch (err) {
  console.error('Network error:', err);
}
```

### WebSocket Reconnection

Implement reconnection logic for WebSocket:
```javascript
socket.on('disconnect', () => {
  console.log('Disconnected, attempting to reconnect...');
  setTimeout(() => socket.connect(), 5000);
});
```

---

## Changelog

### v1.0.0 (2026-03-09)
- Initial release
- Block, transaction, and address lookup
- Network statistics
- Live node map with geolocation
- Rich list (top 1000 addresses)
- WebSocket real-time updates
- Price ticker (BTC/LTC/ETH)

---

## Support

For API issues or questions:
- **GitHub Issues:** https://git.example.com/yourusername/mazacoin-explorer/issues
- **Documentation:** See `README.md` and `INSTALL.md`

---

**Last Updated:** March 9, 2026
