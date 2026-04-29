/* eslint-disable react-refresh/only-export-components */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

function AppShell() {
  const { user } = useAuth();

  return (
    <NotificationProvider key={user?.id || 'anonymous'}>
      <App />
    </NotificationProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
