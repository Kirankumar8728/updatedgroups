'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdultConsentModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

export const AdultConsentModal: React.FC<AdultConsentModalProps> = ({ onAccept, onDecline }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if consent was already given in this session, cookie, or localStorage
    const hasCookie = typeof document !== 'undefined' && document.cookie.includes('gl_adult_consent=true');
    const hasLocalStorage = typeof window !== 'undefined' && localStorage.getItem('gl_adult_consent') === 'true';

    if (hasCookie || hasLocalStorage) {
      onAccept();
    } else {
      setIsOpen(true);
    }
  }, [onAccept]);

  const handleAccept = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('gl_adult_consent', 'true');
    }
    if (typeof document !== 'undefined') {
      document.cookie = 'gl_adult_consent=true; path=/; max-age=31536000; SameSite=Lax';
    }
    setIsOpen(false);
    onAccept();
  };

  const handleDecline = () => {
    setIsOpen(false);
    onDecline();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8 space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                <ShieldAlert className="w-8 h-8" />
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-slate-100 tracking-tight">
                  18+ Age Restricted Hub
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  You are accessing the <span className="font-bold text-rose-400">adult.grouplinks.app</span> directory. By proceeding, you confirm that you are at least 18 years of age and consent to view adult content.
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={handleAccept}
                  className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-rose-950/40 active:scale-95 cursor-pointer"
                >
                  I am 18 or older — Enter Hub
                </button>
                <button
                  onClick={handleDecline}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-all active:scale-95 cursor-pointer"
                >
                  Return to Main Directory
                </button>
              </div>

              <p className="text-[10px] text-center text-slate-500 pt-2">
                By entering, you agree to our Terms of Service and Community Guidelines regarding adult content.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

