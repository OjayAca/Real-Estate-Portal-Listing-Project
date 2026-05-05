/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    apiRequest('/auth/me')
      .then((data) => {
        if (!ignore) {
          setUser(data.user);
        }
      })
      .catch(() => {
        if (!ignore) {
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
  }, []);

  const login = useCallback(async (payload) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: payload,
    });

    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: payload,
    });

    setUser(data.user);
    return data;
  }, []);

  const forgotPassword = useCallback((payload) => apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: payload,
  }), []);

  const resetPassword = useCallback((payload) => apiRequest('/auth/reset-password', {
    method: 'POST',
    body: payload,
  }), []);

  const logout = useCallback(async () => {
    await apiRequest('/auth/logout', {
      method: 'POST',
    }).catch(() => null);

    setUser(null);
    setLoading(false);
  }, []);

  const authFetch = useCallback((path, options = {}) => apiRequest(path, options), []);

  const value = useMemo(
    () => ({
      authFetch,
      forgotPassword,
      resetPassword,
      loading,
      login,
      logout,
      register,
      user,
      setUser,
    }),
    [authFetch, forgotPassword, resetPassword, loading, login, logout, register, user],
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
