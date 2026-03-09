import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, Hash, Layers } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';

const API_URL = process.env.REACT_APP_API_URL || '';

function BlockDetail() {
  const { hashOrHeight } = useParams();
  const [block, setBlock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBlock();
  }, [hashOrHeight]);

  const fetchBlock = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${API_URL}/api/block/${hashOrHeight}`);
      setBlock(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Block not found');
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

  if (error) {
    return (
      <div className="error">
        {error}
      </div>
    );
  }

  if (!block) return null;

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to={`/block/${block.height - 1}`}
          className="btn btn-secondary flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous Block
        </Link>
        
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Layers className="w-8 h-8 text-maza-blue" />
          Block #{block.height}
        </h1>
        
        <Link
          to={`/block/${block.height + 1}`}
          className="btn btn-secondary flex items-center gap-2"
        >
          Next Block
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Block Details */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Block Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-gray-400 text-sm mb-1">Height</div>
            <div className="text-lg font-bold">{block.height}</div>
          </div>
          
          <div>
            <div className="text-gray-400 text-sm mb-1">Timestamp</div>
            <div className="text-lg flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {format(new Date(block.time * 1000), 'PPpp')}
            </div>
          </div>
          
          <div className="md:col-span-2">
            <div className="text-gray-400 text-sm mb-1">Hash</div>
            <div className="hash text-lg bg-gray-800 p-3 rounded">{block.hash}</div>
          </div>
          
          {block.previousblockhash && (
            <div className="md:col-span-2">
              <div className="text-gray-400 text-sm mb-1">Previous Block Hash</div>
              <Link
                to={`/block/${block.previousblockhash}`}
                className="hash text-lg bg-gray-800 p-3 rounded hover:bg-gray-700 block transition-colors"
              >
                {block.previousblockhash}
              </Link>
            </div>
          )}
          
          {block.nextblockhash && (
            <div className="md:col-span-2">
              <div className="text-gray-400 text-sm mb-1">Next Block Hash</div>
              <Link
                to={`/block/${block.nextblockhash}`}
                className="hash text-lg bg-gray-800 p-3 rounded hover:bg-gray-700 block transition-colors"
              >
                {block.nextblockhash}
              </Link>
            </div>
          )}
          
          <div>
            <div className="text-gray-400 text-sm mb-1">Difficulty</div>
            <div className="text-lg">{block.difficulty?.toFixed(4)}</div>
          </div>
          
          <div>
            <div className="text-gray-400 text-sm mb-1">Size</div>
            <div className="text-lg">{(block.size / 1024).toFixed(2)} KB</div>
          </div>
          
          <div>
            <div className="text-gray-400 text-sm mb-1">Confirmations</div>
            <div className="text-lg text-green-400">{block.confirmations}</div>
          </div>
          
          <div>
            <div className="text-gray-400 text-sm mb-1">Version</div>
            <div className="text-lg">{block.version}</div>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4 flex items-center justify-between">
          <span>Transactions ({block.tx?.length || 0})</span>
          {block.totalAmount !== undefined && block.totalAmount > 0 && (
            <span className="text-lg text-green-400">
              Total: {block.totalAmount.toFixed(2)} MAZA
            </span>
          )}
        </h2>
        
        {block.tx && block.tx.length > 0 ? (
          <div className="space-y-2">
            {block.tx.map((txid, index) => (
              <Link
                key={txid}
                to={`/tx/${txid}`}
                className="block p-3 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-gray-400 text-sm shrink-0">#{index}</div>
                    <div className="hash flex-1 truncate">{txid}</div>
                  </div>
                  {index === 0 && (
                    <div className="text-xs text-yellow-400 shrink-0">Coinbase</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-gray-400 text-center py-8">
            No transactions in this block
          </div>
        )}
      </div>
    </div>
  );
}

export default BlockDetail;
