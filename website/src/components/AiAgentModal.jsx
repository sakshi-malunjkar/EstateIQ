import React, { useEffect, useRef, useState } from 'react';
import { Mic, X, Sparkles, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import vapi from '../lib/vapi';

const ASSISTANT_ID = import.meta.env.VITE_VAPI_ASSISTANT_ID;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Sends the finished call to the same webhook Vapi itself posts to, in
// Vapi's end-of-call-report shape, so the backend saves it as a lead.
async function saveLead(lines, info) {
  const res = await fetch(`${API_URL}/webhook/vapi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        type: 'end-of-call-report',
        artifact: {
          messages: lines.map((t) => ({
            role: t.role === 'assistant' ? 'assistant' : 'user',
            message: t.text,
          })),
        },
        call: {
          id: 'web-' + Date.now(),
          customer: {
            number: info.phone,
            name: info.name,
            email: info.email || '',
            city: info.city || '',
          },
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`Backend responded ${res.status}`);
}

export default function AiAgentModal({ isOpen, onClose, clientInfo }) {
  const [callActive, setCallActive] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [showThankYou, setShowThankYou] = useState(false);
  const [error, setError] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | failed | empty
  const transcriptRef = useRef([]);
  const errorRef = useRef(false);
  const clientInfoRef = useRef(clientInfo);
  const savedRef = useRef(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    clientInfoRef.current = clientInfo;
  }, [clientInfo]);

  // Vapi listeners live for the lifetime of the component, not per call.
  useEffect(() => {
    const onCallStart = () => {
      setCallActive(true);
      setTranscript([]);
      transcriptRef.current = [];
      savedRef.current = false;
    };
    const onCallEnd = () => {
      setCallActive(false);
      // A failed call also emits call-end; don't thank the user for it.
      if (errorRef.current || savedRef.current) return;
      savedRef.current = true;
      setShowThankYou(true);

      const lines = transcriptRef.current;
      const info = clientInfoRef.current;
      if (lines.length === 0 || !info) {
        setSaveStatus('empty');
        return;
      }
      setSaveStatus('saving');
      saveLead(lines, info)
        .then(() => setSaveStatus('saved'))
        .catch((err) => {
          console.error('Failed to save lead:', err);
          setSaveStatus('failed');
        });
    };
    const onMessage = (msg) => {
      // Final results only, so each utterance is added once.
      if (msg.type === 'transcript' && msg.transcriptType === 'final') {
        const line = { role: msg.role, text: msg.transcript };
        transcriptRef.current = [...transcriptRef.current, line];
        setTranscript([...transcriptRef.current]);
      }
    };
    const onError = (err) => {
      console.error('Vapi error:', err);
      errorRef.current = true;
      setCallActive(false);
      setError(true);
    };

    vapi.on('call-start', onCallStart);
    vapi.on('call-end', onCallEnd);
    vapi.on('message', onMessage);
    vapi.on('error', onError);
    return () => {
      vapi.removeListener('call-start', onCallStart);
      vapi.removeListener('call-end', onCallEnd);
      vapi.removeListener('message', onMessage);
      vapi.removeListener('error', onError);
      vapi.stop();
    };
  }, []);

  // Opening the modal starts the call; closing it ends any call in progress.
  useEffect(() => {
    if (!isOpen) return undefined;

    errorRef.current = false;
    transcriptRef.current = [];
    setTranscript([]);
    setCallActive(false);
    setShowThankYou(false);
    setError(false);
    setSaveStatus('idle');

    if (!import.meta.env.VITE_VAPI_PUBLIC_KEY || !ASSISTANT_ID) {
      console.error('Vapi is not configured: set VITE_VAPI_PUBLIC_KEY and VITE_VAPI_ASSISTANT_ID in website/.env');
      errorRef.current = true;
      setError(true);
      return undefined;
    }

    Promise.resolve(vapi.start(ASSISTANT_ID)).catch((err) => {
      console.error('Failed to start Vapi call:', err);
      errorRef.current = true;
      setError(true);
    });

    return () => {
      vapi.stop();
    };
  }, [isOpen]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  if (!isOpen) return null;

  const handleEndCall = () => (callActive ? vapi.stop() : onClose());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 text-white rounded-3xl p-8 border border-blue-500/30 shadow-2xl flex flex-col items-center text-center overflow-hidden">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ambient background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl"></div>

        {error ? (
          <div className="relative flex flex-col items-center py-6">
            <AlertTriangle className="w-14 h-14 text-amber-400 mb-4" />
            <p className="text-sm text-gray-200 max-w-xs leading-relaxed">
              Could not connect to AI Agent. Please try again or call us at +91 98765 43210
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white font-bold text-xs py-3 rounded-xl transition border border-white/10"
            >
              Close
            </button>
          </div>
        ) : showThankYou ? (
          <div className="relative flex flex-col items-center py-6">
            {saveStatus === 'saving' || saveStatus === 'idle' ? (
              <>
                <Loader2 className="w-14 h-14 text-blue-400 mb-4 animate-spin" />
                <h3 className="text-xl font-black text-white tracking-tight">Saving your details...</h3>
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <CheckCircle className="w-14 h-14 text-green-400 mb-4" />
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Thank you {clientInfo?.name}! 🎉
                </h3>
                <p className="text-sm text-gray-300 mt-3 max-w-xs leading-relaxed">
                  Our team will contact you at {clientInfo?.phone} within 24 hours with the best property options in{' '}
                  {clientInfo?.city}.
                </p>
              </>
            ) : (
              <>
                <AlertTriangle className="w-14 h-14 text-amber-400 mb-4" />
                <p className="text-sm text-gray-200 max-w-xs leading-relaxed">
                  {saveStatus === 'empty'
                    ? "We didn't catch anything during the call, so nothing was saved. Please try again or call us at +91 98765 43210"
                    : "We couldn't save your conversation. Please try again or call us at +91 98765 43210"}
                </p>
              </>
            )}
            <button
              onClick={onClose}
              disabled={saveStatus === 'saving'}
              className="mt-6 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs py-3 rounded-xl transition"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Pulsing Mic Graphic */}
            <div className="relative my-8">
              <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping"></div>
              <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 opacity-40 animate-pulse-ring"></div>
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg border-2 border-blue-300">
                <Mic className="w-12 h-12 text-white animate-bounce" />
              </div>
            </div>

            <div className="inline-flex items-center space-x-2 bg-blue-500/20 text-blue-300 text-xs font-bold px-3.5 py-1.5 rounded-full border border-blue-400/30 mb-3">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Powered by EstateIQ AI</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {callActive ? 'Listening...' : 'Connecting to AI Agent...'}
            </h3>

            <p className="text-xs text-gray-300 mt-2 max-w-xs leading-relaxed">
              {callActive
                ? 'Speak in English or Hindi to get instant property listings.'
                : 'Please allow microphone access if prompted.'}
            </p>

            {/* Live transcript */}
            <div
              ref={scrollRef}
              className="w-full h-40 mt-5 mb-5 overflow-y-auto rounded-xl bg-white/5 border border-white/10 p-3 flex flex-col gap-2 text-left"
            >
              {transcript.length === 0 && (
                <p className="text-xs text-gray-500 text-center my-auto">
                  {callActive ? 'Start speaking...' : 'Transcript will appear here'}
                </p>
              )}
              {transcript.map((line, i) => {
                const isAgent = line.role === 'assistant';
                return (
                  <div key={i} className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}>
                    <span
                      className={`max-w-[85%] text-xs px-3 py-2 rounded-2xl leading-relaxed ${
                        isAgent ? 'bg-white/10 text-gray-300' : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {line.text}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleEndCall}
              className="w-full bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white font-bold text-xs py-3 rounded-xl transition border border-white/10"
            >
              End Call
            </button>
          </>
        )}
      </div>
    </div>
  );
}
