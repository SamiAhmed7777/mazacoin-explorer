import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

function SearchBar() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`${API_URL}/api/search/${query.trim()}`);
      const { type, data } = response.data;

      if (type === 'block') {
        navigate(`/block/${data.hash}`);
      } else if (type === 'transaction') {
        navigate(`/tx/${data.txid}`);
      } else if (type === 'address') {
        navigate(`/address/${data.address}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Not found. Try a block height, block hash, transaction ID, or address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by block height, hash, transaction ID, or address..."
          className="input pr-12"
          disabled={loading}
        />
        <button
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-maza-blue transition-colors"
          disabled={loading}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-maza-blue"></div>
          ) : (
            <Search className="w-6 h-6" />
          )}
        </button>
      </form>
      
      {error && (
        <div className="error mt-4">
          {error}
        </div>
      )}
    </div>
  );
}

export default SearchBar;
