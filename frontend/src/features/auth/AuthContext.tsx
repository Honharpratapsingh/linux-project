import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../../types/api';
import { api, setUnauthorizedHandler } from '../../lib/api';

export interface LoginParams {
  email: string;
  password: string;
}

export interface RegisterParams {
  fullName: string;
  email: string;
  password: string;
  registrationNumber?: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (params: LoginParams) => Promise<User>;
  register: (params: RegisterParams) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async (): Promise<User | null> => {
    try {
      const res = await api.get<{ user: User }>('/auth/me', { skipAuthRedirect: true });
      setUser(res.user);
      return res.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Listen for unauthorized 401s from API client
    setUnauthorizedHandler(() => {
      setUser(null);
    });

    fetchCurrentUser();

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [fetchCurrentUser]);

  const login = async (params: LoginParams): Promise<User> => {
    const res = await api.post<{ user: User; csrfToken: string }>('/auth/login', params);
    setUser(res.user);
    return res.user;
  };

  const register = async (params: RegisterParams): Promise<User> => {
    const res = await api.post<{ user: User; csrfToken: string }>('/auth/register', params);
    setUser(res.user);
    return res.user;
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore network errors on logout
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser: fetchCurrentUser,
        setUser,
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
