import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, AlertCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

function RichList() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRichList();
    const interval = setInterval(fetchRichList, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const fetchRichList = async () => {
    try {
      setError(null);
      const response = await axios.get(`${API_URL}/api/richlist/100`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching rich list:', error);
      setError('Failed to load rich list');
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (balance) => {
    return balance.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    });
  };

  const formatBlockNumber = (block) => {
    return block ? block.toLocaleString() : 'Unknown';
  };

  const getTotalBalance = () => {
    if (!data || !data.addresses) return 0;
    return data.addresses.reduce((sum, addr) => sum + addr.balance, 0);
  };

  const getRankColor = (rank) => {
    if (rank === 1) return 'text-yellow-400'; // Gold
    if (rank === 2) return 'text-gray-300'; // Silver
    if (rank === 3) return 'text-yellow-600'; // Bronze
    return 'text-gray-400';
  };

  const getRankIcon = (rank) => {
    if (rank <= 3) {
      return <Trophy className={`w-5 h-5 ${getRankColor(rank)}`} />;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maza-blue"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="w-8 h-8 text-maza-blue" />
          Top 100 Rich List
        </h1>
        <div className="card bg-red-900/20 border border-red-500/50">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="w-6 h-6" />
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="w-8 h-8 text-maza-blue" />
          Top 100 Rich List
        </h1>
        {data?.isScanning && (
          <div className="text-sm text-yellow-400 flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
            Scanning blockchain...
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="text-gray-400 text-sm mb-1">Total Addresses</div>
          <div className="text-3xl font-bold text-yellow-400">{data?.totalAddresses || 0}</div>
        </div>
        
        <div className="stat-card">
          <div className="text-gray-400 text-sm mb-1">Last Scanned Block</div>
          <div className="text-2xl font-bold text-maza-blue">{formatBlockNumber(data?.lastScannedBlock)}</div>
        </div>
        
        <div className="stat-card">
          <div className="text-gray-400 text-sm mb-1">Top 100 Total Balance</div>
          <div className="text-2xl font-bold text-green-400">{formatBalance(getTotalBalance())} MAZA</div>
        </div>
        
        <div className="stat-card">
          <div className="text-gray-400 text-sm mb-1">Status</div>
          <div className={`text-xl font-bold ${data?.isScanning ? 'text-yellow-400' : 'text-green-400'}`}>
            {data?.isScanning ? 'Scanning...' : 'Up to date'}
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="card bg-blue-900/20 border border-blue-500/50">
        <div className="flex items-start gap-3 text-blue-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">About the Rich List</p>
            <p>
              This list shows the top 100 addresses by balance. Balances are calculated by tracking 
              transaction outputs as the blockchain is scanned. The scanner runs in the background 
              and processes blocks incrementally. Large exchanges and mining pools typically appear 
              at the top of this list.
            </p>
          </div>
        </div>
      </div>

      {/* Rich List Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-800 border-b border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Balance (MAZA)
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Last Seen Block
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {data?.addresses?.map((addr) => (
                <tr 
                  key={addr.address}
                  className="hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getRankIcon(addr.rank)}
                      <span className={`text-lg font-bold ${getRankColor(addr.rank)}`}>
                        {addr.rank}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <a 
                      href={`/address/${addr.address}`}
                      className="text-maza-blue hover:text-blue-300 font-mono text-sm break-all"
                    >
                      {addr.address}
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-green-400 font-bold">
                      {formatBalance(addr.balance)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-gray-400 text-sm">
                    {formatBlockNumber(addr.lastSeen)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!data?.addresses || data.addresses.length === 0 ? (
        <div className="card">
          <div className="text-center text-gray-400 py-12">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <p className="text-lg mb-2">No data available yet</p>
            <p className="text-sm">
              The blockchain scanner is starting up. Please check back in a few minutes.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default RichList;
