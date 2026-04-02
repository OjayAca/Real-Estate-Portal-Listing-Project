import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/client';

const STORAGE_KEY = 'estateflow_token';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => window.localStorage.getItem(STORAGE_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(window.localStorage.getItem(STORAGE_KEY)));

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    let ignore = false;
    setLoading(true);

    apiRequest('/auth/me', { token })
      .then((data) => {
        if (!ignore) {
          setUser(data.user);
        }
      })
      .catch(() => {
        if (!ignore) {
          window.localStorage.removeItem(STORAGE_KEY);
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [token]);

  const persistToken = useCallback((nextToken) => {
    window.localStorage.setItem(STORAGE_KEY, nextToken);
    setToken(nextToken);
  }, []);

  const login = useCallback(async (payload) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: payload,
    });

    persistToken(data.token);
    setUser(data.user);
    return data;
  }, [persistToken]);

  const register = useCallback(async (payload) => {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: payload,
    });

    persistToken(data.token);
    setUser(data.user);
    return data;
  }, [persistToken]);

  const logout = useCallback(async () => {
    if (token) {
      await apiRequest('/auth/logout', {
        method: 'POST',
        token,
      }).catch(() => null);
    }

    window.localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, [token]);

  const authFetch = useCallback((path, options = {}) => apiRequest(path, { ...options, token }), [token]);

  const value = useMemo(
    () => ({
      authFetch,
      loading,
      login,
      logout,
      register,
      token,
      user,
      setUser,
    }),
    [authFetch, loading, login, logout, register, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}