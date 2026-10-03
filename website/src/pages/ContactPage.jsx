import React, { useState } from 'react';
import AiAgentCard from '../components/AiAgentCard';
import { Mail, Phone, MapPin, Send, CheckCircle2, MessageSquare, Clock } from 'lucide-react';

export default function ContactPage() {
  const [formState, setFormState] = useState({ name: '', email: '', phone: '', city: 'Nashik', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormState({ name: '', email: '', phone: '', city: 'Nashik', message: '' });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            EstateIQ Helpdesk & AI Support
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight mt-3 mb-2">
            Get in Touch With Us
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            Whether you want to buy, sell, rent, or speak to our instant AI Voice Agent, we are here for you 24/7.
          </p>
        </div>

        {/* ONE ADDITION REQUIREMENT: AI AGENT CARD SECTION */}
        <AiAgentCard />

        {/* Traditional Contact Info & Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-12">
          
          {/* Contact Information & Office Locations */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-3">
                Contact Details
              </h3>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase">PHONE SUPPORT</h4>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">+91 (0253) 234-5678 / +91 98230 11223</p>
                    <span className="text-[11px] text-gray-500">Mon - Sat, 9:00 AM - 8:00 PM</span>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase">EMAIL US</h4>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">support@estateiq.com</p>
                    <span className="text-[11px] text-gray-500">Average response time: 15 mins</span>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase">NASHIK HEADQUARTERS</h4>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">
                      EstateIQ Tower, 4th Floor, Gangapur Road, Nashik, Maharashtra 422005
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase">PUNE REGIONAL OFFICE</h4>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">
                      EstateIQ Hub, Business Bay, Phase 1 Hinjewadi, Pune 411057
                    </p>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Contact Inquiry Form */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm">
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Send Us a Message
              </h3>
              <p className="text-xs text-gray-500 mb-6">
                Our customer relationship managers will reach out to you within 30 minutes.
              </p>

              {submitted ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h4 className="text-2xl font-black text-gray-900">Thank You!</h4>
                  <p className="text-sm text-gray-500 mt-2">
                    Your request has been received. Our property specialist will contact you shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Your Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={formState.name}
                        onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={formState.phone}
                        onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={formState.email}
                        onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Interested City</label>
                      <select
                        value={formState.city}
                        onChange={(e) => setFormState({ ...formState, city: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                      >
                        <option value="Nashik">Nashik</option>
                        <option value="Pune">Pune</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Your Message / Requirements</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Tell us what configuration, budget or location you are looking for..."
                      value={formState.message}
                      onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3.5 rounded-xl shadow-md transition flex items-center justify-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Message</span>
                  </button>
                </form>
              )}

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
