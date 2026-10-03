import React from 'react';
import { HOTSPOTS_NEARBY } from '../data/properties';
import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';

export default function HotspotsNearby({ selectedCity }) {
  const hotspots = HOTSPOTS_NEARBY[selectedCity] || HOTSPOTS_NEARBY.Pune;

  if (!hotspots || hotspots.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-gradient-to-r from-gray-50 via-purple-50/40 to-gray-50 rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm">
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Hotspots nearby
            </h2>
            <p className="text-sm text-gray-500 font-medium mt-1">
              New projects. Trusted builders. All in one place.
            </p>
          </div>

          <button className="hidden sm:flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white px-3.5 py-2 rounded-xl border border-gray-200 shadow-sm">
            <span>View All Localities</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Hotspot Cards Slider / Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {hotspots.map((item) => (
            <div
              key={item.name}
              className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between"
            >
              <div>
                <h3 className="font-extrabold text-gray-900 text-base mb-1 truncate">
                  {item.name}
                </h3>
                <p className="text-xs text-gray-500 font-medium mb-4">
                  {item.propertiesCount}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-sm font-black text-gray-900">
                  {item.avgPrice}
                </span>

                <div className={`flex items-center text-xs font-bold px-2 py-0.5 rounded-md ${
                  item.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {item.isPositive ? (
                    <TrendingUp className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
                  )}
                  <span>{item.trend} <span className="text-[10px] text-gray-400 font-normal">(3yrs)</span></span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
