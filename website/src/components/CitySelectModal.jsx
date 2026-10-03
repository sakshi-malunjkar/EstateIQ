import React, { useState } from 'react';
import { Search, X, MapPin, Check } from 'lucide-react';

export default function CitySelectModal({ isOpen, onClose, selectedCity, onSelectCity }) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const popularCities = [
    { name: 'Pune', icon: '🏙️' },
    { name: 'Nashik', icon: '⛰️' },
    { name: 'Mumbai', icon: '🌊' },
    { name: 'Bengaluru', icon: '🌳' },
    { name: 'Chennai', icon: '🏖️' },
    { name: 'Kolkata', icon: '🌉' },
    { name: 'Ahmedabad', icon: '🏛️' },
    { name: 'Delhi', icon: '🏛️' },
    { name: 'Noida', icon: '🏢' },
    { name: 'Gurgaon', icon: '🌇' },
    { name: 'Hyderabad', icon: '🏰' },
    { name: 'Thane', icon: '🌲' },
    { name: 'Navi Mumbai', icon: '⛴️' }
  ];

  const filteredCities = popularCities.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCityPick = (cityName) => {
    onSelectCity(cityName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 mt-12 sm:mt-0">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-black text-gray-900">Select City</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* City Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search for city"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Popular Cities Grid */}
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Popular cities
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredCities.map((city) => {
                const isSelected = selectedCity === city.name;

                return (
                  <button
                    key={city.name}
                    onClick={() => handleCityPick(city.name)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left font-bold text-xs transition ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 ring-2 ring-indigo-500/20'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/30'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-base">{city.icon}</span>
                      <span>{city.name}</span>
                    </div>

                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Subtext */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-xs font-bold text-gray-500">
            <div className="flex space-x-3">
              <span className="text-indigo-600 underline cursor-pointer">All India</span>
              <span>|</span>
              <span className="hover:text-gray-800 cursor-pointer">International</span>
            </div>
            <button className="text-indigo-600 hover:underline">
              View all cities &gt;
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
