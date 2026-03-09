import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import BlockDetail from './pages/BlockDetail';
import TransactionDetail from './pages/TransactionDetail';
import AddressDetail from './pages/AddressDetail';
import NetworkStats from './pages/NetworkStats';
import NodeMap from './pages/NodeMap';
import RichList from './pages/RichList';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-maza-dark text-gray-100 flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/block/:hashOrHeight" element={<BlockDetail />} />
            <Route path="/tx/:txid" element={<TransactionDetail />} />
            <Route path="/address/:address" element={<AddressDetail />} />
            <Route path="/stats" element={<NetworkStats />} />
            <Route path="/nodes" element={<NodeMap />} />
            <Route path="/richlist" element={<RichList />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
