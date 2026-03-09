import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, TrendingUp } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

function AddressDetail() {
  const { address } = useParams();
  const [balanceData, setBalanceData] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(true);

  useEffect(() => {
    fetchBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const fetchBalance = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/address/${address}/balance`);
      setBalanceData(response.data);
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(address);
  };

  const formatBalance = (balance) => {
    return balance.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Address Details</h1>

      <div className="card">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-4">Address</h2>
            
            <div className="bg-gray-800 p-4 rounded mb-4">
              <div className="hash text-lg break-all mb-2">{address}</div>
              <button
                onClick={copyToClipboard}
                className="btn btn-secondary text-sm flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Address
              </button>
            </div>

            {/* Balance Info */}
            <div className="bg-gray-800 p-4 rounded mb-4">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
                Balance
              </h3>
              
              {loadingBalance ? (
                <div className="text-gray-400 text-sm">Loading balance...</div>
              ) : balanceData?.balance !== null && balanceData?.balance !== undefined ? (
                <>
                  <div className="text-3xl font-bold text-green-400 mb-2">
                    {formatBalance(balanceData.balance)} MAZA
                  </div>
                  {balanceData.rank && (
                    <div className="text-sm text-gray-400">
                      Rank #{balanceData.rank} in rich list
                    </div>
                  )}
                  {balanceData.lastSeen && (
                    <div className="text-xs text-gray-500 mt-1">
                      Last seen in block: {balanceData.lastSeen.toLocaleString()}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-gray-400">
                  {balanceData?.message || 'Balance data not available yet'}
                  {balanceData?.lastScannedBlock && (
                    <div className="text-xs text-gray-500 mt-1">
                      Scanner progress: block {balanceData.lastScannedBlock.toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-blue-900/30 border border-blue-700 text-blue-300 p-4 rounded text-sm">
              <p className="mb-2">
                <strong>About Balance Data:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Balance is calculated by our blockchain scanner tracking all transaction outputs</li>
                <li>Scanner is running in the background and processes blocks continuously</li>
                <li>Top addresses appear in the rich list as they're discovered</li>
                <li>Full transaction history requires <code className="bg-gray-800 px-1 rounded">txindex=1</code> on the node</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <h3 className="text-lg font-bold mb-4">QR Code</h3>
            <div className="bg-white p-4 rounded">
              <QRCodeSVG value={address} size={200} />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Transaction History</h2>
        <div className="text-gray-400 text-center py-8">
          <p className="mb-2">Transaction history for addresses requires txindex to be enabled on the Mazacoin node.</p>
          <p className="text-sm">This feature will be available once the node is configured with txindex and fully synced.</p>
        </div>
      </div>
    </div>
  );
}

export default AddressDetail;
