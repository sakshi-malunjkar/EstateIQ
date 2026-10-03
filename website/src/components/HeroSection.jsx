import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Sparkles } from 'lucide-react';
import { POPULAR_LOCALITIES } from '../data/properties';

export default function HeroSection({ selectedCity, onSelectLocality, onOpenPostProperty }) {
  const [activeTab, setActiveTab] = useState('BUY');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const tabs = ['BUY', 'RENT', 'COMMERCIAL', 'PG/CO-LIVING', 'PLOTS'];
  const localities = POPULAR_LOCALITIES[selectedCity] || [];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(`/properties?city=${selectedCity}&query=${encodeURIComponent(searchQuery)}&tab=${activeTab}`);
  };

  return (
    <div className="relative bg-gradient-to-b from-[#131836] via-[#1a1945] to-[#251f5c] text-white pt-8 pb-12 overflow-hidden">
      
      {/* Decorative Fireworks & Stars Background overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-10 left-10 w-48 h-48 bg-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-20 right-16 w-64 h-64 bg-indigo-500/30 rounded-full blur-3xl animate-pulse"></div>
        {/* Hanging Lanterns decoration simulation */}
        <div className="absolute top-0 left-1/4 transform -translate-x-1/2 flex flex-col items-center">
          <div className="w-0.5 h-16 bg-gradient-to-b from-yellow-300 to-amber-500"></div>
          <div className="w-6 h-8 bg-gradient-to-r from-amber-400 to-rose-500 rounded-lg shadow-lg rotate-45 border border-yellow-200"></div>
        </div>
        <div className="absolute top-0 right-1/4 transform translate-x-1/2 flex flex-col items-center">
          <div className="w-0.5 h-20 bg-gradient-to-b from-yellow-300 to-amber-500"></div>
          <div className="w-6 h-8 bg-gradient-to-r from-rose-400 to-purple-500 rounded-lg shadow-lg rotate-45 border border-yellow-200"></div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10 flex flex-col items-center text-center">
        
        {/* Arch Frame Banner */}
        <div className="w-full max-w-3xl bg-gradient-to-b from-purple-900/60 to-indigo-900/80 border border-purple-400/30 rounded-t-[100px] sm:rounded-t-[140px] pt-8 pb-6 px-6 sm:px-12 backdrop-blur-md shadow-2xl relative">
          
          {/* Top UTSAV Tag */}
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 text-white font-extrabold text-xs sm:text-sm px-4 py-1.5 rounded-full shadow-lg border border-yellow-300/40 mb-3 animate-bounce">
            <Sparkles className="w-4 h-4 text-yellow-200 fill-yellow-300" />
            <span className="tracking-wide uppercase">MEGA HOME UTSAV</span>
          </div>
          
          <div className="text-xs text-purple-200 font-medium tracking-wider mb-2">
            1st Oct - 31st Oct 2026
          </div>

          <a href="#top-picks" className="inline-flex items-center text-xs font-semibold text-yellow-300 hover:underline mb-4">
            <span>Explore now</span>
            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </a>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
            Properties to buy in <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-100 to-white">{selectedCity}</span>
          </h1>
          
          <p className="text-xs sm:text-sm text-purple-200 font-medium">
            <span className="text-white font-bold">6K+</span> listings added daily and <span className="text-white font-bold">77K+</span> total verified
          </p>
        </div>

        {/* Search Bar Container */}
        <div className="w-full max-w-3xl bg-[#171b3d] rounded-2xl shadow-2xl overflow-hidden border border-purple-500/20 -mt-2">
          
          {/* Navigation Tabs */}
          <div className="flex border-b border-white/10 bg-[#121530]">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-xs sm:text-sm font-bold tracking-wide transition relative ${
                  activeTab === tab
                    ? 'text-white bg-[#171b3d]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-yellow-400 rounded-full"></span>
                )}
              </button>
            ))}
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="p-3 sm:p-4 bg-white flex items-center">
            <div className="relative flex-1 flex items-center">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for locality, landmark, project, or builder"
                className="w-full pl-10 pr-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 rounded-lg font-medium"
              />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-3 rounded-lg shadow-md hover:shadow-indigo-500/30 transition duration-150 flex items-center space-x-1"
            >
              <span>Search</span>
            </button>
          </form>

        </div>

        {/* Popular Localities Pills */}
        <div className="w-full max-w-3xl mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-semibold text-gray-300 mr-1 flex items-center">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-yellow-400" />
            Popular Localities:
          </span>
          {localities.map((loc) => (
            <button
              key={loc.name}
              onClick={() => {
                if (onSelectLocality) onSelectLocality(loc.name);
                navigate(`/properties?city=${selectedCity}&locality=${encodeURIComponent(loc.name)}`);
              }}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/15 transition flex items-center space-x-1"
            >
              <span>{loc.name}</span>
              <ChevronRight className="w-3 h-3 text-purple-300" />
            </button>
          ))}
        </div>

        {/* Owner CTA Banner */}
        <div className="mt-8">
          <button
            onClick={onOpenPostProperty}
            className="inline-flex items-center space-x-2 bg-[#121530]/90 hover:bg-[#121530] border border-white/20 text-xs sm:text-sm font-semibold text-gray-200 hover:text-white px-5 py-2 rounded-full shadow-lg transition duration-200"
          >
            <span>Are you a Property Owner?</span>
            <span className="text-yellow-400 font-bold underline hover:text-yellow-300">
              Sell / Rent for FREE &gt;
            </span>
          </button>
        </div>

      </div>
    </div>
  );
}
