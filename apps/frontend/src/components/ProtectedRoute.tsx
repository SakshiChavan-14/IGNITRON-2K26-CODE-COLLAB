import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredType?: 'ADMIN' | 'TEAM';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredType,
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
            Verifying Session...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    const redirectPath = requiredType === 'ADMIN' ? '/admin/login' : '/login';
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  if (requiredType && user.type !== requiredType) {
    const redirectPath = user.type === 'ADMIN' ? '/admin/dashboard' : '/team/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  // Force team password change if required and not already on change-password page
  if (
    user.type === 'TEAM' &&
    user.mustChangePassword &&
    location.pathname !== '/change-password'
  ) {
    return <Navigate to="/change-password" replace />;
  }

  return <>{children}</>;
};

