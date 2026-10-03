import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FOOTER_LINKS } from '../data/properties';
import { QrCode, Smartphone, Award, Globe, Share2, Mail, Phone, Tv } from 'lucide-react';

export default function Footer() {
  const [activeTab, setActiveTab] = useState('FOR BUYERS');

  const tabs = ['FOR BUYERS', 'FOR TENANTS', 'PROJECTS', 'POPULAR CITIES', 'POPULAR SEARCHES'];

  const getActiveLinks = () => {
    switch (activeTab) {
      case 'FOR TENANTS': return FOOTER_LINKS.forTenants;
      case 'PROJECTS': return FOOTER_LINKS.projects;
      case 'POPULAR CITIES': return FOOTER_LINKS.popularCities;
      case 'POPULAR SEARCHES': return FOOTER_LINKS.popularSearches;
      default: return FOOTER_LINKS.forBuyers;
    }
  };

  return (
    <footer className="bg-[#121422] text-gray-300 font-sans border-t border-gray-800">
      
      {/* Top Categorized Navigation Tabs */}
      <div className="bg-[#1a1d2e] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto no-scrollbar space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 text-xs font-bold tracking-wider transition whitespace-nowrap relative ${
                  activeTab === tab
                    ? 'text-white border-b-2 border-indigo-500'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category List Matrix */}
      <div className="bg-[#161828] py-8 border-b border-gray-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h4 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4">
            {activeTab === 'FOR BUYERS' && 'Find flats for sale'}
            {activeTab === 'FOR TENANTS' && 'Find flats for rent'}
            {activeTab === 'PROJECTS' && 'Explore top projects'}
            {activeTab === 'POPULAR CITIES' && 'Top real estate hubs'}
            {activeTab === 'POPULAR SEARCHES' && 'Trending property searches'}
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-y-2.5 gap-x-4 text-xs">
            {getActiveLinks().map((linkText) => (
              <Link
                key={linkText}
                to={`/properties?query=${encodeURIComponent(linkText)}`}
                className="text-gray-400 hover:text-white transition duration-150 truncate"
              >
                {linkText}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Promo Banner */}
          <div className="lg:col-span-5 bg-gradient-to-br from-purple-700 via-indigo-800 to-purple-900 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-purple-500/30">
            <div className="relative z-10">
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-4">
                Come home to <br />
                <span className="text-yellow-300 italic font-serif">Greatness</span>
              </h3>

              <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20">
                <div className="bg-yellow-400 text-gray-900 p-2 rounded-lg font-black text-lg">
                  5<span className="text-xs">th</span>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-yellow-300">RANKED</div>
                  <div className="text-xs font-bold text-white">Best Companies to Work For 2024</div>
                  <div className="text-[10px] text-purple-200">by Great Place to Work®</div>
                </div>
              </div>
            </div>

            {/* Background pattern */}
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
              <Award className="w-56 h-56 text-white" />
            </div>
          </div>

          {/* Middle Nav Columns */}
          <div className="lg:col-span-4 grid grid-cols-3 gap-4">
            <div>
              <h5 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">COMPANY</h5>
              <ul className="space-y-2 text-xs">
                <li><Link to="/about" className="hover:text-white">Careers</Link></li>
                <li><Link to="/about" className="hover:text-white">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-white">For Partners</Link></li>
                <li><a href="#" className="hover:text-white">Terms</a></li>
                <li><a href="#" className="hover:text-white">Annual Return</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><Link to="/contact" className="hover:text-white">Contact Us</Link></li>
                <li><a href="#" className="hover:text-white">Unsubscribe</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">PARTNER SITES</h5>
              <ul className="space-y-2 text-xs">
                <li><a href="#" className="hover:text-white">Aurum Proptech</a></li>
                <li><a href="#" className="hover:text-white">Housing Edge</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">EXPLORE</h5>
              <ul className="space-y-2 text-xs">
                <li><a href="#" className="hover:text-white">News</a></li>
                <li><a href="#" className="hover:text-white">Home Loans</a></li>
                <li><a href="#" className="hover:text-white">Sitemap</a></li>
                <li><Link to="/contact" className="text-yellow-400 font-bold hover:underline">AI Assistant</Link></li>
              </ul>
            </div>
          </div>

          {/* Right Mobile App & Social Section */}
          <div className="lg:col-span-3 space-y-4">
            <h5 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
              EXPERIENCE ESTATEIQ APP ON MOBILE
            </h5>

            {/* App Buttons */}
            <div className="flex gap-2">
              <a href="#" className="bg-[#1f2238] hover:bg-[#282c48] border border-gray-700 rounded-lg p-2 flex items-center space-x-2 transition">
                <Smartphone className="w-5 h-5 text-indigo-400" />
                <div>
                  <div className="text-[9px] text-gray-400">Download on the</div>
                  <div className="text-xs font-bold text-white leading-tight">App Store</div>
                </div>
              </a>
              <a href="#" className="bg-[#1f2238] hover:bg-[#282c48] border border-gray-700 rounded-lg p-2 flex items-center space-x-2 transition">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-[9px] text-gray-400">GET IT ON</div>
                  <div className="text-xs font-bold text-white leading-tight">Google Play</div>
                </div>
              </a>
            </div>

            {/* QR Code Simulation */}
            <div className="bg-[#1a1d30] p-3 rounded-xl border border-gray-800 flex items-center space-x-3">
              <div className="bg-white p-1.5 rounded-lg text-gray-900 shrink-0">
                <QrCode className="w-10 h-10" />
              </div>
              <p className="text-[11px] text-gray-400 leading-snug">
                Open camera & scan the QR code to Download the App
              </p>
            </div>

            {/* Social Links */}
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">FOLLOW US</div>
              <div className="flex space-x-3 text-gray-400">
                {/* Custom SVG icons for social networks */}
                <a href="#" className="hover:text-white transition" title="Facebook">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" className="hover:text-white transition" title="Instagram">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="#" className="hover:text-white transition" title="Twitter">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="#" className="hover:text-white transition" title="LinkedIn">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
                <a href="#" className="hover:text-white transition" title="YouTube">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
              </div>
            </div>

            <div className="text-[10px] text-gray-500 pt-2">
              ©2012-26 Locon Solutions Pvt. Ltd / EstateIQ
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}
