import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, MapPin, TrendingUp } from 'lucide-react';

function Header() {
  return (
    <header className="bg-maza-gray shadow-lg border-b border-gray-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <img src="/maza-logo.png" alt="Mazacoin" className="w-8 h-8" />
            <span className="text-2xl font-bold">Mazacoin Explorer</span>
          </Link>
          
          <nav className="flex items-center space-x-6">
            <Link to="/" className="hover:text-maza-blue transition-colors">
              Home
            </Link>
            <Link to="/stats" className="hover:text-maza-blue transition-colors flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Network Stats
            </Link>
            <Link to="/nodes" className="hover:text-maza-blue transition-colors flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Node Map
            </Link>
            <Link to="/richlist" className="hover:text-maza-blue transition-colors flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Rich List
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;
