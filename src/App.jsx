import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { safeReturnTo, withReturnTo } from '@/lib/authReturnTo';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

function Spinner() {
  return (
    <div className="min-h-screen grid place-items-center bg-background">
      <div className="w-8 h-8 border-4 border-secondary border-t-brand rounded-full animate-spin" />
    </div>
  );
}

function RequireAuth({ children }) {
  const { session, isLoadingAuth } = useAuth();
  const location = useLocation();
  if (isLoadingAuth) return <Spinner />;
  if (!session) return <Navigate to={withReturnTo('/login', location.pathname + location.search)} replace />;
  return children;
}

function PublicOnly({ children }) {
  const { session, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return <Spinner />;
  if (session) return <Navigate to={safeReturnTo()} replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
        <Routes>
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
          <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
