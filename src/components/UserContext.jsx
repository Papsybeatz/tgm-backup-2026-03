import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const UserContext = createContext({ user: null, setUser: () => {}, refreshUser: async () => {} });

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  // Persist to localStorage on every change
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  // Fetch fresh user data from /api/auth/me and merge into state.
  // Called on mount (if logged in) and after returning from Stripe checkout.
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        // Token expired — clear session
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        return;
      }
      if (!res.ok) return;
      const fresh = await res.json();
      setUser(prev => ({ ...prev, ...fresh }));
    } catch (e) {
      // Network error — keep existing cached user, don't log out
    }
  }, []);

  // Refresh on mount so tier is always current after a page reload
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Refresh when the tab becomes visible again (catches back-navigation from Stripe)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshUser();
    };
    const handlePageShow = (e) => {
      if (e.persisted) refreshUser(); // bfcache restore
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [refreshUser]);

  return (
    <UserContext.Provider value={{ user, setUser, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext) || {};
}
