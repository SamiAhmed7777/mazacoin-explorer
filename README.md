# Mazacoin Blockchain Explorer

A full-featured blockchain explorer for Mazacoin (MAZA), featuring real-time block updates, transaction search, network statistics, and a live node map.

🌐 **Live at:** https://maza.samiahmed7777.me

## Features

- ✅ **Block Explorer** - Search and view blocks by height or hash
- ✅ **Transaction Viewer** - Detailed transaction information with inputs/outputs
- ✅ **Address Lookup** - View address details with QR code generation
- ✅ **Network Statistics** - Real-time network stats dashboard
- ✅ **Live Node Map** - Interactive world map showing geo-located Mazacoin nodes
- ✅ **Real-time Updates** - WebSocket integration for live block notifications
- ✅ **Search** - Universal search for blocks, transactions, and addresses
- ✅ **Dark Mode UI** - Professional blockchain explorer design

## Tech Stack

### Backend
- **Node.js** + Express
- **MongoDB** (planned for caching)
- **Socket.IO** for real-time WebSocket updates
- **SSH** client for Mazacoin RPC connection
- **Node-cache** for query caching

### Frontend
- **React** 18 with React Router
- **TailwindCSS** for styling
- **Leaflet.js** for interactive maps
- **Chart.js** for analytics (ready for expansion)
- **Lucide React** for icons
- **QRCode.react** for address QR codes

### Infrastructure
- **Docker** + docker-compose
- **Nginx** (frontend reverse proxy)
- **Caddy** (main reverse proxy via DashCaddy)
- **Tailscale** network for secure node access

## Prerequisites

1. **Mazacoin Node** running on `100.85.236.10` (Windows PC)
   - Wallet path: `E:\coins\MAZA`
   - CLI: `E:\coins\MAZA\daemon\maza-cli.exe`
   - SSH access configured with key at `~/.ssh/krystie_to_sami_pc`

2. **Docker** and **docker-compose** installed

3. **DashCaddy** running on DNS1 (100.71.97.12)

## Quick Start

### 1. Start the Mazacoin Node

On the Windows PC (100.85.236.10):

```powershell
# Option 1: GUI with RPC enabled
E:\coins\MAZA\maza-qt.exe -server

# Option 2: Check if daemon exists and use it
E:\coins\MAZA\daemon\mazacoind.exe -daemon
```

### 2. Build and Deploy

```bash
cd /root/Projects/mazacoin-explorer
./deploy.sh
```

The deployment script will:
- Build Docker images
- Start frontend and backend containers
- Configure Caddy reverse proxy
- Make the explorer available at https://maza.samiahmed7777.me

### 3. Manual Deployment (Alternative)

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f
```

## Development

### Backend Development

```bash
cd backend
npm install
npm run dev  # Uses nodemon for auto-restart
```

### Frontend Development

```bash
cd frontend
npm install
npm start  # Runs on http://localhost:3001
```

**Note:** Update `.env` or `src/config.js` to point to your local backend during development.

## API Endpoints

### Blockchain Data
- `GET /api/health` - Health check
- `GET /api/blockcount` - Latest block height
- `GET /api/block/:hashOrHeight` - Get block by hash or height
- `GET /api/tx/:txid` - Get transaction by ID
- `GET /api/blocks/latest/:count` - Get latest N blocks
- `GET /api/search/:query` - Universal search

### Network Info
- `GET /api/stats` - Network statistics
- `GET /api/peers` - Connected peer nodes (for node map)

### WebSocket Events
- `subscribe:blocks` - Subscribe to new block notifications
- `block:new` - Receive new block events
- `block:height` - Current block height

## Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
NODE_ENV=production
PORT=3000
SSH_KEY_PATH=/root/.ssh/krystie_to_sami_pc
```

### Frontend Environment Variables

Create `frontend/.env`:

```env
REACT_APP_API_URL=https://maza.samiahmed7777.me
```

## Architecture

```
┌─────────────────┐
│   User Browser  │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│  Caddy (DNS1)   │ ← DashCaddy managed
│ :443 → :8080    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Frontend       │────▶│  Backend        │
│  (React/Nginx)  │     │  (Node.js API)  │
│  Port 8080      │     │  Port 3000      │
└─────────────────┘     └────────┬────────┘
                                 │ SSH
                                 ▼
                        ┌─────────────────┐
                        │  Mazacoin Node  │
                        │  (sami-pc)      │
                        │  100.85.236.10  │
                        └─────────────────┘
```

## Monitoring

### View Logs

```bash
# Backend logs
docker-compose logs -f backend

# Frontend logs
docker-compose logs -f frontend

# All logs
docker-compose logs -f
```

### Check Service Status

```bash
docker-compose ps
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
docker-compose restart frontend
```

## Troubleshooting

### Backend can't connect to Mazacoin node

1. Check if Mazacoin is running on sami-pc:
```bash
ssh -i ~/.ssh/krystie_to_sami_pc hello@100.85.236.10 "tasklist | findstr maza"
```

2. Test RPC connection:
```bash
ssh -i ~/.ssh/krystie_to_sami_pc hello@100.85.236.10 "E:\coins\MAZA\daemon\maza-cli.exe getblockcount"
```

3. Check backend logs:
```bash
docker-compose logs backend | grep -i error
```

### Frontend shows "API Error"

1. Check if backend is running:
```bash
curl http://localhost:3000/api/health
```

2. Check frontend logs for configuration issues:
```bash
docker-compose logs frontend
```

### Node map not showing nodes

The node map requires:
1. Mazacoin node to have active peer connections
2. Internet access for IP geolocation API calls
3. May take a few minutes to geolocate all peers

## Future Enhancements

- [ ] MongoDB integration for blockchain data caching
- [ ] Full address balance lookup (requires txindex)
- [ ] Transaction mempool viewer
- [ ] Charts for hashrate/difficulty trends
- [ ] Rich list (top addresses by balance)
- [ ] Mining pool statistics
- [ ] Block time analysis
- [ ] API rate limiting
- [ ] Prometheus metrics export
- [ ] Mobile app (React Native)

## Contributing

This is a private project for the Mazacoin community. For questions or suggestions, contact the maintainer.

## License

MIT License - See LICENSE file for details

## Credits

Built with ❤️ for the Mazacoin community

- **Mazacoin:** https://mazacoin.org
- **Explorer:** https://maza.samiahmed7777.me

---

**Deployment Status:** ✅ Ready for deployment

**Last Updated:** March 6, 2026
