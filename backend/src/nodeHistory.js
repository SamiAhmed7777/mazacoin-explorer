const fs = require('fs').promises;
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '..', 'data', 'nodes-history.json');
const MAX_AGE_HOURS = 24;

class NodeHistory {
  constructor() {
    this.nodes = new Map();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(HISTORY_FILE);
      await fs.mkdir(dataDir, { recursive: true });
      
      // Load existing history
      try {
        const data = await fs.readFile(HISTORY_FILE, 'utf8');
        const parsed = JSON.parse(data);
        this.nodes = new Map(Object.entries(parsed));
      } catch (err) {
        // File doesn't exist or is invalid, start fresh
        this.nodes = new Map();
      }
      
      this.initialized = true;
    } catch (err) {
      console.error('Error initializing node history:', err);
      this.nodes = new Map();
      this.initialized = true;
    }
  }

  async updateNode(ip, geoData, isActive = true) {
    await this.init();
    
    const now = Date.now();
    const existing = this.nodes.get(ip);
    
    if (existing) {
      // Update existing node
      this.nodes.set(ip, {
        ...existing,
        ...geoData,
        lastSeen: now,
        isActive
      });
    } else {
      // Add new node
      this.nodes.set(ip, {
        ip,
        ...geoData,
        firstSeen: now,
        lastSeen: now,
        isActive
      });
    }
  }

  async getRecentNodes() {
    await this.init();
    
    const cutoff = Date.now() - (MAX_AGE_HOURS * 60 * 60 * 1000);
    const recent = [];
    
    // First, mark all as inactive
    for (const [ip, node] of this.nodes.entries()) {
      if (node.lastSeen >= cutoff) {
        recent.push({
          ...node,
          isActive: false // Will be updated to true for currently connected nodes
        });
      }
    }
    
    return recent;
  }

  async cleanup() {
    await this.init();
    
    const cutoff = Date.now() - (MAX_AGE_HOURS * 60 * 60 * 1000);
    
    // Remove nodes older than 24 hours
    for (const [ip, node] of this.nodes.entries()) {
      if (node.lastSeen < cutoff) {
        this.nodes.delete(ip);
      }
    }
  }

  async save() {
    await this.init();
    
    try {
      const obj = Object.fromEntries(this.nodes);
      await fs.writeFile(HISTORY_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving node history:', err);
    }
  }

  async getStats() {
    await this.init();
    
    const cutoff = Date.now() - (MAX_AGE_HOURS * 60 * 60 * 1000);
    const recent = Array.from(this.nodes.values()).filter(n => n.lastSeen >= cutoff);
    
    const active = recent.filter(n => n.isActive);
    const countries = {};
    
    recent.forEach(node => {
      if (node.country) {
        countries[node.country] = (countries[node.country] || 0) + 1;
      }
    });
    
    return {
      total: recent.length,
      active: active.length,
      countries,
      nodes: recent
    };
  }
}

module.exports = new NodeHistory();
