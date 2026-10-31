'use client';

import React, { useState } from 'react';
import { MainAppView } from './MainAppView';
import { AdultConsentModal } from './AdultConsentModal';
import { Group } from '../types';

interface AdultGroupsViewProps {
  initialGroups: Group[];
  initialTotalCount: number;
  initialStats: any;
  breadcrumbs: any[];
}

export const AdultGroupsView: React.FC<AdultGroupsViewProps> = ({
  initialGroups,
  initialTotalCount,
  initialStats,
  breadcrumbs,
}) => {
  const [hasConsent, setHasConsent] = useState(false);

  const handleAccept = () => {
    setHasConsent(true);
  };

  const handleDecline = () => {
    if (typeof window !== 'undefined') {
      const isAdultSubdomain = window.location.hostname.startsWith('adult.');
      if (isAdultSubdomain) {
        window.location.href = 'https://grouplinks.app';
      } else {
        window.location.href = '/';
      }
    }
  };

  return (
    <>
      <AdultConsentModal onAccept={handleAccept} onDecline={handleDecline} />
      {hasConsent && (
        <MainAppView
          initialGroups={initialGroups}
          initialTotalCount={initialTotalCount}
          initialCategory="Adult / 18+"
          lockCategory="Adult / 18+"
          initialStats={initialStats}
          breadcrumbs={breadcrumbs}
          hideAdultContent={false}
        />
      )}
      {!hasConsent && (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-400 font-medium">Waiting for age verification...</p>
          </div>
        </div>
      )}
    </>
  );
};
