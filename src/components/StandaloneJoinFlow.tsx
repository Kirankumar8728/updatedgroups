'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Group } from '@/src/types';
import { Header } from './Header';
import { Footer } from './Footer';
import { GroupJoinFlowPage } from './GroupJoinFlowPage';
import { checkAdminSession, clearAdminSession } from '@/src/utils/adminAuth';
import { getGroupUrlPath, getNumericGroupId } from '@/src/utils/helpers';

import { BookmarksDrawer } from './BookmarksDrawer';
import { AdminLoginModal } from './AdminLoginModal';
import { AdminDashboardModal } from './AdminDashboardModal';

interface StandaloneJoinFlowProps {
  group: Group;
  initialStep: 1 | 2;
}

export function StandaloneJoinFlow({ group, initialStep }: StandaloneJoinFlowProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<1 | 2>(initialStep);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);

  // Initialize theme & bookmarks from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nexus_bookmarks');
      if (saved) {
        setBookmarkedIds(JSON.parse(saved));
      }
      document.documentElement.classList.add('dark');
      setIsAdminLoggedIn(checkAdminSession());
    } catch {
      // Ignore
    }
  }, []);

  const handleToggleBookmark = (g: Group) => {
    const isCurrentlyBookmarked = bookmarkedIds.includes(g.id);
    const updated = isCurrentlyBookmarked
      ? bookmarkedIds.filter(id => id !== g.id)
      : [...bookmarkedIds, g.id];
    
    setBookmarkedIds(updated);
    try {
      localStorage.setItem('nexus_bookmarks', JSON.stringify(updated));
    } catch {
      // Ignore
    }
    fetch(`/api/groups/${encodeURIComponent(g.id)}/bookmark`, { method: 'POST' }).catch(() => {});
  };

  const handleConfirmJoin = (g: Group) => {
    fetch(`/api/groups/${encodeURIComponent(g.id)}/join`, { method: 'POST' }).catch(() => {});
  };

  const handleBackToGroup = () => {
    router.push(getGroupUrlPath(group));
  };

  const handleStepChange = (step: 1 | 2) => {
    setCurrentStep(step);
    const numericId = getNumericGroupId(group);
    if (step === 1) {
      window.history.pushState({}, '', `/rules?join-id=${numericId}`);
    } else {
      window.history.pushState({}, '', `/join?join-id=${numericId}`);
    }
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-colors duration-200`}>
      <Header
        activeTab="explore"
        setActiveTab={() => router.push('/')}
        searchQuery=""
        setSearchQuery={() => {}}
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
        onOpenAdmin={() => (isAdminLoggedIn ? setIsAdminDashboardOpen(true) : setIsAdminLoginOpen(true))}
        isAdminLoggedIn={isAdminLoggedIn}
        bookmarkCount={bookmarkedIds.length}
        isDarkMode={true}
        setIsDarkMode={() => {}}
        onNavigateHome={() => router.push('/')}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GroupJoinFlowPage
          group={group}
          currentStep={currentStep}
          onStepChange={handleStepChange}
          onBackToGroup={handleBackToGroup}
          onConfirmJoin={handleConfirmJoin}
          isBookmarked={bookmarkedIds.includes(group.id)}
          onToggleBookmark={handleToggleBookmark}
        />
      </main>

      <Footer />



      {isBookmarksOpen && (
        <BookmarksDrawer
          isOpen={isBookmarksOpen}
          onClose={() => setIsBookmarksOpen(false)}
          savedGroups={[group].filter(g => bookmarkedIds.includes(g.id))}
          onRemoveBookmark={handleToggleBookmark}
          onOpenDetails={(g) => {
            setIsBookmarksOpen(false);
            router.push(getGroupUrlPath(g));
          }}
          onJoinClick={(g) => {
            setIsBookmarksOpen(false);
            router.push(getGroupUrlPath(g));
          }}
        />
      )}

      {isAdminLoginOpen && (
        <AdminLoginModal
          isOpen={isAdminLoginOpen}
          onClose={() => setIsAdminLoginOpen(false)}
          onLoginSuccess={() => {
            setIsAdminLoggedIn(true);
            setIsAdminLoginOpen(false);
            setIsAdminDashboardOpen(true);
          }}
        />
      )}

      {isAdminDashboardOpen && (
        <AdminDashboardModal
          isOpen={isAdminDashboardOpen}
          onClose={() => setIsAdminDashboardOpen(false)}
          groups={[group]}
          onUpdateGroup={() => {}}
          onDeleteGroup={() => {}}
          onAddGroup={() => {}}
          onLogout={() => {
            clearAdminSession();
            setIsAdminLoggedIn(false);
            setIsAdminDashboardOpen(false);
          }}
        />
      )}
    </div>
  );
}
