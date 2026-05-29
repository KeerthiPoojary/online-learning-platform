import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-blue-600">
                LearnHub
              </Link>
              <div className="hidden md:flex ml-10 space-x-4">
                <Link to="/courses" className="text-gray-700 hover:text-blue-600 px-3 py-2">
                  Courses
                </Link>
                {isAuthenticated && (
                  <>
                    <Link to={`/${user?.role}/dashboard`} className="text-gray-700 hover:text-blue-600 px-3 py-2">
                      Dashboard
                    </Link>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="relative group">
                  <button className="flex items-center space-x-2 text-gray-700 hover:text-blue-600">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <span>{user?.name}</span>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg hidden group-hover:block">
                    <Link to={`/${user?.role}/dashboard`} className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                      Dashboard
                    </Link>
                    <Link to="/profile" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Link to="/login" className="text-gray-700 hover:text-blue-600">
                    Login
                  </Link>
                  <Link to="/register" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">LearnHub</h3>
              <p className="text-gray-400">Empowering learners worldwide</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link to="/courses" className="text-gray-400 hover:text-white">Courses</Link></li>
                <li><Link to="/about" className="text-gray-400 hover:text-white">About Us</Link></li>
                <li><Link to="/contact" className="text-gray-400 hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Privacy Policy</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Connect With Us</h3>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white">Facebook</a>
                <a href="#" className="text-gray-400 hover:text-white">Twitter</a>
                <a href="#" className="text-gray-400 hover:text-white">LinkedIn</a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 LearnHub. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;