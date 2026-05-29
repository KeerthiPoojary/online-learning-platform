import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

// Public Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CourseListingPage from './pages/CourseListingPage';
import CourseDetails from './pages/CourseDetails';

// Dashboard Pages
import StudentDashboard from './pages/StudentDashboard';
import InstructorDashboard from './pages/InstructorDashboard';
import AdminDashboard from './pages/AdminDashboard';

// Course Management
import CreateCourse from './pages/CreateCourse';
import EditCourse from './pages/EditCourse';
import CourseLearn from './pages/CourseLearn';
import CourseLessons from './pages/CourseLessons';  // IMPORT THIS

// Feature Pages
import LiveClass from './pages/LiveClass';
import Quizzes from './pages/Quizzes';
import Assignments from './pages/Assignments';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/courses" element={<CourseListingPage />} />
          <Route path="/courses/:id" element={<CourseDetails />} />
          
          {/* Student Routes */}
          <Route path="/student/dashboard" element={
            <PrivateRoute roles={['student']}>
              <StudentDashboard />
            </PrivateRoute>
          } />
          <Route path="/course/learn/:id" element={
            <PrivateRoute roles={['student']}>
              <CourseLearn />
            </PrivateRoute>
          } />
          
          {/* Instructor Routes */}
          <Route path="/instructor/dashboard" element={
            <PrivateRoute roles={['instructor', 'admin']}>
              <InstructorDashboard />
            </PrivateRoute>
          } />
          <Route path="/instructor/courses/create" element={
            <PrivateRoute roles={['instructor', 'admin']}>
              <CreateCourse />
            </PrivateRoute>
          } />
          <Route path="/instructor/courses/:id/edit" element={
            <PrivateRoute roles={['instructor', 'admin']}>
              <EditCourse />
            </PrivateRoute>
          } />
          {/* IMPORTANT: This route must be before the catch-all */}
          <Route path="/instructor/courses/:courseId/lessons" element={
            <PrivateRoute roles={['instructor', 'admin']}>
              <CourseLessons />
            </PrivateRoute>
          } />
          <Route path="/instructor/live-class" element={
            <PrivateRoute roles={['instructor', 'admin']}>
              <LiveClass />
            </PrivateRoute>
          } />
          <Route path="/instructor/quizzes" element={
            <PrivateRoute roles={['instructor', 'admin']}>
              <Quizzes />
            </PrivateRoute>
          } />
          <Route path="/instructor/assignments" element={
            <PrivateRoute roles={['instructor', 'admin']}>
              <Assignments />
            </PrivateRoute>
          } />
          
          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={
            <PrivateRoute roles={['admin']}>
              <AdminDashboard />
            </PrivateRoute>
          } />
          
          {/* Catch all - must be LAST */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;