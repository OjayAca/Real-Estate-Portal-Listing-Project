import React, { Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import { useAuth } from './context/AuthContext';

const AgentsPage = React.lazy(() => import('./pages/AgentsPage'));
const AuthPage = React.lazy(() => import('./pages/AuthPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const PropertiesPage = React.lazy(() => import('./pages/PropertiesPage'));
const SavedPropertiesPage = React.lazy(() => import('./pages/SavedPropertiesPage'));
const AccountSettingsPage = React.lazy(() => import('./pages/AccountSettingsPage'));
const SavedSearchesPage = React.lazy(() => import('./pages/SavedSearchesPage'));
const SellPage = React.lazy(() => import('./pages/SellPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));

function DashboardRoute() {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="empty-copy">Authenticating your session...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.role === 'user') {
    return <Navigate to="/saved-properties" replace />;
  }

  return <DashboardPage />;
}

function BuyerRoute({ children }) {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="empty-copy">Authenticating your session...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.role !== 'user') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function ProtectedRoute({ children }) {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="empty-copy">Authenticating your session...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

function PropertiesRedirect() {
  const location = useLocation();
  return <Navigate to={`/buy${location.search}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route element={<HomePage />} path="/" />
          <Route element={<AgentsPage />} path="/agents" />
          <Route element={<PropertiesPage mode="buy" />} path="/buy" />
          <Route element={<PropertiesPage mode="rent" />} path="/rent" />
          <Route element={<SellPage />} path="/sell" />
          <Route element={<PropertiesRedirect />} path="/properties" />
          <Route element={<AuthPage mode="login" />} path="/login" />
          <Route element={<AuthPage mode="register" />} path="/register" />
          <Route element={<ResetPasswordPage />} path="/reset-password" />
          <Route element={<DashboardRoute />} path="/dashboard" />
          <Route
            element={(
              <BuyerRoute>
                <SavedPropertiesPage />
              </BuyerRoute>
            )}
            path="/saved-properties"
          />
          <Route
            element={(
              <BuyerRoute>
                <SavedSearchesPage />
              </BuyerRoute>
            )}
            path="/saved-searches"
          />
          <Route
            element={(
              <ProtectedRoute>
                <AccountSettingsPage />
              </ProtectedRoute>
            )}
            path="/account/settings"
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
