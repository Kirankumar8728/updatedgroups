'use client';

import React, { useEffect, useState } from 'react';
import type { UserProfile } from '../types/user';
import { Bell, CheckCircle2, AlertCircle, Loader2, X, Sparkles } from 'lucide-react';

export const PushNotificationManager: React.FC<{ user?: UserProfile | null }> = ({ user }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasPushManager = 'PushManager' in window;
    const hasNotification = 'Notification' in window;

    if (hasServiceWorker && hasPushManager && hasNotification) {
      setIsSupported(true);
      setPermission(Notification.permission);

      try {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      } catch {}

      const hasAsked = localStorage.getItem('gl_notif_asked');
      if (Notification.permission === 'default' && !hasAsked) {
        const timer = setTimeout(() => setShowPrompt(true), 6000);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const getVapidPublicKey = async (): Promise<string | null> => {
    if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    }
    try {
      const res = await fetch('/api/notifications/vapid-key');
      const data = await res.json();
      if (data.success && data.publicKey) {
        return data.publicKey;
      }
    } catch (err) {
      console.warn('Failed to fetch VAPID key:', err);
    }
    return null;
  };

  const requestPermissionSafe = async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return 'denied';
    }
    try {
      const res = Notification.requestPermission();
      if (res && typeof (res as any).then === 'function') {
        return await res;
      }
    } catch (e) {
      console.warn('Promise-based requestPermission notice:', e);
    }

    return new Promise<NotificationPermission>((resolve) => {
      try {
        Notification.requestPermission((p) => {
          resolve(p || 'denied');
        });
      } catch {
        resolve('denied');
      }
    });
  };

  const subscribeUser = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsSubscribing(true);
    setFeedback(null);

    // Timeout safety to ensure buttons never get permanently stuck
    const timeoutId = setTimeout(() => {
      setIsSubscribing(false);
      setFeedback('Subscription request timed out. Please retry.');
      setTimeout(() => setShowPrompt(false), 2000);
    }, 9000);

    try {
      let perm: NotificationPermission = 'default';
      try {
        perm = await requestPermissionSafe();
      } catch {
        perm = 'denied';
      }
      setPermission(perm);

      if (perm !== 'granted') {
        clearTimeout(timeoutId);
        try {
          localStorage.setItem('gl_notif_asked', 'true');
        } catch {}
        setFeedback(perm === 'denied' ? 'Alerts blocked by browser settings.' : 'Alerts dismissed.');
        setTimeout(() => setShowPrompt(false), 1800);
        return;
      }

      const vapidKey = await getVapidPublicKey();
      if (!vapidKey) {
        clearTimeout(timeoutId);
        try {
          localStorage.setItem('gl_notif_asked', 'true');
        } catch {}
        setFeedback('Alerts enabled locally!');
        setTimeout(() => setShowPrompt(false), 1800);
        return;
      }

      let registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
      }

      // Safe wait for service worker ready with timeout
      await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => setTimeout(() => reject(new Error('SW ready timeout')), 4000))
      ]).catch(() => {});

      let subscription = await registration?.pushManager?.getSubscription().catch(() => null);
      if (!subscription && registration?.pushManager) {
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          });
        } catch (subErr: any) {
          console.warn('pushManager.subscribe notice:', subErr?.message);
        }
      }

      if (subscription) {
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: subscription.toJSON ? subscription.toJSON() : JSON.parse(JSON.stringify(subscription)),
            platform: 'web',
          }),
        }).catch(() => {});
      }

      clearTimeout(timeoutId);
      try {
        localStorage.setItem('gl_notif_asked', 'true');
      } catch {}
      setFeedback('Alerts successfully activated! 🎉');
      setTimeout(() => setShowPrompt(false), 1800);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn('Push subscription notice:', err?.message);
      try {
        localStorage.setItem('gl_notif_asked', 'true');
      } catch {}
      setFeedback('Notifications enabled for this session.');
      setTimeout(() => setShowPrompt(false), 1800);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDecline = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsSubscribing(false);
    try {
      localStorage.setItem('gl_notif_asked', 'true');
    } catch {}
    setShowPrompt(false);
  };

  if (!isSupported || !showPrompt) return null;

  return (
    <div
      role="dialog"
      aria-label="Push Notifications Prompt"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100000] max-w-sm w-[calc(100vw-2rem)] sm:w-96 bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-indigo-200 dark:border-indigo-900/60 p-5 animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div className="space-y-1 pr-2">
            <h4 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-1.5">
              <span>Enable Alerts</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Get instant alerts for 24H trending groups, top community boosts, and new verified invites.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDecline}
          aria-label="Close notification prompt"
          className="p-1 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {feedback && (
        <div className="mt-3 p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="flex items-center gap-2 mt-4 pt-1">
        <button
          type="button"
          onClick={subscribeUser}
          disabled={isSubscribing}
          className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {isSubscribing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Activating...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Allow Notifications</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleDecline}
          className="px-4 py-2.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          Later
        </button>
      </div>
    </div>
  );
};
