import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RootLayout } from './layouts/RootLayout';
import { LandingPage } from './pages/LandingPage';
import { RulesPage } from './pages/RulesPage';
import { CodingWorkspacePreviewPage } from './pages/team/CodingWorkspacePreviewPage';
import { StatusPage } from './pages/StatusPage';
import { TeamLoginPage } from './pages/TeamLoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { TeamDashboardPage } from './pages/team/TeamDashboardPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { TeamManagementPage } from './pages/admin/TeamManagementPage';
import { CompetitionControlPage } from './pages/admin/CompetitionControlPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 3000,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootLayout />}>
              {/* Public Routes (No Auth Required) */}
              <Route index element={<LandingPage />} />
              <Route path="rules" element={<RulesPage />} />
              <Route path="status" element={<StatusPage />} />
              <Route path="register" element={<RegisterPage />} />
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
              <Route
                path="team/workspace"
                element={
                  <ProtectedRoute requiredType="TEAM">
                    <CodingWorkspacePreviewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="workspace"
                element={
                  <ProtectedRoute requiredType="TEAM">
                    <CodingWorkspacePreviewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="workspace-preview"
                element={
                  <ProtectedRoute requiredType="TEAM">
                    <CodingWorkspacePreviewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="team/submissions"
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
                path="admin/competition"
                element={
                  <ProtectedRoute requiredType="ADMIN">
                    <CompetitionControlPage />
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
                element={<Navigate to="/admin/teams" replace />}
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
