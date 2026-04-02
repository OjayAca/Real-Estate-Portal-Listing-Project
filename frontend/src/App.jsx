import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';
import PropertiesPage from './pages/PropertiesPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route element={<HomePage />} path="/" />
          <Route element={<PropertiesPage />} path="/properties" />
          <Route element={<AuthPage mode="login" />} path="/login" />
          <Route element={<AuthPage mode="register" />} path="/register" />
          <Route element={<DashboardPage />} path="/dashboard" />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
