'use client';

import React, { useState, useEffect } from 'react';
import { Cookie, Shield, X } from 'lucide-react';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days: number) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // 1. Ensure unique visitor fingerprint cookie (gl_fp_id) exists for reliable session & rate-limiting tracking
    let fpId = getCookie('gl_fp_id');
    if (!fpId) {
      fpId = 'fp-' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      setCookie('gl_fp_id', fpId, 365);
    }

    // 2. Check if user already accepted or declined cookies
    const consent = getCookie('gl_cookie_consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    setCookie('gl_cookie_consent', 'accepted', 365);
    setShowBanner(false);
  };

  const handleDecline = () => {
    setCookie('gl_cookie_consent', 'declined', 365);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <aside aria-label="Cookie Consent" className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-md z-50 bg-slate-900/95 dark:bg-slate-950/95 border border-slate-800 dark:border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-xl text-slate-100 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-6 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Cookie className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight text-white">We Value Your Privacy & Experience</h3>
            <p className="text-[11px] text-slate-400">Cookies & Personalization</p>
          </div>
        </div>
        <button
          onClick={handleDecline}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        We use cookies and similar technologies to enhance your browsing experience, analyze site traffic, serve personalized ads via Google AdSense.
      </p>

      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          onClick={handleDecline}
          className="flex-1 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
        >
          Decline Non-Essential
        </button>
        <button
          onClick={handleAccept}
          className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-950/30 transition"
        >
          Accept All
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-0.5">
        <Shield className="w-3 h-3 text-emerald-400" />
        <span>Compliant with Google AdSense & GDPR Consent Policies</span>
      </div>
    </aside>
  );
}
