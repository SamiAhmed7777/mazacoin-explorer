import React, { useState, useEffect } from 'react';
import { Activity, Server, Zap, Clock } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

function NetworkStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maza-blue"></div>
      </div>
    );
  }

  if (!stats) {
    return <div className="error">Failed to load network statistics</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="w-8 h-8 text-maza-blue" />
          Network Statistics
        </h1>
        <div className="text-sm text-gray-400">
          Last updated: {new Date(stats.timestamp).toLocaleTimeString()}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-maza-blue/20 rounded-lg">
              <Server className="w-6 h-6 text-maza-blue" />
            </div>
            <div>
              <div className="text-gray-400 text-sm">Block Height</div>
              <div className="text-3xl font-bold">{stats.blockHeight?.toLocaleString() || '0'}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="text-gray-400 text-sm">Network Hashrate</div>
              <div className="text-3xl font-bold">
                {((stats.networkHashrate || 0) / 1000000).toFixed(2)} MH/s
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Activity className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <div className="text-gray-400 text-sm">Active Connections</div>
              <div className="text-3xl font-bold text-green-400">{stats.connections}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <div className="text-gray-400 text-sm">Difficulty</div>
              <div className="text-2xl font-bold">{stats.difficulty?.toFixed(2) || '0.00'}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="text-gray-400 text-sm mb-1">Protocol Version</div>
          <div className="text-2xl font-bold">{stats.protocolVersion}</div>
        </div>

        <div className="card">
          <div className="text-gray-400 text-sm mb-1">Client Version</div>
          <div className="text-2xl font-bold">{stats.version}</div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">About Mazacoin</h2>
        <div className="text-gray-300 space-y-2">
          <p>
            Mazacoin (MAZA) is a cryptocurrency designed for the Oglala Lakota Nation. 
            It is based on the Bitcoin protocol and uses Proof-of-Work consensus.
          </p>
          <p className="text-sm text-gray-400">
            This explorer provides real-time blockchain data directly from Mazacoin nodes.
          </p>
        </div>
      </div>
    </div>
  );
}

export default NetworkStats;
