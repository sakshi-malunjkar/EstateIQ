import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { NASHIK_PROPERTIES, PUNE_PROPERTIES } from '../data/properties';
import { Search, Filter, MapPin, Building, ShieldCheck, Heart, SlidersHorizontal } from 'lucide-react';

export default function PropertiesPage({ selectedCity, setSelectedCity, onContactClick }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const cityParam = searchParams.get('city') || selectedCity;
  const queryParam = searchParams.get('query') || '';
  const localityParam = searchParams.get('locality') || '';

  const [activeCity, setActiveCity] = useState(cityParam);
  const [searchTerm, setSearchTerm] = useState(queryParam);
  const [selectedBhk, setSelectedBhk] = useState('ALL');
  const [maxPrice, setMaxPrice] = useState(200);

  useEffect(() => {
    if (cityParam) setActiveCity(cityParam);
  }, [cityParam]);

  const allProps = [...NASHIK_PROPERTIES, ...PUNE_PROPERTIES];

  const filteredProperties = allProps.filter((p) => {
    // City match
    if (activeCity && p.city.toLowerCase() !== activeCity.toLowerCase()) return false;
    
    // BHK match
    if (selectedBhk !== 'ALL') {
      if (!p.bhk.includes(selectedBhk)) return false;
    }

    // Price match (priceMin)
    if (p.priceMin && p.priceMin > maxPrice) return false;

    // Search query match
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchLoc = p.location.toLowerCase().includes(q);
      const matchBld = p.builder.toLowerCase().includes(q);
      if (!matchTitle && !matchLoc && !matchBld) return false;
    }

    // Locality match
    if (localityParam) {
      if (!p.location.toLowerCase().includes(localityParam.toLowerCase())) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Header & Filter Controls */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                Properties in {activeCity}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">
                Showing {filteredProperties.length} verified listings
              </p>
            </div>

            {/* City Switcher Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl w-max">
              <button
                onClick={() => { setActiveCity('Nashik'); setSelectedCity('Nashik'); }}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition ${
                  activeCity === 'Nashik' ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Nashik Properties
              </button>
              <button
                onClick={() => { setActiveCity('Pune'); setSelectedCity('Pune'); }}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition ${
                  activeCity === 'Pune' ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Pune Properties
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search project or builder..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* BHK Filter */}
            <div>
              <select
                value={selectedBhk}
                onChange={(e) => setSelectedBhk(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Configurations (BHK)</option>
                <option value="1">1 BHK</option>
                <option value="2">2 BHK</option>
                <option value="3">3 BHK</option>
                <option value="4">4+ BHK</option>
              </select>
            </div>

            {/* Max Price Range Slider */}
            <div>
              <div className="flex justify-between text-[11px] font-bold text-gray-600 mb-1">
                <span>Max Price:</span>
                <span className="text-indigo-600">Up to ₹{maxPrice} Lakhs</span>
              </div>
              <input
                type="range"
                min="20"
                max="200"
                step="5"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Reset Filters */}
            <div className="flex items-end">
              <button
                onClick={() => { setSearchTerm(''); setSelectedBhk('ALL'); setMaxPrice(200); }}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Property Grid */}
        {filteredProperties.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm my-8">
            <Building className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-800">No properties match your current filter criteria</h3>
            <p className="text-xs text-gray-500 mt-1">Try resetting your search query or price limit slider.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((prop) => (
              <div
                key={prop.id}
                className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl transition duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Image */}
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={prop.image}
                      alt={prop.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-indigo-900/80 backdrop-blur-md text-white text-[10px] font-black uppercase px-2.5 py-1 rounded">
                      {prop.status}
                    </div>
                    <button className="absolute top-3 right-3 p-2 bg-white/80 hover:bg-white rounded-full text-gray-600 hover:text-rose-500 transition shadow">
                      <Heart className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded">
                      {prop.bhk}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5">
                    <div className="text-xs font-bold text-indigo-600 mb-1">{prop.builder}</div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {prop.title}
                    </h3>
                    
                    <div className="flex items-center text-xs text-gray-500 mt-1 mb-4">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 mr-1 shrink-0" />
                      <span>{prop.location}</span>
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2 mb-4 leading-relaxed">
                      {prop.description}
                    </p>

                    <div className="flex items-baseline justify-between border-t border-gray-100 pt-3">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">PRICE RANGE</span>
                        <span className="text-xl font-black text-gray-900">{prop.price}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">AREA</span>
                        <span className="text-xs font-bold text-gray-700">{prop.area}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-5 pt-0 flex gap-2">
                  <button
                    onClick={() => onContactClick(prop)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition shadow-sm"
                  >
                    Contact Builder
                  </button>
                  <button
                    onClick={() => navigate(`/property/${prop.id}`)}
                    className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
