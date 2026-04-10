
import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext({
  user: null,
  setUser: () => {},
});

export function UserProvider({ children }) {
  // Initialize user from localStorage if available
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  // Persist user to localStorage on change (remove if null)
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);



  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  return context || {};
}
