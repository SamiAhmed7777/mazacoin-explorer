import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Layers } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import PriceChart from '../components/PriceChart';
import axios from 'axios';
import { formatDistance } from 'date-fns';
import io from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || '';

function Home() {
  const [latestBlocks, setLatestBlocks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState(null);

  useEffect(() => {
    fetchData();
    
    // WebSocket for real-time updates
    const socket = io(API_URL);
    socket.emit('subscribe:blocks');
    
    socket.on('block:new', (block) => {
      setLatestBlocks(prev => [block, ...prev].slice(0, 10));
    });
    
    return () => socket.disconnect();
  }, []);

  const fetchData = async () => {
    try {
      const [blocksRes, statsRes, priceRes] = await Promise.all([
        axios.get(`${API_URL}/api/blocks/latest/3`, { timeout: 30000 }),
        axios.get(`${API_URL}/api/stats`, { timeout: 30000 }),
        axios.get(`${API_URL}/api/price`, { timeout: 30000 })
      ]);
      
      // Ensure we got valid data
      if (Array.isArray(blocksRes.data)) {
        setLatestBlocks(blocksRes.data);
      }
      if (statsRes.data && typeof statsRes.data === 'object') {
        setStats(statsRes.data);
      }
      if (priceRes.data && typeof priceRes.data === 'object') {
        setPrice(priceRes.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set empty/fallback data on error
      setLatestBlocks([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12">
        <h1 className="text-5xl font-bold mb-4">Mazacoin Blockchain Explorer</h1>
        <p className="text-xl text-gray-400 mb-8">
          Explore blocks, transactions, and addresses on the Mazacoin network
        </p>
        <SearchBar />
      </div>

      {/* Network Stats */}
      {stats && stats.blockHeight !== undefined && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {price && price.btc !== undefined && (
            <div className="stat-card">
              <div className="text-gray-400 text-sm mb-1">MAZA Price</div>
              <div className="text-lg font-bold text-yellow-400">
                {price.btc?.toFixed(8) || '0.00000000'} BTC
              </div>
              <div className="text-sm font-bold text-purple-400">
                {price.ltc?.toFixed(8) || '0.00000000'} LTC
              </div>
              <div className="text-sm font-bold text-blue-400">
                {price.eth?.toFixed(10) || '0.0000000000'} ETH
              </div>
              <div className="text-xs text-gray-500 mt-1">
                <a href="https://freiexchange.com/market/MAZA/BTC" target="_blank" rel="noreferrer" className="text-maza-blue hover:underline">FreiExchange</a>
              </div>
            </div>
          )}
          <div className="stat-card">
            <div className="text-gray-400 text-sm mb-1">Block Height</div>
            <div className="text-2xl font-bold text-maza-blue">
              {stats.blockHeight?.toLocaleString() || '0'}
            </div>
          </div>
          <div className="stat-card">
            <div className="text-gray-400 text-sm mb-1">Difficulty</div>
            <div className="text-2xl font-bold">
              {stats.difficulty?.toFixed(2) || '0.00'}
            </div>
          </div>
          <div className="stat-card">
            <div className="text-gray-400 text-sm mb-1">Network Hashrate</div>
            <div className="text-2xl font-bold">
              {((stats.networkHashrate || 0) / 1000000).toFixed(2)} MH/s
            </div>
          </div>
          <div className="stat-card">
            <div className="text-gray-400 text-sm mb-1">Connections</div>
            <div className="text-2xl font-bold text-green-400">
              {stats.connections || 0}
            </div>
          </div>
        </div>
      )}

      {/* Price Chart */}
      <PriceChart currency="btc" timeframe="all" />

      {/* Latest Blocks */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Layers className="w-6 h-6 text-maza-blue" />
          Latest Blocks
        </h2>
        
        {loading ? (
          <div className="loading">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maza-blue"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {latestBlocks.map((block) => (
              <Link
                key={block.height}
                to={`/block/${block.height}`}
                className="block p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-maza-blue/20 text-maza-blue px-3 py-1 rounded-lg font-bold">
                      {block.height}
                    </div>
                    <div className="hash text-gray-400">
                      {block.hash.substring(0, 16)}...
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDistance(new Date(block.time * 1000), new Date(), { addSuffix: true })}
                    </div>
                    <div>
                      {block.txCount} {block.txCount === 1 ? 'tx' : 'txs'}
                    </div>
                    {block.totalAmount !== undefined && block.totalAmount > 0 && (
                      <div className="text-green-400 font-semibold">
                        {block.totalAmount.toFixed(2)} MAZA
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
