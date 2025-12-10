'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getUser, clearAuthData, type User } from '@/lib/auth';
import { refreshAccessToken } from '@/lib/keycloak-config';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Vérifier l'authentification au chargement
    const checkAuth = () => {
      const token = getToken();
      const userData = getUser();

      console.log('🔐 AuthContext - checkAuth:', {
        hasToken: !!token,
        hasUserData: !!userData,
        userData: userData ? { email: userData.email, role: userData.role } : null
      });

      if (token && userData) {
        setUser(userData);
      } else {
        setUser(null);
      }

      setIsLoading(false);
    };

    checkAuth();

    // Écouter les changements dans localStorage (pour sync entre onglets)
    const handleStorageChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const logout = () => {
    clearAuthData();
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('idToken');
    setUser(null);
    router.push('/login');
  };

  const refreshTokenFn = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const tokens = await refreshAccessToken(refreshToken);

      // Mettre à jour les tokens dans localStorage
      localStorage.setItem('token', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('idToken', tokens.idToken);

      // Mettre à jour le cookie également
      const isSecure = window.location.protocol === 'https:';
      document.cookie = `token=${tokens.accessToken}; path=/; ${isSecure ? 'secure;' : ''} samesite=lax; max-age=${7 * 24 * 60 * 60}`;

      console.log('✅ Token rafraîchi avec succès');
    } catch (error) {
      console.error('❌ Erreur lors du rafraîchissement du token:', error);
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    logout,
    refreshToken: refreshTokenFn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
