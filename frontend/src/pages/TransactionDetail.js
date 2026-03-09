import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';

const API_URL = process.env.REACT_APP_API_URL || '';

function TransactionDetail() {
  const { txid } = useParams();
  const [tx, setTx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTransaction();
  }, [txid]);

  const fetchTransaction = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${API_URL}/api/tx/${txid}`);
      setTx(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Transaction not found');
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
    return <div className="error">{error}</div>;
  }

  if (!tx) return null;

  // Use backend-calculated totals if available, otherwise calculate
  const totalInput = tx.totalInput !== undefined ? tx.totalInput : 
    tx.vin?.reduce((sum, input) => sum + (input.value || 0), 0) || 0;
  const totalOutput = tx.totalOutput !== undefined ? tx.totalOutput :
    tx.vout?.reduce((sum, output) => sum + (output.value || 0), 0) || 0;
  const fee = tx.fees !== undefined ? tx.fees : (totalInput - totalOutput);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Transaction Details</h1>

      {/* Transaction Info */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Transaction Information</h2>
        
        <div className="grid grid-cols-1 gap-6">
          <div>
            <div className="text-gray-400 text-sm mb-1">Transaction ID</div>
            <div className="hash text-lg bg-gray-800 p-3 rounded">{tx.txid}</div>
          </div>
          
          {tx.blockhash && (
            <div>
              <div className="text-gray-400 text-sm mb-1">Block Hash</div>
              <Link
                to={`/block/${tx.blockhash}`}
                className="hash text-lg bg-gray-800 p-3 rounded hover:bg-gray-700 block transition-colors"
              >
                {tx.blockhash}
              </Link>
            </div>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {tx.confirmations !== undefined && (
              <div>
                <div className="text-gray-400 text-sm mb-1">Confirmations</div>
                <div className="text-lg text-green-400">{tx.confirmations}</div>
              </div>
            )}
            
            {tx.time && (
              <div>
                <div className="text-gray-400 text-sm mb-1">Time</div>
                <div className="text-sm flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {format(new Date(tx.time * 1000), 'PPpp')}
                </div>
              </div>
            )}
            
            {tx.size && (
              <div>
                <div className="text-gray-400 text-sm mb-1">Size</div>
                <div className="text-lg">{tx.size} bytes</div>
              </div>
            )}
            
            {fee > 0 && (
              <div>
                <div className="text-gray-400 text-sm mb-1">Fee</div>
                <div className="text-lg">{fee.toFixed(8)} MAZA</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inputs and Outputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="card">
          <h3 className="text-lg font-bold mb-4">
            Inputs ({tx.vin?.length || 0})
          </h3>
          
          {tx.vin && tx.vin.length > 0 ? (
            <>
              <div className="space-y-3 mb-4">
                {tx.vin.map((input, index) => (
                  <div key={index} className="bg-gray-800 p-3 rounded">
                    {input.coinbase || input.isCoinbase ? (
                      <div className="text-sm text-gray-400">Coinbase (Newly Generated Coins)</div>
                    ) : (
                      <>
                        {input.txid && (
                          <Link
                            to={`/tx/${input.txid}`}
                            className="hash text-xs text-maza-blue hover:underline block mb-1"
                          >
                            {input.txid}:{input.vout}
                          </Link>
                        )}
                        {input.value !== undefined && input.value !== null ? (
                          <>
                            <div className="text-lg font-bold">{input.value.toFixed(8)} MAZA</div>
                            {input.address && input.address !== 'Unknown' && (
                              <Link
                                to={`/address/${input.address}`}
                                className="hash text-xs text-maza-blue hover:underline block mt-1"
                              >
                                {input.address}
                              </Link>
                            )}
                          </>
                        ) : input.error ? (
                          <div className="text-xs text-yellow-400">{input.error}</div>
                        ) : (
                          <div className="text-xs text-gray-500">Amount unknown</div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
              {totalInput > 0 && (
                <div className="pt-3 border-t border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Input:</span>
                    <span className="text-xl font-bold text-green-400">{totalInput.toFixed(8)} MAZA</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-gray-400 text-center py-4">No inputs</div>
          )}
        </div>

        {/* Outputs */}
        <div className="card">
          <h3 className="text-lg font-bold mb-4">
            Outputs ({tx.vout?.length || 0})
          </h3>
          
          {tx.vout && tx.vout.length > 0 ? (
            <>
              <div className="space-y-3 mb-4">
                {tx.vout.map((output, index) => (
                  <div key={index} className="bg-gray-800 p-3 rounded">
                    <div className="text-lg font-bold mb-1">{output.value.toFixed(8)} MAZA</div>
                    {output.scriptPubKey?.addresses?.map((address, i) => (
                      <Link
                        key={i}
                        to={`/address/${address}`}
                        className="hash text-xs text-maza-blue hover:underline block"
                      >
                        {address}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
              {totalOutput > 0 && (
                <div className="pt-3 border-t border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Output:</span>
                    <span className="text-xl font-bold text-blue-400">{totalOutput.toFixed(8)} MAZA</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-gray-400 text-center py-4">No outputs</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TransactionDetail;
