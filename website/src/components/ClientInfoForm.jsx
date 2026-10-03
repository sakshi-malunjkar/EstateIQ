import React, { useState } from 'react';
import { X, User, Phone, Mail, MapPin, Sparkles } from 'lucide-react';

const CITIES = ['Nashik', 'Pune'];

/**
 * Accepts "9876543210" or "+91 98765 43210" (spaces / dashes allowed) and
 * returns the normalized "+91XXXXXXXXXX", or null if it isn't valid.
 */
export function normalizePhone(raw) {
  const compact = raw.replace(/[\s-]/g, '');
  if (/^\d{10}$/.test(compact)) return `+91${compact}`;
  if (/^\+91\d{10}$/.test(compact)) return compact;
  return null;
}

function validate(values) {
  const errors = {};
  if (values.name.trim().length < 2) errors.name = 'Please enter your full name (at least 2 characters).';
  if (!normalizePhone(values.phone)) errors.phone = 'Enter a 10-digit number, or +91 followed by 10 digits.';
  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Enter a valid email address, or leave it blank.';
  }
  return errors;
}

const inputClass = (hasError) =>
  `w-full pl-9 pr-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 font-medium ${
    hasError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-indigo-500'
  }`;

export default function ClientInfoForm({ isOpen, onClose, onSubmit }) {
  const [values, setValues] = useState({ name: '', phone: '', email: '', city: 'Nashik' });
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  if (!isOpen) return null;

  const errors = validate(values);
  const showError = (field) => (touched[field] || submitAttempted) && errors[field];
  const canSubmit = values.name.trim() !== '' && values.phone.trim() !== '';

  const setField = (field) => (e) => setValues({ ...values, [field]: e.target.value });
  const blur = (field) => () => setTouched({ ...touched, [field]: true });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (Object.keys(errors).length > 0) return;
    onSubmit({
      name: values.name.trim(),
      phone: normalizePhone(values.phone),
      email: values.email.trim(),
      city: values.city,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 overflow-y-auto max-h-[95vh] border border-gray-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
          <Sparkles className="w-4 h-4" />
          <span>EstateIQ AI Voice Agent</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-1">Start a Conversation with Our AI Agent</h3>
        <p className="text-xs text-gray-500 mb-6">Please share your details so our team can follow up with you</p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="ci-name" className="block text-xs font-bold text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                id="ci-name"
                type="text"
                placeholder="Enter your full name"
                value={values.name}
                onChange={setField('name')}
                onBlur={blur('name')}
                className={inputClass(showError('name'))}
                autoComplete="name"
              />
            </div>
            {showError('name') && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="ci-phone" className="block text-xs font-bold text-gray-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                id="ci-phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={values.phone}
                onChange={setField('phone')}
                onBlur={blur('phone')}
                className={inputClass(showError('phone'))}
                autoComplete="tel"
              />
            </div>
            {showError('phone') && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label htmlFor="ci-email" className="block text-xs font-bold text-gray-700 mb-1">
              Email <span className="text-gray-400 font-medium">(optional)</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                id="ci-email"
                type="email"
                placeholder="your@email.com"
                value={values.email}
                onChange={setField('email')}
                onBlur={blur('email')}
                className={inputClass(showError('email'))}
                autoComplete="email"
              />
            </div>
            {showError('email') && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="ci-city" className="block text-xs font-bold text-gray-700 mb-1">
              City <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <select
                id="ci-city"
                value={values.city}
                onChange={setField('city')}
                className={`${inputClass(false)} appearance-none`}
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-indigo-600 text-white font-bold text-sm py-3 rounded-xl shadow-md transition duration-150 mt-2"
          >
            🎤 Start Voice Conversation
          </button>
        </form>
      </div>
    </div>
  );
}
