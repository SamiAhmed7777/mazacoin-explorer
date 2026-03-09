import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, LogarithmicScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale } from 'chart.js';
import 'chartjs-adapter-date-fns';
import axios from 'axios';

ChartJS.register(CategoryScale, LinearScale, LogarithmicScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale);

const API_URL = process.env.REACT_APP_API_URL || '';

function PriceChart({ currency = 'btc', timeframe = '30d' }) {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTimeframe, setActiveTimeframe] = useState(timeframe);
  const [activeCurrency, setActiveCurrency] = useState(currency);

  useEffect(() => {
    fetchChartData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTimeframe, activeCurrency]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/price/history/${activeTimeframe}`);
      const data = response.data.data;

      if (!data || data.length === 0) {
        setChartData(null);
        setLoading(false);
        return;
      }

      const labels = data.map(d => new Date(d.timestamp * 1000));
      const prices = data.map(d => d[activeCurrency]);

      setChartData({
        labels,
        datasets: [
          {
            label: `MAZA/${activeCurrency.toUpperCase()} Price`,
            data: prices,
            borderColor: activeCurrency === 'btc' ? '#f59e0b' : activeCurrency === 'ltc' ? '#a855f7' : '#3b82f6',
            backgroundColor: activeCurrency === 'btc' ? '#f59e0b33' : activeCurrency === 'ltc' ? '#a855f733' : '#3b82f633',
            tension: 0.4,
            fill: true,
            pointRadius: data.length < 50 ? 4 : 2,
            pointHoverRadius: 6
          }
        ]
      });
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#9ca3af'
        }
      },
      title: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(activeCurrency === 'eth' ? 10 : 8);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: activeTimeframe === '24h' ? 'hour' : activeTimeframe === '7d' ? 'day' : 'month',
          tooltipFormat: 'PPpp',
          displayFormats: {
            hour: 'MMM d, HH:mm',
            day: 'MMM d',
            month: 'MMM yyyy'
          }
        },
        grid: {
          color: '#1f2937'
        },
        ticks: {
          color: '#9ca3af'
        }
      },
      y: {
        type: 'logarithmic',
        grid: {
          color: '#1f2937'
        },
        ticks: {
          color: '#9ca3af',
          callback: function(value) {
            return value.toFixed(activeCurrency === 'eth' ? 10 : 8);
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  const timeframes = [
    { value: '24h', label: '24H' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '1y', label: '1Y' },
    { value: 'all', label: 'ALL' }
  ];

  const currencies = [
    { value: 'btc', label: 'BTC', color: 'text-yellow-400' },
    { value: 'ltc', label: 'LTC', color: 'text-purple-400' },
    { value: 'eth', label: 'ETH', color: 'text-blue-400' }
  ];

  if (loading) {
    return (
      <div className="card">
        <div className="loading">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maza-blue"></div>
        </div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="card">
        <p className="text-gray-400 text-center py-8">Building price history... Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Price Chart</h2>
        <div className="flex gap-4">
          {/* Currency selector */}
          <div className="flex gap-2">
            {currencies.map(curr => (
              <button
                key={curr.value}
                onClick={() => setActiveCurrency(curr.value)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  activeCurrency === curr.value
                    ? `${curr.color} bg-gray-700`
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {curr.label}
              </button>
            ))}
          </div>
          
          {/* Timeframe selector */}
          <div className="flex gap-2">
            {timeframes.map(tf => (
              <button
                key={tf.value}
                onClick={() => setActiveTimeframe(tf.value)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  activeTimeframe === tf.value
                    ? 'bg-maza-blue text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="h-96">
        <Line data={chartData} options={options} />
      </div>
      
      <div className="mt-4 text-sm text-gray-500 text-center">
        Historical data from FreiExchange + CoinGecko. Data collection started March 2026.
      </div>
    </div>
  );
}

export default PriceChart;
