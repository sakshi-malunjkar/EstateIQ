import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Pause, Play, CheckCircle2 } from 'lucide-react';
import { NASHIK_PROPERTIES, PUNE_PROPERTIES } from '../data/properties';

export default function TopPicks({ selectedCity, onContactClick }) {
  const navigate = useNavigate();
  const properties = selectedCity === 'Nashik' 
    ? NASHIK_PROPERTIES.filter(p => p.topPick) 
    : PUNE_PROPERTIES.filter(p => p.topPick);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  if (!properties || properties.length === 0) return null;

  const currentProperty = properties[currentIndex] || properties[0];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? properties.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === properties.length - 1 ? 0 : prev + 1));
  };

  return (
    <section id="top-picks" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header & Thumbnail Tabs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            EstateIQ's top picks in {selectedCity}
          </h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Explore top living options with us
          </p>
        </div>

        {/* Thumbnail Selectors */}
        <div className="flex items-center space-x-3 mt-4 md:mt-0 overflow-x-auto pb-2 no-scrollbar">
          {properties.map((prop, idx) => (
            <button
              key={prop.id}
              onClick={() => setCurrentIndex(idx)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-left transition min-w-[140px] shrink-0 ${
                currentIndex === idx
                  ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 shadow-sm ring-2 ring-indigo-500/20'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <img
                src={prop.image}
                alt={prop.title}
                className="w-10 h-10 rounded-md object-cover"
              />
              <div className="overflow-hidden">
                <div className="text-xs font-bold truncate">{prop.title}</div>
                <div className="text-[10px] text-gray-500 truncate">{prop.builder}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Showcase Card */}
      <div className="relative group">
        
        {/* Navigation Arrows */}
        <button
          onClick={handlePrev}
          className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white shadow-xl border border-gray-200 flex items-center justify-center text-gray-700 hover:text-indigo-600 hover:scale-105 transition"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={handleNext}
          className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white shadow-xl border border-gray-200 flex items-center justify-center text-gray-700 hover:text-indigo-600 hover:scale-105 transition"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Card Body */}
        <div className="bg-gradient-to-r from-purple-100 via-indigo-50 to-pink-100 rounded-3xl overflow-hidden shadow-lg border border-purple-200/60 grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left Panel */}
          <div className="lg:col-span-4 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              {/* Builder Info */}
              <div className="flex items-center space-x-3 mb-6">
                <img
                  src={currentProperty.builderLogo}
                  alt={currentProperty.builder}
                  className="w-12 h-12 rounded-lg object-cover border border-purple-200 shadow-sm"
                />
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{currentProperty.builder}</h4>
                  <button 
                    onClick={() => navigate(`/properties?builder=${encodeURIComponent(currentProperty.builder)}`)}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    View Projects
                  </button>
                </div>
              </div>

              {/* Title & Location */}
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-1">
                {currentProperty.title}
              </h3>
              <p className="text-xs text-gray-600 font-medium mb-4 flex items-center">
                <span>{currentProperty.location}</span>
              </p>

              {/* Price & Configuration */}
              <div className="my-4">
                <div className="text-xl sm:text-2xl font-black text-indigo-950">
                  {currentProperty.price}
                </div>
                <div className="text-xs font-bold text-gray-600 mt-1">
                  {currentProperty.bhk}
                </div>
              </div>

              {/* Features snippet */}
              <div className="flex flex-wrap gap-2 my-4">
                {currentProperty.amenities.slice(0, 3).map((am) => (
                  <span key={am} className="inline-flex items-center text-[11px] font-semibold text-indigo-800 bg-white/80 px-2.5 py-1 rounded-md border border-purple-200/50">
                    <CheckCircle2 className="w-3 h-3 text-indigo-600 mr-1" />
                    {am}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => onContactClick(currentProperty)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 px-6 rounded-xl shadow-md hover:shadow-indigo-500/20 transition duration-150"
              >
                Contact
              </button>
              <button
                onClick={() => navigate(`/property/${currentProperty.id}`)}
                className="w-full bg-white hover:bg-gray-50 text-indigo-900 font-bold text-sm py-3 px-6 rounded-xl border border-indigo-200 shadow-sm transition"
              >
                View Details
              </button>
            </div>

          </div>

          {/* Right Panel Image Showcase */}
          <div className="lg:col-span-8 relative min-h-[300px] sm:min-h-[400px]">
            <img
              src={currentProperty.image}
              alt={currentProperty.title}
              className="w-full h-full object-cover"
            />
            
            {/* Top Right Pause/Play Button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md transition"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            {/* Bottom Right Yellow Badge */}
            <div className="absolute bottom-4 right-4 bg-yellow-400 text-gray-950 font-black text-xs uppercase px-3 py-1.5 rounded shadow-lg tracking-wider border border-yellow-200">
              {currentProperty.status}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
