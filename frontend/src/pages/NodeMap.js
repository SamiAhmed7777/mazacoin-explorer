import React, { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { MapPin, Globe } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

// World map TopoJSON URL
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

function NodeMap() {
  const [nodes, setNodes] = useState([]);
  const [geoNodes, setGeoNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, countries: {} });
  const [price, setPrice] = useState(null);

  useEffect(() => {
    fetchNodes();
    fetchPrice();
    const interval = setInterval(() => {
      fetchNodes();
      fetchPrice();
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const fetchPrice = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/price`);
      setPrice(response.data);
    } catch (error) {
      console.error('Error fetching price:', error);
    }
  };

  const fetchNodes = async () => {
    try {
      // Fetch nodes with geolocation from backend API
      const response = await axios.get(`${API_URL}/api/nodes`);
      const data = response.data;
      
      setNodes(data.nodes || []);
      setGeoNodes(data.nodes || []);
      setStats({
        total: data.total || 0,
        active: data.active || 0,
        countries: data.countries || {}
      });
    } catch (error) {
      console.error('Error fetching nodes:', error);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MapPin className="w-8 h-8 text-maza-blue" />
          Live Node Map
        </h1>
        <div className="text-sm text-gray-400">
          Showing all nodes discovered in the last 24 hours
        </div>
      </div>

      {/* Stats */}
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
          </div>
        )}
        
        <div className="stat-card">
          <div className="text-gray-400 text-sm mb-1">Nodes (24h)</div>
          <div className="text-3xl font-bold text-yellow-400">{stats.total}</div>
          <div className="text-sm text-gray-400 mt-1">
            <span className="text-yellow-400 font-semibold">{stats.active} active</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="text-gray-400 text-sm mb-1">Mapped Nodes</div>
          <div className="text-3xl font-bold text-maza-blue">{geoNodes.length}</div>
        </div>
        
        <div className="stat-card">
          <div className="text-gray-400 text-sm mb-1">IP Protocol</div>
          <div className="text-sm">
            <div className="text-lg font-bold text-blue-400">
              IPv4: {geoNodes.filter(n => n.ipVersion === 4).length}
            </div>
            <div className="text-lg font-bold text-purple-400">
              IPv6: {geoNodes.filter(n => n.ipVersion === 6).length}
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="text-gray-400 text-sm mb-1">Countries</div>
          <div className="text-3xl font-bold">{Object.keys(stats.countries).length}</div>
        </div>
      </div>

      {/* Legend */}
      <div className="card bg-gray-800/50 border border-gray-700">
        <div className="flex items-center justify-center gap-8 py-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-400 shadow-lg" style={{ filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.8))' }}></div>
            <span className="text-sm font-medium">Active Now ({geoNodes.filter(n => n.isActive).length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-500 opacity-60"></div>
            <span className="text-sm font-medium text-gray-400">Seen in Last 24h ({geoNodes.filter(n => !n.isActive).length})</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="card">
        <div className="h-[600px] rounded-lg overflow-hidden bg-gray-900">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 147
            }}
            style={{ width: "100%", height: "100%" }}
          >
            <ZoomableGroup>
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#1f2937"
                      stroke="#374151"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { fill: "#2d3748", outline: "none" },
                        pressed: { outline: "none" },
                      }}
                    />
                  ))
                }
              </Geographies>
              
              {geoNodes.map((node, index) => {
                const isActive = node.isActive;
                const markerColor = isActive ? '#fbbf24' : '#6b7280'; // yellow for active, gray for inactive
                const glowColor = isActive ? 'rgba(251, 191, 36, 0.8)' : 'rgba(107, 114, 128, 0.4)';
                
                return (
                  <Marker key={index} coordinates={[node.lon, node.lat]}>
                    <g>
                      <circle 
                        r={6} 
                        fill={markerColor}
                        stroke={isActive ? '#f59e0b' : '#4b5563'}
                        strokeWidth={2}
                        style={{
                          cursor: "pointer",
                          filter: `drop-shadow(0 0 8px ${glowColor})`
                        }}
                      />
                      <circle 
                        r={12} 
                        fill={markerColor}
                        fillOpacity={0.2}
                        stroke="none"
                        style={{ pointerEvents: "none" }}
                      />
                    </g>
                    <title>
                      {isActive ? '🟡 ACTIVE' : '⚪ Seen in last 24h'}
                      {'\n'}{node.city}, {node.country}
                      {'\n'}IP: {node.ip || node.addr?.split(':')[0]} (IPv{node.ipVersion || '4'})
                      {node.subver ? `\nClient: ${node.subver}` : ''}
                      {node.firstSeen ? `\nFirst seen: ${new Date(node.firstSeen).toLocaleString()}` : ''}
                      {node.lastSeen ? `\nLast seen: ${new Date(node.lastSeen).toLocaleString()}` : ''}
                    </title>
                  </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>
        </div>
        
        {geoNodes.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <p>No nodes could be geolocated yet.</p>
            <p className="text-sm mt-2">Geolocation is in progress...</p>
          </div>
        )}
      </div>

      {/* Country Distribution */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Globe className="w-6 h-6" />
          Node Distribution by Country
        </h2>
        
        {Object.keys(stats.countries).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.countries)
              .sort(([, a], [, b]) => b - a)
              .map(([country, count]) => (
                <div key={country} className="bg-gray-800 p-3 rounded">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{country}</div>
                    <div className="text-maza-blue font-bold">{count}</div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-gray-400 text-center py-8">
            No country data available yet.
          </div>
        )}
      </div>
    </div>
  );
}

export default NodeMap;
