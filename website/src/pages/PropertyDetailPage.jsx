import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NASHIK_PROPERTIES, PUNE_PROPERTIES } from '../data/properties';
import { MapPin, Building, ShieldCheck, CheckCircle2, Phone, Calendar, Calculator, ArrowLeft, Bot } from 'lucide-react';

export default function PropertyDetailPage({ onContactClick }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const allProps = [...NASHIK_PROPERTIES, ...PUNE_PROPERTIES];
  const property = allProps.find((p) => p.id === id) || allProps[0];

  const [activeImage, setActiveImage] = useState(property.image);
  const [loanAmount, setLoanAmount] = useState(40);
  const [loanTenure, setLoanTenure] = useState(20);

  // Simple EMI calculation
  const calculateEmi = () => {
    const principal = loanAmount * 100000;
    const rate = 0.085 / 12; // 8.5% annual
    const n = loanTenure * 12;
    const emi = (principal * rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);
    return Math.round(emi).toLocaleString('en-IN');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-gray-600 hover:text-indigo-600 mb-6 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Listings</span>
        </button>

        {/* Title Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="bg-yellow-400 text-gray-950 font-black text-[10px] uppercase px-2 py-0.5 rounded">
                {property.status}
              </span>
              <span className="text-xs font-semibold text-gray-500">
                RERA Registered Project
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              {property.title}
            </h1>
            
            <p className="text-xs sm:text-sm text-gray-500 font-semibold mt-1 flex items-center">
              <MapPin className="w-4 h-4 text-rose-500 mr-1" />
              <span>{property.location}</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl text-left md:text-right">
              <span className="text-xs font-bold text-gray-500 block">Price Range</span>
              <span className="text-2xl sm:text-3xl font-black text-indigo-950">{property.price}</span>
            </div>
            
            <button
              onClick={() => onContactClick(property)}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-4 rounded-2xl shadow-md transition"
            >
              Contact Builder
            </button>
          </div>
        </div>

        {/* Gallery & Main Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          
          {/* Left Column: Gallery & Amenities */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Gallery Component */}
            <div className="bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-sm p-4">
              <div className="h-80 sm:h-96 rounded-2xl overflow-hidden mb-3">
                <img
                  src={activeImage}
                  alt={property.title}
                  className="w-full h-full object-cover transition-all duration-300"
                />
              </div>

              {property.gallery && property.gallery.length > 0 && (
                <div className="flex gap-3 overflow-x-auto no-scrollbar">
                  {property.gallery.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(imgUrl)}
                      className={`w-24 h-16 rounded-xl overflow-hidden border-2 transition ${
                        activeImage === imgUrl ? 'border-indigo-600 scale-95' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={imgUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Specs & Description */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
              <h3 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-3">
                Overview & Description
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">CONFIGURATION</span>
                  <div className="text-sm font-bold text-gray-900 mt-1">{property.bhk}</div>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">POSSESSION</span>
                  <div className="text-sm font-bold text-gray-900 mt-1">{property.possession || 'Ready to Move'}</div>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">PROPERTY TYPE</span>
                  <div className="text-sm font-bold text-gray-900 mt-1">{property.type}</div>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">SUPER AREA</span>
                  <div className="text-sm font-bold text-gray-900 mt-1">{property.area || '750 sq.ft'}</div>
                </div>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed font-medium">
                {property.description}
              </p>

              {/* Amenities */}
              <div>
                <h4 className="text-base font-bold text-gray-900 mb-3">Key Amenities</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {property.amenities?.map((am) => (
                    <div key={am} className="flex items-center space-x-2 text-xs font-semibold text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{am}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* EMI Calculator */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                <Calculator className="w-4 h-4" />
                <span>Home Loan EMI Calculator</span>
              </div>

              <h3 className="text-xl font-bold text-gray-900">
                Estimate your monthly payment
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Loan Amount: ₹{loanAmount} Lakhs</label>
                  <input
                    type="range"
                    min="10"
                    max="150"
                    step="5"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  
                  <label className="block text-xs font-bold text-gray-600 mb-1 mt-4">Tenure: {loanTenure} Years</label>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="1"
                    value={loanTenure}
                    onChange={(e) => setLoanTenure(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="bg-indigo-900 text-white rounded-2xl p-6 flex flex-col justify-between text-center">
                  <span className="text-xs text-indigo-200 font-bold uppercase">Estimated Monthly EMI</span>
                  <div className="text-3xl font-black text-yellow-300">₹{calculateEmi()} / mo</div>
                  <span className="text-[10px] text-indigo-300">Based on standard 8.5% interest rate</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Builder Card */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm text-center">
              <img
                src={property.builderLogo}
                alt={property.builder}
                className="w-20 h-20 rounded-2xl object-cover mx-auto mb-3 border border-gray-100 shadow-sm"
              />
              <h3 className="text-lg font-extrabold text-gray-900">{property.builder}</h3>
              <p className="text-xs text-gray-500 mt-1">Verified Real Estate Builder</p>

              <button
                onClick={() => onContactClick(property)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl shadow-md transition mt-6"
              >
                Request Callback
              </button>
            </div>

            {/* AI Assistant CTA Box */}
            <div
              onClick={() => navigate('/contact')}
              className="bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-950 text-white p-6 rounded-3xl border border-blue-400/30 shadow-xl cursor-pointer hover:scale-[1.02] transition duration-200"
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">Ask EstateIQ AI Agent</h4>
                  <span className="text-[10px] text-cyan-300 font-semibold">24/7 Voice Assistance</span>
                </div>
              </div>

              <p className="text-xs text-blue-200 leading-relaxed mb-4">
                Have questions about pricing, floor plans or loan eligibility for {property.title}? Speak to our AI Voice Agent now.
              </p>

              <div className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2.5 rounded-xl text-center border border-white/20">
                🎤 Talk to AI Agent &gt;
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
