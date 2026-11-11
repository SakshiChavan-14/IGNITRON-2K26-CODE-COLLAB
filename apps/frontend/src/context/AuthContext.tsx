import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AuthUser,
  AdminLoginDto,
  TeamLoginDto,
  SESSION_CONFIG,
} from '@ignitron/shared';
import { authService } from '../services/auth.service';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  loginAdmin: (dto: AdminLoginDto) => Promise<void>;
  loginTeam: (dto: TeamLoginDto) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authService.getMe();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Revalidate authentication when page is restored from bfcache (browser Back/Forward)
  useEffect(() => {
    const handlePageShow = () => {
      refreshUser();
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [refreshUser]);

  // Periodic heartbeat for active Team sessions (every 30 seconds)
  useEffect(() => {
    if (!user || user.type !== 'TEAM') return;

    const interval = setInterval(async () => {
      try {
        await authService.heartbeat();
      } catch (err: any) {
        if (err?.status === 401 || err?.status === 403) {
          // Session expired or revoked
          setUser(null);
          queryClient.clear();
        }
      }
    }, SESSION_CONFIG.HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user, queryClient]);

  const loginAdmin = async (dto: AdminLoginDto) => {
    const adminUser = await authService.adminLogin(dto);
    setUser(adminUser);
  };

  const loginTeam = async (dto: TeamLoginDto) => {
    const teamUser = await authService.teamLogin(dto);
    setUser(teamUser);
  };

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn('Backend logout call warning:', err);
    } finally {
      setUser(null);
      queryClient.clear();
      sessionStorage.clear();
    }
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        loginAdmin,
        loginTeam,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

