import React from 'react';
import HeroSection from '../components/HeroSection';
import HotspotsNearby from '../components/HotspotsNearby';
import TopPicks from '../components/TopPicks';
import TopHighlightedProjects from '../components/TopHighlightedProjects';
import FeaturedDevelopers from '../components/FeaturedDevelopers';
import CityPropertySections from '../components/CityPropertySections';

export default function HomePage({ selectedCity, setSelectedCity, onContactClick, onOpenPostProperty, onOpenCityModal }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      {/* Hero Banner Section (Screenshot 1) */}
      <HeroSection
        selectedCity={selectedCity}
        onOpenPostProperty={onOpenPostProperty}
      />

      {/* Hotspots Nearby Section (Screenshot 2) */}
      <HotspotsNearby
        selectedCity={selectedCity}
      />

      {/* Top Picks Section (Screenshot 2 & 3) */}
      <TopPicks
        selectedCity={selectedCity}
        onContactClick={onContactClick}
      />

      {/* Top Highlighted Projects (Screenshot 3) */}
      <TopHighlightedProjects
        selectedCity={selectedCity}
      />

      {/* Featured Developers (Screenshot 4) */}
      <FeaturedDevelopers
        selectedCity={selectedCity}
      />

      {/* Dual City Property Sections: Nashik First, Pune Second */}
      <CityPropertySections
        onContactClick={onContactClick}
      />

    </div>
  );
}
