# Mazacoin Explorer - Troubleshooting Log

## 2026-03-07: Whitescreen Issue

### Problem
Explorer showing blank white screen after initial flash of content.

### Root Causes Found

1. **Missing SSH in Docker container**
   - Backend container (node:20-alpine) didn't include openssh-client
   - Fix: Added `RUN apk add --no-cache openssh-client` to Dockerfile

2. **Sequential SSH calls (30+ second load time)**
   - Original code fetched 10 blocks sequentially (~3 sec each = 30+ sec total)
   - Fix: Changed to parallel fetching with `Promise.all()`

3. **SSH connection limit exceeded**
   - Parallel fetching opened 10 simultaneous SSH connections
   - Windows SSH server rejected connections: "(SSH) Channel open failure"
   - Fix: Batched parallel requests (3 at a time) to stay under connection limit

### Final Solution

```javascript
// /root/Projects/mazacoin-explorer/backend/src/server.js
// Fetch blocks with limited concurrency (batches of 3)
const BATCH_SIZE = 3;
for (let i = 0; i < heights.length; i += BATCH_SIZE) {
  const batch = heights.slice(i, i + BATCH_SIZE);
  const batchResults = await Promise.all(batch.map(async (height) => {
    // fetch block...
  }));
  blocks.push(...batchResults.filter(b => b !== null));
}
```

### Current Performance
- API response time: **~0.1 seconds** (was 30-45 seconds)
- No SSH errors
- Backend healthy and responsive

### Next Steps
- Rebuilding frontend container (no-cache) to ensure clean build
- Verify React app loads without JavaScript errors
