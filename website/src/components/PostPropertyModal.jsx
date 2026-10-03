import React, { useState } from 'react';
import { X, CheckCircle, Home, Building2 } from 'lucide-react';

export default function PostPropertyModal({ isOpen, onClose }) {
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-gray-100">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-gray-900">Property Submitted FREE!</h3>
            <p className="text-sm text-gray-500 mt-2">
              Our verification team will review and publish your listing within 2 hours.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="bg-rose-500 text-white font-black text-[10px] uppercase px-2 py-0.5 rounded">FREE</span>
              <span className="text-xs font-bold text-gray-500">100% Free Listing</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-1">
              Post Your Property on EstateIQ
            </h3>
            
            <p className="text-xs text-gray-500 mb-6">
              Connect directly with zero-brokerage buyers and tenants in Nashik & Pune.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Property Purpose</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className="py-2 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
                    Sell Property
                  </button>
                  <button type="button" className="py-2 text-xs font-bold bg-gray-50 text-gray-600 rounded-lg border border-gray-200">
                    Rent Out Property
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">City & Locality</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gangapur Road, Nashik or Wakad, Pune"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Expected Price (in ₹)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 45 Lakhs or 15,000/month"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Your Mobile Number</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 rounded-xl shadow-md transition"
              >
                Publish Listing FREE
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
