'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home, Compass } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console for diagnostics
    console.error('Unhandled app error:', error);

    // If a chunk load failed (stale deployment or network glitch), reload once automatically
    if (
      typeof window !== 'undefined' &&
      error?.message &&
      (error.message.includes('Loading chunk') || error.message.includes('ChunkLoadError'))
    ) {
      const hasReloaded = sessionStorage.getItem('chunk_load_reloaded_route');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_load_reloaded_route', 'true');
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Something went wrong
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            An unexpected error occurred while loading this page. You can try refreshing or returning to the homepage.
          </p>
          {error?.digest && (
            <p className="text-xs text-slate-500 font-mono pt-1">
              Error code: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            id="btn-error-retry"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-950/40 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            id="btn-error-home"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-sm transition-all border border-slate-700 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Go Home</span>
          </Link>
        </div>

        <div className="pt-4 border-t border-slate-800/80 text-xs text-slate-500 flex items-center justify-center gap-4">
          <Link href="/whatsapp-groups" className="hover:text-slate-400 transition-colors">
            WhatsApp
          </Link>
          <span>•</span>
          <Link href="/telegram-groups" className="hover:text-slate-400 transition-colors">
            Telegram
          </Link>
          <span>•</span>
          <Link href="/discord-servers" className="hover:text-slate-400 transition-colors">
            Discord
          </Link>
        </div>
      </div>
    </div>
  );
}
