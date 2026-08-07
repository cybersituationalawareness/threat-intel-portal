import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children, apiBase }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [demoUsers, setDemoUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const reloadDemoUsers = () => {
    setLoading(true);
    fetch(`${apiBase}/api/v1/demo-users`)
      .then((res) => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then((data) => {
        setDemoUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load demo users:", err);
        setDemoUsers([]);
        setLoading(false);
      });
  };

  // Fetch demo users on mount with automatic retry during container startup
  useEffect(() => {
    let retries = 0;
    const fetchUsers = () => {
      fetch(`${apiBase}/api/v1/demo-users`)
        .then((res) => {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then((data) => {
          const users = Array.isArray(data) ? data : [];
          if (users.length === 0 && retries < 4) {
            retries++;
            setTimeout(fetchUsers, 1500);
          } else {
            setDemoUsers(users);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (retries < 4) {
            retries++;
            setTimeout(fetchUsers, 1500);
          } else {
            console.error("Failed to load demo users:", err);
            setDemoUsers([]);
            setLoading(false);
          }
        });
    };
    fetchUsers();
  }, [apiBase]);

  const login = (user) => setCurrentUser(user);
  const logout = () => setCurrentUser(null);

  // Helper for authenticated fetch
  const authFetch = (endpoint, options = {}) => {
    const headers = { ...options.headers };
    
    // Only set application/json if body is not FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    if (currentUser) {
      headers['X-User-ID'] = currentUser.id;
    }
    return fetch(`${apiBase}${endpoint}`, { ...options, headers });
  };

  return (
    <AuthContext.Provider value={{ currentUser, demoUsers, loading, login, logout, authFetch, reloadDemoUsers }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
