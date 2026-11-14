import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { ToastProvider } from './components/common/Toast';
import { RequireAuth, RequireRole, RedirectIfAuth } from './features/auth/Guards';
import { AppShell } from './components/layout/AppShell';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import UnauthorizedPage from './pages/error/UnauthorizedPage';
import NotFoundPage from './pages/error/NotFoundPage';
import OverviewPage from './pages/overview/OverviewPage';
import ProjectsListPage from './pages/projects/ProjectsListPage';
import CreateProjectPage from './pages/projects/CreateProjectPage';
import ProjectDetailPage from './pages/projects/ProjectDetailPage';
import PendingReviewsPage from './pages/projects/PendingReviewsPage';
import ArchivedProjectsPage from './pages/projects/ArchivedProjectsPage';
import ProfilePage from './pages/profile/ProfilePage';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route
            path="/login"
            element={
              <RedirectIfAuth>
                <LoginPage />
              </RedirectIfAuth>
            }
          />
          <Route
            path="/register"
            element={
              <RedirectIfAuth>
                <RegisterPage />
              </RedirectIfAuth>
            }
          />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Authenticated Application Shell */}
          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/projects" element={<ProjectsListPage />} />
            <Route
              path="/projects/new"
              element={
                <RequireRole role="STUDENT">
                  <CreateProjectPage />
                </RequireRole>
              }
            />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route
              path="/pending-reviews"
              element={
                <RequireRole role="FACULTY">
                  <PendingReviewsPage />
                </RequireRole>
              }
            />
            <Route path="/archived" element={<ArchivedProjectsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* 404 Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
