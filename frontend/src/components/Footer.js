import React from 'react';

function Footer() {
  return (
    <footer className="bg-maza-gray border-t border-gray-700 py-6 mt-12">
      <div className="container mx-auto px-4">
        <div className="text-center text-gray-400 mb-4">
          <p>Mazacoin Explorer &copy; 2026 | Built for the Mazacoin community</p>
          <p className="text-sm mt-2">
            <a href="https://mazacoin.org" target="_blank" rel="noopener noreferrer" className="hover:text-maza-blue">
              mazacoin.org
            </a>
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 text-gray-400 text-sm">
          <span>Provided by</span>
          <img 
            src="/samiahmed77777-logo.png" 
            alt="samiahmed77777" 
            className="h-8"
          />
        </div>
      </div>
    </footer>
  );
}

export default Footer;
