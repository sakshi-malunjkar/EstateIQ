import React from 'react';
import { useNavigate } from 'react-router-dom';
import { NASHIK_PROPERTIES, PUNE_PROPERTIES } from '../data/properties';
import { MapPin, Building, ShieldCheck, ArrowRight, Heart } from 'lucide-react';

export default function CityPropertySections({ onContactClick }) {
  const navigate = useNavigate();

  const PropertyCard = ({ prop }) => (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
      <div>
        {/* Card Image */}
        <div className="relative h-48 sm:h-52 overflow-hidden">
          <img
            src={prop.image}
            alt={prop.title}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
          <div className="absolute top-3 left-3 bg-indigo-900/80 backdrop-blur-md text-white text-[10px] font-black uppercase px-2.5 py-1 rounded shadow">
            {prop.status}
          </div>
          <button className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-md hover:bg-white rounded-full text-gray-600 hover:text-rose-500 transition shadow">
            <Heart className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded">
            {prop.bhk}
          </div>
        </div>

        {/* Card Details */}
        <div className="p-4 sm:p-5">
          <div className="text-xs font-bold text-indigo-600 mb-1">{prop.builder}</div>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
            {prop.title}
          </h3>
          
          <div className="flex items-center text-xs text-gray-500 mt-1 mb-3">
            <MapPin className="w-3.5 h-3.5 text-rose-500 mr-1 shrink-0" />
            <span className="truncate">{prop.location}</span>
          </div>

          <div className="flex items-baseline justify-between border-t border-gray-100 pt-3 mt-2">
            <div>
              <span className="text-xs text-gray-400 block font-medium">Price</span>
              <span className="text-lg font-black text-gray-900">{prop.price}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400 block font-medium">Area</span>
              <span className="text-xs font-bold text-gray-700">{prop.area || '800 sq.ft'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer buttons */}
      <div className="p-4 pt-0 flex gap-2">
        <button
          onClick={() => onContactClick(prop)}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-sm"
        >
          Contact Owner/Builder
        </button>
        <button
          onClick={() => navigate(`/property/${prop.id}`)}
          className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition"
        >
          Details
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-16 py-8">
      
      {/* SECTION 1: NASHIK PROPERTIES (FIRST) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 border-b border-gray-200 pb-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Nashik Listings</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              1. Nashik Properties
            </h2>
            <p className="text-sm text-gray-500 font-medium mt-1">
              Top residential & commercial projects in Gangapur Road, Pathardi Phata, Indira Nagar & Nashik Road
            </p>
          </div>

          <button
            onClick={() => navigate('/properties?city=Nashik')}
            className="mt-4 sm:mt-0 inline-flex items-center text-sm font-bold text-indigo-600 hover:text-indigo-800"
          >
            <span>View All Nashik Properties</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {NASHIK_PROPERTIES.map((prop) => (
            <PropertyCard key={prop.id} prop={prop} />
          ))}
        </div>
      </section>

      {/* SECTION 2: PUNE PROPERTIES (SECOND) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 border-b border-gray-200 pb-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-full mb-2">
              <Building className="w-3.5 h-3.5" />
              <span>Premium Pune Developments</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              2. Pune Properties
            </h2>
            <p className="text-sm text-gray-500 font-medium mt-1">
              Luxury smart homes & townships in Hinjewadi, Wakad, Baner, Kharadi & Hadapsar
            </p>
          </div>

          <button
            onClick={() => navigate('/properties?city=Pune')}
            className="mt-4 sm:mt-0 inline-flex items-center text-sm font-bold text-purple-600 hover:text-purple-800"
          >
            <span>View All Pune Properties</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PUNE_PROPERTIES.map((prop) => (
            <PropertyCard key={prop.id} prop={prop} />
          ))}
        </div>
      </section>

    </div>
  );
}
