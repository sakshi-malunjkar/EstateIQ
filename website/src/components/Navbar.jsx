import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Menu, X, Home, Bot, MapPin } from 'lucide-react';

export default function Navbar({ selectedCity, onOpenCityModal, onOpenLogin, onOpenPostProperty }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#131836] text-white shadow-lg font-sans border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left Section: Logo & City Selector */}
        <div className="flex items-center space-x-4 sm:space-x-6">
          <Link to="/" className="flex items-center space-x-1.5 group">
            <div className="bg-yellow-400 p-1.5 rounded text-[#131836] font-bold group-hover:bg-yellow-300 transition-colors">
              <Home className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-white">
              Estate<span className="text-yellow-400 font-black">IQ</span><span className="text-xs text-gray-300 font-medium">.COM</span>
            </span>
          </Link>

          {/* City Selector Button (Opens Screenshot 5 Modal) */}
          <button
            onClick={onOpenCityModal}
            className="flex items-center space-x-1.5 text-xs sm:text-sm font-bold text-gray-200 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg border border-white/10 transition shadow-sm"
          >
            <MapPin className="w-3.5 h-3.5 text-yellow-400" />
            <span>{selectedCity}</span>
            <ChevronDown className="w-4 h-4 text-gray-300" />
          </button>
        </div>

        {/* Center Nav Links (Desktop) */}
        <nav className="hidden lg:flex items-center space-x-6 text-sm font-medium text-gray-200">
          <div className="relative group cursor-pointer py-2">
            <span className="flex items-center space-x-1 hover:text-white transition">
              <span>For Buyers</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-white" />
            </span>
            <div className="absolute left-0 top-full hidden group-hover:block w-48 bg-white text-gray-800 rounded-md shadow-xl py-2 border border-gray-100">
              <Link to="/properties?type=buy" className="block px-4 py-2 hover:bg-indigo-50 text-xs font-semibold">Buy Apartments</Link>
              <Link to="/properties?type=villas" className="block px-4 py-2 hover:bg-indigo-50 text-xs font-semibold">Independent Villas</Link>
              <Link to="/properties?type=plots" className="block px-4 py-2 hover:bg-indigo-50 text-xs font-semibold">Plots / Land</Link>
            </div>
          </div>

          <div className="relative group cursor-pointer py-2">
            <span className="flex items-center space-x-1 hover:text-white transition">
              <span>For Tenants</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-white" />
            </span>
            <div className="absolute left-0 top-full hidden group-hover:block w-48 bg-white text-gray-800 rounded-md shadow-xl py-2 border border-gray-100">
              <Link to="/properties?type=rent" className="block px-4 py-2 hover:bg-indigo-50 text-xs font-semibold">Rental Homes</Link>
              <Link to="/properties?type=pg" className="block px-4 py-2 hover:bg-indigo-50 text-xs font-semibold">PG / Co-Living</Link>
            </div>
          </div>

          <div className="relative group cursor-pointer py-2">
            <span className="flex items-center space-x-1 hover:text-white transition">
              <span>For Sellers</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-white" />
            </span>
          </div>

          <div className="relative group cursor-pointer py-2">
            <span className="flex items-center space-x-1 hover:text-white transition">
              <span>Services</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-white" />
            </span>
          </div>

          <div className="relative group cursor-pointer py-2">
            <span className="flex items-center space-x-1 hover:text-white transition">
              <span>News & Guide</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-white" />
            </span>
          </div>
        </nav>

        {/* Right Section Actions */}
        <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
          <Link
            to="/contact"
            className="flex items-center space-x-1.5 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-3.5 py-1.5 rounded-full shadow-md hover:shadow-indigo-500/20 transition duration-200"
          >
            <Bot className="w-4 h-4 animate-bounce text-yellow-300" />
            <span>AI Voice Agent</span>
          </Link>

          <span className="text-xs font-semibold text-gray-300 hover:text-white cursor-pointer hidden xl:inline">
            Download App
          </span>

          <button
            onClick={onOpenPostProperty}
            className="flex items-center space-x-1 text-xs font-bold text-white hover:opacity-90 transition"
          >
            <span>Post Property</span>
            <span className="bg-rose-500 text-[10px] font-black uppercase px-1.5 py-0.5 rounded text-white">
              FREE
            </span>
          </button>

          <button
            onClick={onOpenLogin}
            className="flex items-center space-x-2 bg-white text-gray-900 hover:bg-gray-100 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition"
          >
            <span>Login</span>
            <Menu className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center space-x-2">
          <Link
            to="/contact"
            className="flex items-center space-x-1 text-xs font-bold bg-indigo-600 text-white px-2.5 py-1.5 rounded-md"
          >
            <Bot className="w-3.5 h-3.5 text-yellow-300" />
            <span>AI</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-gray-300 hover:text-white rounded-md"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#181d3d] border-t border-white/10 px-4 pt-3 pb-6 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="text-xs text-gray-400 uppercase font-semibold">City: {selectedCity}</span>
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenCityModal(); }}
              className="text-xs px-2.5 py-1 rounded font-bold bg-yellow-400 text-gray-900"
            >
              Change City
            </button>
          </div>
          <Link to="/" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold hover:text-yellow-400">Home</Link>
          <Link to="/properties" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold hover:text-yellow-400">Search Properties</Link>
          <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold text-yellow-300 flex items-center justify-between">
            <span>Talk to AI Voice Agent</span>
            <Bot className="w-4 h-4" />
          </Link>
          <button onClick={() => { setMobileMenuOpen(false); onOpenPostProperty(); }} className="w-full text-left text-sm font-semibold text-rose-300">
            Post Property FREE
          </button>
          <button onClick={() => { setMobileMenuOpen(false); onOpenLogin(); }} className="w-full bg-white text-gray-900 text-center py-2 rounded-md font-bold text-sm">
            Login / Signup
          </button>
        </div>
      )}
    </header>
  );
}
