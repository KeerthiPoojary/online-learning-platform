import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import CourseList from './components/Courses/CourseList';
import CourseDetail from './components/Courses/CourseDetail';
import CourseForm from './components/Courses/CourseForm';
import StudentDashboard from './components/Dashboard/StudentDashboard';
import InstructorDashboard from './components/Dashboard/InstructorDashboard';
import AdminDashboard from './components/Dashboard/AdminDashboard';
import './styles/App.css';

// Helper functions
const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

const getUserRole = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user.role;
    } catch(e) {
      return null;
    }
  }
  return null;
};

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const authenticated = isAuthenticated();
  const userRole = getUserRole();
  
  if (!authenticated) {
    return <Navigate to="/login" />;
  }
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    if (userRole === 'admin') {
      return <Navigate to="/admin" />;
    } else if (userRole === 'instructor') {
      return <Navigate to="/instructor-dashboard" />;
    } else {
      return <Navigate to="/courses" />;
    }
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-brand">🎓 E-Learning Platform</div>
          <div className="nav-links">
            <a href="/courses">Courses</a>
            {isAuthenticated() && getUserRole() === 'admin' && <a href="/admin">Admin</a>}
            {!isAuthenticated() ? (
              <>
                <a href="/login">Login</a>
                <a href="/register">Register</a>
              </>
            ) : (
              <a href="/login" onClick={(e) => {
                e.preventDefault();
                localStorage.clear();
                window.location.href = '/login';
              }}>Logout</a>
            )}
          </div>
        </nav>
        
        <main className="main-content">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Navigate to="/courses" />} />
            <Route path="/courses" element={
              <ProtectedRoute>
                <CourseList />
              </ProtectedRoute>
            } />
            <Route path="/courses/:id" element={
              <ProtectedRoute>
                <CourseDetail />
              </ProtectedRoute>
            } />
            <Route path="/create-course" element={
              <ProtectedRoute allowedRoles={['instructor', 'admin']}>
                <CourseForm />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/instructor-dashboard" element={
              <ProtectedRoute allowedRoles={['instructor', 'admin']}>
                <InstructorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </main>
        
        <footer className="footer">
          <p>&copy; 2024 E-Learning Platform. All rights reserved.</p>
        </footer>
        <Toaster position="top-right" />
      </div>
    </Router>
  );
}

export default App;