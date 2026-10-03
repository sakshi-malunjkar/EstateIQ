import React, { useState } from 'react';
import { Mic, CheckCircle, Sparkles } from 'lucide-react';
import AiAgentModal from './AiAgentModal';

export default function AiAgentCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* Gradient Blue Background Card */}
      <div className="relative bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-blue-400/30 overflow-hidden my-8">
        
        {/* Background glow effects */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          
          {/* Left Column: Icon & Headings */}
          <div className="flex-1 text-center lg:text-left">
            
            {/* Animated Pulsing Mic Icon */}
            <div className="inline-relative mb-6 inline-block">
              <div className="relative inline-flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-blue-400/30 animate-ping"></div>
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-xl border-2 border-blue-200">
                  <Mic className="w-10 h-10 text-white animate-pulse" />
                </div>
              </div>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
              Talk to Our AI Agent
            </h2>

            <p className="text-sm sm:text-base text-blue-200 font-medium max-w-lg mb-6 leading-relaxed">
              Get instant property recommendations. Available 24/7 in English & Hindi
            </p>

            {/* Checkmarks List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-semibold text-gray-200 mb-8 max-w-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Instant response — no waiting</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Available 24/7, every day</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>English & Hindi support</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Understands your exact requirements</span>
              </div>
            </div>

            {/* Action Button & Note */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-extrabold text-base px-8 py-4 rounded-2xl shadow-xl hover:shadow-cyan-500/25 transition-all duration-200 transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 border border-cyan-300/30"
              >
                <span className="text-xl">🎤</span>
                <span>Start Voice Conversation</span>
              </button>

              <span className="text-xs text-blue-300/80 font-medium flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>Powered by EstateIQ AI</span>
              </span>
            </div>

          </div>

          {/* Right Column: Visual illustration badge */}
          <div className="hidden lg:flex flex-col items-center justify-center p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-center w-72">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/30 flex items-center justify-center mb-3 text-cyan-300">
              <Mic className="w-8 h-8" />
            </div>
            <div className="text-sm font-bold text-white mb-1">Voice Property Finder</div>
            <p className="text-xs text-blue-200/70">"Show me 2 BHK flats in Gangapur Road, Nashik under 50 Lakhs"</p>
            <div className="mt-3 text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-1 rounded-full border border-emerald-400/30">
              Online & Ready
            </div>
          </div>

        </div>
      </div>

      {/* Modal trigger */}
      <AiAgentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
