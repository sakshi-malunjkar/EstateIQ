import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FEATURED_DEVELOPERS } from '../data/properties';
import { Building, Award, MapPin } from 'lucide-react';

export default function FeaturedDevelopers({ selectedCity }) {
  const navigate = useNavigate();
  const developers = FEATURED_DEVELOPERS[selectedCity] || FEATURED_DEVELOPERS.Nashik;
  const [activeProjectTab, setActiveProjectTab] = useState({});

  const getActiveIndex = (devId) => activeProjectTab[devId] || 0;

  const handleTabClick = (devId, index) => {
    setActiveProjectTab((prev) => ({ ...prev, [devId]: index }));
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Featured Developers
        </h2>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Prominent real-estate builders in {selectedCity}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {developers.map((dev) => {
          const activeProjIdx = getActiveIndex(dev.id);
          const currentProj = dev.projects[activeProjIdx] || dev.projects[0];

          return (
            <div
              key={dev.id}
              className="bg-white rounded-2xl border-t-4 border-indigo-600 border-x border-b border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 p-5 flex flex-col justify-between"
            >
              <div>
                {/* Header Info */}
                <div className="flex items-start space-x-3 mb-4">
                  <img
                    src={dev.logo}
                    alt={dev.name}
                    className="w-14 h-14 rounded-lg object-cover border border-gray-100 shadow-sm"
                  />
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-base leading-snug">
                      {dev.name}
                    </h3>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                      <div>
                        <span className="font-bold text-gray-900">{dev.established}</span>
                        <span className="block text-[10px] text-gray-400">Year estd.</span>
                      </div>
                      <div className="h-6 w-px bg-gray-200"></div>
                      <div>
                        <span className="font-bold text-gray-900">{dev.projectsCount}</span>
                        <span className="block text-[10px] text-gray-400">Projects</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Bio text */}
                <p className="text-xs text-gray-600 line-clamp-3 mb-4 leading-relaxed">
                  {dev.bio}
                </p>

                {/* Project Tabs */}
                <div className="flex items-center space-x-2 border-b border-gray-200 mb-4 overflow-x-auto no-scrollbar">
                  {dev.projects.map((proj, pIdx) => (
                    <button
                      key={proj.name}
                      onClick={() => handleTabClick(dev.id, pIdx)}
                      className={`text-xs font-bold pb-2 border-b-2 transition whitespace-nowrap ${
                        activeProjIdx === pIdx
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {proj.name}
                    </button>
                  ))}
                </div>

                {/* Active Project Card Preview */}
                {currentProj && (
                  <div
                    onClick={() => navigate(`/properties?query=${encodeURIComponent(currentProj.name)}`)}
                    className="group relative rounded-xl overflow-hidden cursor-pointer shadow-sm border border-gray-200 h-44"
                  >
                    <img
                      src={currentProj.image}
                      alt={currentProj.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 flex flex-col justify-between">
                      <div className="text-[10px] bg-black/60 text-white px-2 py-0.5 rounded w-max backdrop-blur-sm">
                        Featured Project
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white group-hover:text-yellow-300 transition-colors">
                          {currentProj.name}
                        </h4>
                        <div className="text-[11px] text-gray-300 flex items-center mt-0.5">
                          <MapPin className="w-3 h-3 text-yellow-400 mr-1" />
                          <span>{currentProj.location}</span>
                        </div>
                        <div className="text-sm font-black text-yellow-400 mt-1">
                          {currentProj.price}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </section>
  );
}
