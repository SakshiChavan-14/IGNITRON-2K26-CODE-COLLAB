import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RootLayout } from './layouts/RootLayout';
import { StatusPage } from './pages/StatusPage';
import { TeamLoginPage } from './pages/TeamLoginPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { TeamDashboardPage } from './pages/team/TeamDashboardPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { TeamManagementPage } from './pages/admin/TeamManagementPage';
import { CsvImportPage } from './pages/admin/CsvImportPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 3000,
    },
  },
});

const HomeRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.type === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (user?.type === 'TEAM') {
    return <Navigate to="/team/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootLayout />}>
              <Route index element={<HomeRedirect />} />
              <Route path="status" element={<StatusPage />} />
              <Route path="login" element={<TeamLoginPage />} />
              <Route path="admin/login" element={<AdminLoginPage />} />

              {/* Password Change (requires authentication) */}
              <Route
                path="change-password"
                element={
                  <ProtectedRoute>
                    <ChangePasswordPage />
                  </ProtectedRoute>
                }
              />

              {/* Team Protected Routes */}
              <Route
                path="team/dashboard"
                element={
                  <ProtectedRoute requiredType="TEAM">
                    <TeamDashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Protected Routes */}
              <Route
                path="admin/dashboard"
                element={
                  <ProtectedRoute requiredType="ADMIN">
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/teams"
                element={
                  <ProtectedRoute requiredType="ADMIN">
                    <TeamManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/import"
                element={
                  <ProtectedRoute requiredType="ADMIN">
                    <CsvImportPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
