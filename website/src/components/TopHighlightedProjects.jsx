import React from 'react';
import { useNavigate } from 'react-router-dom';
import { NASHIK_PROPERTIES, PUNE_PROPERTIES } from '../data/properties';
import { MapPin, Building2, ArrowRight } from 'lucide-react';

export default function TopHighlightedProjects({ selectedCity }) {
  const navigate = useNavigate();
  const properties = selectedCity === 'Nashik'
    ? NASHIK_PROPERTIES.filter(p => p.highlighted)
    : PUNE_PROPERTIES.filter(p => p.highlighted);

  if (!properties || properties.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Top highlighted projects
        </h2>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Noteworthy projects to watch in {selectedCity}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {properties.map((prop) => (
          <div
            key={prop.id}
            onClick={() => navigate(`/property/${prop.id}`)}
            className="group relative rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition duration-300 cursor-pointer h-72 sm:h-80 border border-gray-100"
          >
            {/* Background Image */}
            <img
              src={prop.image}
              alt={prop.title}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
            />

            {/* Dark Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-between p-6 text-white">
              
              {/* Top Builder badge */}
              <div className="flex justify-between items-start">
                <span className="bg-black/50 backdrop-blur-md text-[11px] font-bold text-gray-200 px-3 py-1 rounded-full border border-white/20">
                  {prop.status}
                </span>
                <span className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200">
                  <ArrowRight className="w-4 h-4 text-white" />
                </span>
              </div>

              {/* Bottom Content Info */}
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-yellow-300 transition-colors">
                  {prop.title}
                </h3>
                
                <p className="text-xs text-gray-300 font-medium mb-3">
                  by <span className="font-semibold text-white">{prop.builder}</span>
                </p>

                <div className="flex items-end justify-between border-t border-white/20 pt-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-200">{prop.bhk}</div>
                    <div className="text-xs text-gray-300 flex items-center mt-0.5">
                      <MapPin className="w-3 h-3 text-yellow-400 mr-1" />
                      <span>{prop.location}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-lg sm:text-xl font-black text-yellow-400">
                      {prop.price}
                    </span>
                  </div>
                </div>

              </div>

            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
