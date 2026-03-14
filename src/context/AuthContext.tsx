import { createContext, useContext, useState, useLayoutEffect, ReactNode } from 'react';
import * as api from '../services/api';

function getAuthParamsFromUrl(): { authSuccess: string | null; token: string | null; error: string | null } {
  const hash = window.location.hash.slice(1);
  const search = window.location.search.slice(1);
  const params = new URLSearchParams(hash || search);
  return {
    authSuccess: params.get('auth_success'),
    token: params.get('token'),
    error: params.get('error'),
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  tier: 'free' | 'premium' | 'tester' | 'developer';
  usage: {
    imagesGenerated: number;
    promptsEnhanced: number;
    dailyLimit: number;
    resetTime: Date;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginError: string | null;
  clearLoginError: () => void;
  login: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  const isAuthenticated = !!user;

  // Run as early as possible so we capture token before any redirect/navigation can strip it
  useLayoutEffect(() => {
    const { authSuccess, token, error } = getAuthParamsFromUrl();
    console.log('🔍 Auth check on mount:', { authSuccess, hasToken: !!token, error, hasHash: !!window.location.hash, hasSearch: !!window.location.search });

    if (authSuccess === 'true' && token) {
      console.log('✅ Found auth token in URL, storing in localStorage...');
      setLoginError(null);
      try {
        localStorage.setItem('auth_token', token);
      } catch (e) {
        console.error('Failed to store token in localStorage:', e);
      }
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      checkAuthStatus();
    } else {
      if (error === 'auth_failed' || error === 'no_code') {
        setLoginError(error === 'no_code' ? 'no_code' : 'auth_failed');
      }
      if (window.location.hash || window.location.search) {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
      console.log('🔍 No URL token, checking existing auth...');
      checkAuthStatus();
    }
  }, []);

  const clearLoginError = () => setLoginError(null);

  const checkAuthStatus = async () => {
    try {
      const data = await api.fetchUser();
      if (data?.user) {
        setUser({
          ...data.user,
          usage: {
            ...data.user.usage,
            resetTime: new Date(data.user.usage.resetTime),
          },
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = () => {
    window.location.href = api.getLoginUrl();
  };

  const logout = async () => {
    try {
      await api.logout();
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      localStorage.removeItem('auth_token');
      setUser(null);
      window.location.href = '/';
    }
  };

  const refreshUser = async () => {
    await checkAuthStatus();
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    loginError,
    clearLoginError,
    login,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
