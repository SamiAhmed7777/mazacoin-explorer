# Mazacoin Explorer - Installation Guide

Complete step-by-step instructions for deploying the Mazacoin blockchain explorer.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [System Requirements](#system-requirements)
3. [Mazacoin Node Setup](#mazacoin-node-setup)
4. [SSH Access Configuration](#ssh-access-configuration)
5. [Explorer Deployment](#explorer-deployment)
6. [DNS & Reverse Proxy Setup](#dns--reverse-proxy-setup)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Services
- **Mazacoin full node** running with RPC enabled
- **Docker** 20.10+ and **docker-compose** 1.29+
- **SSH access** to the Mazacoin node (if remote)
- **Domain name** with DNS configured
- **Reverse proxy** (Caddy recommended) with TLS support

### Network Access
- Mazacoin node must be accessible via SSH (if remote) or local network
- Port 8080 available for the explorer frontend
- Port 3000 available for the explorer backend API

---

## System Requirements

### Minimum Specs
- **CPU:** 2 cores
- **RAM:** 2 GB
- **Disk:** 10 GB free space
- **Network:** Stable internet connection

### Recommended Specs
- **CPU:** 4+ cores
- **RAM:** 4+ GB
- **Disk:** 20+ GB SSD
- **Network:** 100+ Mbps

---

## Mazacoin Node Setup

### Option 1: Windows Node (GUI Wallet)

1. **Download Mazacoin wallet** from https://mazacoin.org/downloads

2. **Install** to desired location (e.g., `E:\coins\MAZA`)

3. **Create RPC configuration file** at `E:\coins\MAZA\maza.conf`:
   ```ini
   # RPC Settings
   server=1
   rpcuser=mazarpc
   rpcpassword=YOUR_SECURE_PASSWORD_HERE
   rpcallowip=127.0.0.1
   rpcport=12832
   
   # Optional: Enable transaction index (required for full address lookup)
   txindex=1
   ```

4. **Start wallet with RPC enabled:**
   ```powershell
   E:\coins\MAZA\maza-qt.exe -server
   ```

5. **Verify RPC works:**
   ```powershell
   E:\coins\MAZA\daemon\maza-cli.exe -datadir=E:\coins\MAZA getblockcount
   ```

### Option 2: Linux Node (Daemon)

1. **Install dependencies:**
   ```bash
   sudo apt update
   sudo apt install build-essential libtool autotools-dev automake pkg-config \
     libssl-dev libevent-dev bsdmainutils libboost-all-dev
   ```

2. **Download and compile Mazacoin:**
   ```bash
   git clone https://github.com/MazaCoin/maza.git
   cd maza
   ./autogen.sh
   ./configure
   make
   sudo make install
   ```

3. **Create config file** at `~/.maza/maza.conf`:
   ```ini
   server=1
   rpcuser=mazarpc
   rpcpassword=YOUR_SECURE_PASSWORD_HERE
   rpcallowip=127.0.0.1
   rpcport=12832
   txindex=1
   daemon=1
   ```

4. **Start daemon:**
   ```bash
   mazacoind
   ```

5. **Verify:**
   ```bash
   maza-cli getblockcount
   ```

---

## SSH Access Configuration

### If Mazacoin node is on a remote machine:

1. **Generate SSH key pair** on the explorer server:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/mazacoin_node -C "mazacoin-explorer"
   ```

2. **Copy public key to node:**
   ```bash
   ssh-copy-id -i ~/.ssh/mazacoin_node.pub user@node-ip
   ```

3. **Test connection:**
   ```bash
   ssh -i ~/.ssh/mazacoin_node user@node-ip "hostname"
   ```

4. **Update backend configuration** to use this key (see [Explorer Deployment](#explorer-deployment))

---

## Explorer Deployment

### Step 1: Clone Repository

```bash
git clone https://git.example.com/sami/mazacoin-explorer.git
cd mazacoin-explorer
```

### Step 2: Configure Backend

Edit `backend/.env` (create if it doesn't exist):

```env
# Node Environment
NODE_ENV=production
PORT=3000

# Mazacoin Node Connection
MAZA_HOST=<MAZACOIN_NODE_IP>
MAZA_USER=hello
MAZA_CLI_PATH=E:\\coins\\MAZA\\daemon\\maza-cli.exe
MAZA_DATADIR=E:\\coins\\MAZA
SSH_KEY_PATH=/root/.ssh/id_ed25519

# API Configuration
CACHE_TTL=60
MAX_BLOCKS_PER_REQUEST=100
WEBSOCKET_POLL_INTERVAL=15000
```

**Important Notes:**
- Use double backslashes `\\` for Windows paths in env files
- Adjust `MAZA_HOST`, `MAZA_USER`, `SSH_KEY_PATH` to match your setup
- If running node locally (not via SSH), set `MAZA_HOST=localhost`

### Step 3: Configure Frontend

Edit `frontend/.env`:

```env
# API URL (leave empty for same-origin, or specify full URL)
REACT_APP_API_URL=

# For development, use:
# REACT_APP_API_URL=http://localhost:3000
```

### Step 4: Build and Start Services

```bash
# Build Docker images
docker-compose build

# Start containers in detached mode
docker-compose up -d

# View logs
docker-compose logs -f
```

### Step 5: Verify Services

```bash
# Check container status
docker-compose ps

# Test backend API
curl http://localhost:3000/api/health

# Expected response:
# {"status":"ok","blockHeight":4128056}

# Test frontend
curl http://localhost:8080
```

---

## DNS & Reverse Proxy Setup

### Option 1: Using DashCaddy (Automated)

If you have DashCaddy installed:

```bash
# Run the deployment script
./deploy.sh
```

This will:
- Create Caddy reverse proxy configuration
- Set up automatic Let's Encrypt TLS
- Configure DNS if using Technitium

### Option 2: Manual Caddy Configuration

Create `/etc/caddy/sites/maza.yourdomain.com`:

```caddy
maza.yourdomain.com {
    reverse_proxy localhost:8080
    
    # Optional: API sub-path
    handle /api/* {
        reverse_proxy localhost:3000
    }
    
    # TLS
    tls {
        protocols tls1.2 tls1.3
    }
    
    # Headers
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy no-referrer-when-downgrade
    }
    
    # Logging
    log {
        output file /var/log/caddy/maza.log
    }
}
```

Reload Caddy:
```bash
systemctl reload caddy
```

### Option 3: Nginx Configuration

```nginx
server {
    listen 80;
    server_name maza.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name maza.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## Verification

### 1. Check All Services Running

```bash
# Docker containers
docker ps --filter name=mazacoin

# Expected output:
# mazacoin-backend   Up X minutes
# mazacoin-frontend  Up X minutes
```

### 2. Test API Endpoints

```bash
# Health check
curl https://maza.yourdomain.com/api/health

# Block count
curl https://maza.yourdomain.com/api/blockcount

# Latest blocks
curl https://maza.yourdomain.com/api/blocks/latest/5

# Network stats
curl https://maza.yourdomain.com/api/stats
```

### 3. Test Frontend

Visit https://maza.yourdomain.com in your browser and verify:
- ✅ Home page loads with latest blocks
- ✅ Search works (try searching a block number)
- ✅ Block detail page displays correctly
- ✅ Node map shows active nodes
- ✅ Network stats are populated

### 4. Test WebSocket

Open browser console on https://maza.yourdomain.com and check:
```
WebSocket connection to 'wss://maza.yourdomain.com/socket.io/' succeeded
```

---

## Troubleshooting

### Backend Won't Start

**Issue:** `Error: connect ECONNREFUSED` or SSH connection fails

**Solutions:**
1. Verify Mazacoin node is running:
   ```bash
   ssh -i ~/.ssh/mazacoin_node user@node-ip "tasklist | findstr maza"  # Windows
   ssh -i ~/.ssh/mazacoin_node user@node-ip "pgrep -f mazacoin"  # Linux
   ```

2. Test RPC manually:
   ```bash
   ssh -i ~/.ssh/mazacoin_node user@node-ip "maza-cli getblockcount"
   ```

3. Check backend logs:
   ```bash
   docker logs mazacoin-backend --tail 50
   ```

### Frontend Shows "API Error"

**Issue:** Frontend can't reach backend API

**Solutions:**
1. Check backend is responding:
   ```bash
   curl http://localhost:3000/api/health
   ```

2. Verify environment variable `REACT_APP_API_URL` is correct in frontend

3. Check CORS settings in backend if accessing from different domain

4. Review frontend logs:
   ```bash
   docker logs mazacoin-frontend --tail 50
   ```

### Node Map Not Showing Nodes

**Issue:** Map loads but shows 0 nodes

**Solutions:**
1. Check if Mazacoin node has active peer connections:
   ```bash
   curl http://localhost:3000/api/peers
   ```

2. Verify IP geolocation API is accessible (rate limits?)

3. Check browser console for JavaScript errors

4. Wait a few minutes for initial geolocation to complete

### SSL Certificate Issues

**Issue:** "Your connection is not private" or certificate errors

**Solutions:**
1. Verify DNS is pointing to correct IP:
   ```bash
   dig maza.yourdomain.com
   ```

2. Check Caddy logs:
   ```bash
   journalctl -u caddy --no-pager -n 50
   ```

3. Manually request certificate:
   ```bash
   caddy reload --config /etc/caddy/Caddyfile
   ```

4. Ensure ports 80 and 443 are open:
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

### High Memory Usage

**Issue:** Backend container using excessive RAM

**Solutions:**
1. Limit Docker container memory:
   ```yaml
   # In docker-compose.yml
   services:
     backend:
       deploy:
         resources:
           limits:
             memory: 512M
   ```

2. Reduce cache size in backend config

3. Enable MongoDB for persistent caching instead of in-memory cache

### Slow Block Queries

**Issue:** Block detail pages take >5 seconds to load

**Solutions:**
1. Check Mazacoin node responsiveness:
   ```bash
   time ssh user@node "maza-cli getblock BLOCKHASH"
   ```

2. Enable MongoDB caching (see backend README)

3. Reduce concurrent block fetches (edit `backend/src/rpc/MazacoinRPC.js`)

4. Consider running Mazacoin node on faster hardware

---

## Performance Optimization

### Enable Caching

MongoDB caching can significantly improve performance:

1. Start MongoDB container:
   ```bash
   docker run -d --name mongo \
     -p 27017:27017 \
     -v /data/mongo:/data/db \
     mongo:6
   ```

2. Update backend `.env`:
   ```env
   MONGO_URI=mongodb://localhost:27017/mazacoin
   ENABLE_DB_CACHE=true
   ```

3. Restart backend:
   ```bash
   docker-compose restart backend
   ```

### CDN Integration

For faster static asset delivery:

1. Use Cloudflare in front of your domain
2. Enable caching for `/static/*` paths
3. Configure browser caching headers in Caddy

---

## Monitoring

### Health Checks

Set up automated monitoring:

```bash
# Simple uptime check (add to cron)
*/5 * * * * curl -sf https://maza.yourdomain.com/api/health || echo "Explorer down!" | mail -s "Alert" admin@yourdomain.com
```

### Prometheus Metrics (Optional)

The backend can export Prometheus metrics:

1. Enable in backend config
2. Add scrape target to Prometheus:
   ```yaml
   scrape_configs:
     - job_name: 'mazacoin-explorer'
       static_configs:
         - targets: ['localhost:3000']
   ```

---

## Updating

To update the explorer to a new version:

```bash
cd mazacoin-explorer

# Pull latest code
git pull origin main

# Rebuild images
docker-compose build

# Restart services (zero-downtime)
docker-compose up -d

# Check logs
docker-compose logs -f
```

---

## Backup & Recovery

### Backup Configuration

```bash
# Backup env files
cp backend/.env backend/.env.backup
cp frontend/.env frontend/.env.backup

# Backup Caddy config
sudo cp /etc/caddy/sites/maza.yourdomain.com /etc/caddy/sites/maza.yourdomain.com.backup
```

### Database Backup (if using MongoDB)

```bash
docker exec mongo mongodump --out /backup
```

---

## Support

For issues, questions, or contributions:
- **Issues:** https://git.example.com/sami/mazacoin-explorer/issues
- **Docs:** See `README.md` and `TROUBLESHOOTING.md`
- **Mazacoin Community:** https://mazacoin.org

---

**Installation complete! 🎉**

Your Mazacoin blockchain explorer should now be running at your configured domain.
