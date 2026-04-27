import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import AgentsPage from './pages/AgentsPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';
import PropertiesPage from './pages/PropertiesPage';
import { useAuth } from './context/AuthContext';

function canAccessDashboard(user) {
  if (!user) {
    return false;
  }

  return user.role !== 'user' || Boolean(user.email_verified_at);
}

function DashboardRoute() {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="empty-copy">Authenticating your session...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!canAccessDashboard(user)) {
    return <p className="empty-copy">Verify your email address before opening the dashboard.</p>;
  }

  return <DashboardPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route element={<HomePage />} path="/" />
          <Route element={<AgentsPage />} path="/agents" />
          <Route element={<PropertiesPage />} path="/properties" />
          <Route element={<AuthPage mode="login" />} path="/login" />
          <Route element={<AuthPage mode="register" />} path="/register" />
          <Route element={<DashboardRoute />} path="/dashboard" />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
