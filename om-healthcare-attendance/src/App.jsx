import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './context/AuthContext';

import LoadingSpinner from './components/common/LoadingSpinner';
import { shouldRedirectToHttps } from './config/runtime';

const Landing = lazy(() => import('./pages/Landing'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const StaffLogin = lazy(() => import('./pages/StaffLogin'));
const StaffDashboard = lazy(() => import('./pages/StaffDashboard'));
const StaffHistory = lazy(() => import('./pages/StaffHistory'));

const ProtectedRoute = ({ children, roleRequired }) => {
  const { session, loading } = useAuthContext();
  if (loading) return <div className="h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  if (!session) return <Navigate to={roleRequired === 'admin' ? '/admin-login' : '/staff-login'} />;
  if (session.role !== roleRequired) return <Navigate to="/" />;
  return children;
};

function AppContent() {
  const { loading } = useAuthContext();

  useEffect(() => {
    if (shouldRedirectToHttps()) {
      window.location.replace(`https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`);
    }
  }, []);

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  }

  return (
    <Router>
      <Suspense fallback={<div className="h-screen flex items-center justify-center"><LoadingSpinner /></div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/staff-login" element={<StaffLogin />} />
          
          <Route path="/admin-dashboard" element={
            <ProtectedRoute roleRequired="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/staff-dashboard" element={
            <ProtectedRoute roleRequired="staff">
              <StaffDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/staff-history" element={
            <ProtectedRoute roleRequired="staff">
              <StaffHistory />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
