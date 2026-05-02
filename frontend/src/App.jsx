import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import AgentsPage from './pages/AgentsPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';
import PropertiesPage from './pages/PropertiesPage';
import SellPage from './pages/SellPage';
import { useAuth } from './context/AuthContext';

function DashboardRoute() {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="empty-copy">Authenticating your session...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <DashboardPage />;
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
          <Route element={<DashboardRoute />} path="/dashboard" />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
