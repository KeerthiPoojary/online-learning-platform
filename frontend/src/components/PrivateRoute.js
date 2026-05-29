import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, roles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  if (roles && !roles.includes(user?.role)) {
    // Redirect to appropriate dashboard based on role
    switch (user?.role) {
      case 'student':
        return <Navigate to="/student/dashboard" replace />;
      case 'instructor':
        return <Navigate to="/instructor/dashboard" replace />;
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default PrivateRoute;