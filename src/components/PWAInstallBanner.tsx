'use client';

import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Sparkles, Layout } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show only on mobile devices
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
    const isMobile = /android|iphone|ipad|ipod/.test(userAgent);
    
    // Check if dismissed recently
    const isDismissed = localStorage.getItem('gl_pwa_banner_dismissed');
    const dismissedTime = parseInt(isDismissed || '0', 10);
    const oneDay = 24 * 60 * 60 * 1000;
    const shouldShowAgain = Date.now() - dismissedTime > oneDay;

    if (isMobile && !isInstalled && (isInstallable || isIOS) && shouldShowAgain) {
      // Delay appearance for better UX
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, isIOS]);

  const handleDismiss = () => {
    localStorage.setItem('gl_pwa_banner_dismissed', Date.now().toString());
    setIsVisible(false);
  };

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
    } else {
      const success = await install();
      if (success) setIsVisible(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-[60] p-4 pb-6 sm:p-6 sm:pb-8 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent pointer-events-none"
          >
            <div className="max-w-md mx-auto pointer-events-auto">
              <div className="bg-white dark:bg-neutral-900 border border-indigo-200/50 dark:border-indigo-500/30 rounded-3xl shadow-2xl overflow-hidden shadow-indigo-500/20">
                <div className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg animate-pulse">
                    <Sparkles className="w-6 h-6 text-white fill-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-neutral-900 dark:text-white leading-tight">
                      Install GroupLinks App
                    </h4>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1">
                      Fast, offline-ready & native experience.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleInstall}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
                    >
                      Install
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-neutral-900 p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-2">Install on iOS</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
              Add GroupLinks to your home screen for the best experience on your iPhone or iPad.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 text-xs font-medium">
                <div className="w-8 h-8 rounded-full bg-white dark:bg-neutral-800 shadow-sm flex items-center justify-center font-bold">1</div>
                <div>Tap the <span className="p-1 bg-white dark:bg-neutral-700 rounded inline-block mx-1"><Layout className="w-3.5 h-3.5 inline text-indigo-500" /></span> <span className="font-bold">Share</span> button.</div>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 text-xs font-medium">
                <div className="w-8 h-8 rounded-full bg-white dark:bg-neutral-800 shadow-sm flex items-center justify-center font-bold">2</div>
                <div>Select <span className="font-bold uppercase tracking-tight">Add to Home Screen</span>.</div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-8 w-full rounded-2xl bg-indigo-600 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 active:scale-95"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
