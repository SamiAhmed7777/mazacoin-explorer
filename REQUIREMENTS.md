# Mazacoin Blockchain Explorer - Requirements

## Project Overview
Build a full-featured blockchain explorer for Mazacoin (similar to blockchain.com or blockchair.com).

**Domain:** maza.samiahmed7777.me
**Mazacoin Node:** Running on Windows PC at 100.85.236.10 (Tailscale), wallet at E:\coins\MAZA

## Core Features

### 1. Block Explorer
- Search by block height or hash
- Display: height, hash, timestamp, size, transactions, miner address
- Previous/next block navigation
- Latest blocks feed (real-time)

### 2. Transaction Viewer
- Search by transaction ID
- Display: inputs, outputs, amounts, fees, confirmations
- Visual input/output flow
- Transaction status (confirmed/pending)

### 3. Address Lookup
- Search by Mazacoin address
- Balance display
- Transaction history (paginated)
- QR code generation for receiving
- Total received/sent

### 4. Network Statistics Dashboard
- Current block height
- Network hashrate
- Mining difficulty
- Average block time
- Total supply
- Active addresses (24h)
- Transactions per day
- Mempool size

### 5. Live Node Map 🌍
- Interactive world map (Leaflet.js)
- Geo-located active Mazacoin nodes
- Real-time updates via WebSocket
- Show: location, IP (optional), version, uptime
- Node count by country

### 6. Charts & Analytics
- Hashrate over time (7d, 30d, all time)
- Transactions per day
- Difficulty adjustment history
- Block time trends

### 7. Rich List
- Top addresses by balance
- Percentage of total supply
- Privacy-friendly (optional anonymization)

### 8. Mining Stats
- Latest mined blocks
- Mining pool distribution (if detectable)
- Average block rewards

## Tech Stack

### Backend
- **Language:** Node.js + Express
- **Database:** MongoDB (for caching blockchain data)
- **Blockchain:** Mazacoin node RPC via `maza-cli.exe`
- **Geolocation:** ipapi.co or ip-api.com
- **Real-time:** WebSocket (Socket.io)

### Frontend
- **Framework:** React (or vanilla JS if simpler)
- **Maps:** Leaflet.js
- **Charts:** Chart.js or Recharts
- **Styling:** TailwindCSS or similar
- **Icons:** Lucide or Font Awesome

### Infrastructure
- **Container:** Docker + docker-compose
- **Deployment:** DashCaddy API (http://100.71.97.12:3001)
- **Reverse Proxy:** Caddy (auto-configured via DashCaddy)
- **Domain:** maza.samiahmed7777.me

## Mazacoin Node Connection

**Node Location:** Windows PC at 100.85.236.10 (SSH: hello@100.85.236.10, key at ~/.ssh/krystie_to_sami_pc)
**Wallet Path:** E:\coins\MAZA
**CLI:** E:\coins\MAZA\daemon\maza-cli.exe

**RPC Commands Available:**
- `getblockcount` - Latest block height
- `getblockhash <height>` - Get block hash
- `getblock <hash>` - Get block details
- `getrawtransaction <txid> 1` - Get transaction details
- `getpeerinfo` - Get connected nodes
- `getnetworkinfo` - Network stats
- `getmininginfo` - Mining difficulty, hashrate
- `getdifficulty` - Current difficulty

**Connection Method:**
1. Start Mazacoin node: `E:\coins\MAZA\maza-qt.exe -server` (enables RPC)
2. Or use daemon: Check if there's a mazacoind.exe in the daemon folder
3. Configure RPC credentials in maza.conf (create if needed)
4. Backend queries via SSH + maza-cli or direct RPC if port exposed

## Project Structure

```
mazacoin-explorer/
├── backend/
│   ├── src/
│   │   ├── api/           # REST endpoints
│   │   ├── rpc/           # Mazacoin RPC client
│   │   ├── db/            # MongoDB models
│   │   ├── workers/       # Background sync workers
│   │   └── websocket/     # Real-time updates
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Block, TX, Address pages
│   │   ├── charts/        # Chart components
│   │   └── map/           # Node map
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── deploy.sh              # DashCaddy deployment script
└── README.md
```

## Deployment Steps

1. Build Docker images
2. Push to registry or build on target
3. Deploy via DashCaddy API:
   ```bash
   curl -X POST http://100.71.97.12:3001/api/docker/deploy \
     -H "Content-Type: application/json" \
     -d '{
       "name": "mazacoin-explorer",
       "domain": "maza.samiahmed7777.me",
       "port": 3000,
       "env": {...}
     }'
   ```

## Design Requirements
- **Theme:** Dark mode by default (blockchain explorers are dark)
- **Colors:** Use Mazacoin brand colors if available, or crypto-blue palette
- **Responsive:** Mobile-friendly
- **Performance:** Fast search, lazy loading for large datasets
- **UX:** Clean, intuitive, minimal clicks to info

## Security Considerations
- Rate limiting on API endpoints
- Input validation (block heights, addresses, tx IDs)
- No sensitive RPC credentials exposed
- Optional: Cloudflare proxy for DDoS protection

## Testing
- Unit tests for RPC client
- Integration tests for API endpoints
- E2E tests for critical user flows (search, view block, etc.)

## Timeline
Build this incrementally:
1. **Phase 1:** Backend RPC client + basic API (blocks, txs, addresses)
2. **Phase 2:** Frontend (search, block/tx viewer)
3. **Phase 3:** Network stats dashboard
4. **Phase 4:** Live node map
5. **Phase 5:** Charts + rich list

## Success Criteria
- Can search and view any block, transaction, or address
- Live node map updates in real-time
- Network stats are accurate
- Fast load times (<2s for most pages)
- Deployed and accessible at maza.samiahmed7777.me

---

**Note:** User (Sami) has Mazacoin wallet but node is not currently running. You may need to coordinate with Krystie (me) to start the node or handle RPC connection setup.

When completely finished, run this command to notify me:
openclaw system event --text "Done: Mazacoin explorer built and ready for deployment to maza.samiahmed7777.me" --mode now
