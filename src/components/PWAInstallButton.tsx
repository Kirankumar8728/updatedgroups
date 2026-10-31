'use client';

import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold w-full">
        <CheckCircle2 className="w-4 h-4" />
        <span>App Installed</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
      >
        <span className="flex items-center gap-2.5">
          <Download className="w-4 h-4 text-white animate-bounce" />
          <span>Install App</span>
        </span>
        <span className="text-[10px] font-extrabold uppercase bg-indigo-700/80 px-2 py-0.5 rounded-full text-indigo-100">
          PWA
        </span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-neutral-900 p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex justify-between items-center">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-lg font-extrabold text-neutral-900 dark:text-white">Install GroupLinks App</h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {isIOS ? (
                <>To install on iOS: Tap the <span className="font-bold">Share</span> button in Safari, then select <span className="font-bold">Add to Home Screen</span>.</>
              ) : (
                <>To install GroupLinks on your device, open your browser menu (⋮) and tap <span className="font-bold">&quot;Install app&quot;</span> or <span className="font-bold">&quot;Add to Home screen&quot;</span>.</>
              )}
            </p>

            <button
              onClick={() => setShowGuide(false)}
              className="w-full rounded-2xl bg-indigo-600 py-3 text-xs font-black text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 active:scale-95 cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
