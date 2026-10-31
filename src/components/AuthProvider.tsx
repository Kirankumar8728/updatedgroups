'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types/user';
import { fetchCurrentSession } from '../utils/userAuth';
import { PushNotificationManager } from './PushNotificationManager';
import { PWAInstallBanner } from './PWAInstallBanner';

interface AuthContextType {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  isLoading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCurrentSession().then((fetchedUser) => {
      setUser(fetchedUser);
      setIsLoading(false);
    });

    const handleSessionUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ user: UserProfile | null }>;
      if (customEvent.detail) {
        setUser(customEvent.detail.user);
      }
    };

    window.addEventListener('gl_user_session_updated', handleSessionUpdate);
    return () => window.removeEventListener('gl_user_session_updated', handleSessionUpdate);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading }}>
      <PushNotificationManager user={user} />
      <PWAInstallBanner />
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthProvider;

