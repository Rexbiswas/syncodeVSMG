'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import type {
  AuthUser,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from '@syncode/validation';
import { authApi } from '../lib/auth-api';

interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginInput) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterInput) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  updateProfile: (data: UpdateProfileInput) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef<boolean>(false);
  const refreshSessionRef = useRef<() => Promise<boolean>>(() => Promise.resolve(false));

  const clearRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  const scheduleNextRefresh = useCallback((expiresInSeconds: number) => {
    clearRefreshTimer();
    // Schedule proactive refresh 60 seconds before token expires (or half its lifetime if short)
    const refreshDelayMs = Math.max((expiresInSeconds - 60) * 1000, 10000);
    refreshTimerRef.current = setTimeout(() => {
      refreshSessionRef.current();
    }, refreshDelayMs);
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current) return false;
    isRefreshingRef.current = true;

    try {
      const res = await authApi.refresh();
      if (res.success && res.data) {
        authApi.setAccessToken(res.data.accessToken);
        setAccessToken(res.data.accessToken);
        setUser(res.data.user);
        scheduleNextRefresh(res.data.expiresIn);
        return true;
      } else {
        authApi.setAccessToken(null);
        setAccessToken(null);
        setUser(null);
        clearRefreshTimer();
        return false;
      }
    } catch {
      authApi.setAccessToken(null);
      setAccessToken(null);
      setUser(null);
      clearRefreshTimer();
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [scheduleNextRefresh]);

  useEffect(() => {
    refreshSessionRef.current = refreshSession;
  }, [refreshSession]);

  // Initial session restoration on mount
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        await refreshSession();
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
      clearRefreshTimer();
    };
  }, [refreshSession]);

  const login = async (data: LoginInput): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await authApi.login(data);
      if (res.success && res.data) {
        authApi.setAccessToken(res.data.accessToken);
        setAccessToken(res.data.accessToken);
        setUser(res.data.user);
        scheduleNextRefresh(res.data.expiresIn);
        return { success: true };
      }
      return { success: false, error: res.error?.message || 'Login failed' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterInput): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await authApi.register(data);
      if (res.success && res.data) {
        authApi.setAccessToken(res.data.accessToken);
        setAccessToken(res.data.accessToken);
        setUser(res.data.user);
        scheduleNextRefresh(res.data.expiresIn);
        return { success: true };
      }
      return { success: false, error: res.error?.message || 'Registration failed' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } finally {
      authApi.setAccessToken(null);
      setAccessToken(null);
      setUser(null);
      clearRefreshTimer();
      setIsLoading(false);
    }
  };

  const logoutAll = async () => {
    setIsLoading(true);
    try {
      await authApi.logoutAll();
    } finally {
      authApi.setAccessToken(null);
      setAccessToken(null);
      setUser(null);
      clearRefreshTimer();
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: UpdateProfileInput): Promise<{ success: boolean; error?: string }> => {
    const res = await authApi.updateProfile(data);
    if (res.success && res.data) {
      setUser(res.data);
      return { success: true };
    }
    return { success: false, error: res.error?.message || 'Failed to update profile' };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        logoutAll,
        refreshSession,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
