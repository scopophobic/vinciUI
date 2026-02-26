import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as api from '../services/api';

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

  const isAuthenticated = !!user;

  // Check authentication status on mount and handle URL token
  useEffect(() => {
    // Check for auth token in URL (from OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth_success');
    const token = urlParams.get('token');
    
    console.log('🔍 Auth check on mount:', { authSuccess, hasToken: !!token, url: window.location.href });
    
    if (authSuccess === 'true' && token) {
      console.log('✅ Found auth token in URL, storing...');
      // Store token in localStorage for development
      localStorage.setItem('auth_token', token);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Check auth status to load user data
      checkAuthStatus();
    } else {
      console.log('🔍 No URL token, checking existing auth...');
      checkAuthStatus();
    }
  }, []);

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
