'use client';

import React, { Component, ReactNode } from 'react';
import { AuthProvider } from './AuthProvider';
import { WebVitalsMonitor } from './WebVitalsMonitor';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ClientProvidersErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ClientProviders ErrorBoundary Notice]:', error, errorInfo);
    const errString = String(error?.message || error);
    if (
      errString.includes('Loading chunk') ||
      errString.includes('ChunkLoadError') ||
      errString.includes('Unexpected token') ||
      errString.includes('SyntaxError') ||
      errString.includes('app/layout')
    ) {
      if (typeof window !== 'undefined') {
        const reloadKey = 'app_reload_chunk_retry';
        const lastReload = sessionStorage.getItem(reloadKey);
        if (!lastReload || Date.now() - Number(lastReload) > 10000) {
          sessionStorage.setItem(reloadKey, String(Date.now()));
          window.location.reload();
        }
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-xl font-bold mb-3 text-emerald-400">Application Update Detected</h2>
            <p className="text-slate-300 text-sm mb-6">
              A new version of Group Links is available or a connection chunk was refreshed. Click below to reload seamlessly.
            </p>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  sessionStorage.clear();
                  window.location.reload();
                }
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ClientProvidersErrorBoundary>
      <AuthProvider>
        <WebVitalsMonitor />
        {children}
      </AuthProvider>
    </ClientProvidersErrorBoundary>
  );
}

export default ClientProviders;
