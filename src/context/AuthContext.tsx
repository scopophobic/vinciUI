import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
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
  const [session, setSession] = useState<Session | null>(null);
  const [backendUser, setBackendUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.setApiTokenGetter(async () => session?.access_token ?? null);
  }, [session]);

  const fetchBackendUser = async () => {
    if (!session) {
      setBackendUser(null);
      return;
    }
    try {
      const data = await api.fetchUser();
      if (data?.user) {
        setBackendUser({
          ...data.user,
          usage: {
            ...data.user.usage,
            resetTime: new Date(data.user.usage.resetTime),
          },
        });
      } else {
        setBackendUser(null);
      }
    } catch {
      setBackendUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setBackendUser(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    fetchBackendUser();
  }, [session]);

  const refreshUser = async () => {
    await fetchBackendUser();
  };

  const user: User | null =
    session && backendUser
      ? {
          id: backendUser.id,
          email: backendUser.email ?? session.user.email ?? '',
          name: backendUser.name ?? session.user.user_metadata?.full_name ?? session.user.email ?? 'User',
          picture: backendUser.picture ?? session.user.user_metadata?.avatar_url ?? '',
          tier: backendUser.tier ?? 'free',
          usage: backendUser.usage,
        }
      : null;

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
