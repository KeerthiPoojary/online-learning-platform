import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FaBookOpen, FaVideo, FaCertificate, FaChalkboardTeacher, 
  FaUsers, FaStar, FaClock, FaArrowRight, FaCheckCircle,
  FaLaptopCode, FaChartLine, FaUserGraduate, FaTrophy,
  FaQuoteLeft, FaPlay, FaRocket, FaShieldAlt, FaHeadset
} from 'react-icons/fa';
import { motion } from 'framer-motion';

const HomePage = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [stats, setStats] = useState({
    students: 0,
    courses: 0,
    instructors: 0,
    certificates: 0
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    
    // Animate stats
    const animateStats = () => {
      const targets = { students: 15000, courses: 500, instructors: 100, certificates: 8000 };
      const duration = 2000;
      const stepTime = 20;
      const steps = duration / stepTime;
      let currentStep = 0;
      
      const interval = setInterval(() => {
        currentStep++;
        if (currentStep <= steps) {
          setStats({
            students: Math.floor(targets.students * (currentStep / steps)),
            courses: Math.floor(targets.courses * (currentStep / steps)),
            instructors: Math.floor(targets.instructors * (currentStep / steps)),
            certificates: Math.floor(targets.certificates * (currentStep / steps))
          });
        } else {
          clearInterval(interval);
        }
      }, stepTime);
    };
    
    animateStats();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const features = [
    { icon: <FaChalkboardTeacher className="text-4xl" />, title: "Expert Instructors", description: "Learn from industry professionals with years of experience", color: "from-blue-500 to-blue-600" },
    { icon: <FaVideo className="text-4xl" />, title: "Video Lessons", description: "High-quality video content available anytime, anywhere", color: "from-purple-500 to-purple-600" },
    { icon: <FaCertificate className="text-4xl" />, title: "Certificates", description: "Get certified and boost your career after completion", color: "from-green-500 to-green-600" },
    { icon: <FaLaptopCode className="text-4xl" />, title: "Hands-on Projects", description: "Learn by doing with real-world projects and assignments", color: "from-orange-500 to-orange-600" },
    { icon: <FaChartLine className="text-4xl" />, title: "Career Growth", description: "Advance your career with in-demand skills", color: "from-red-500 to-red-600" },
    { icon: <FaHeadset className="text-4xl" />, title: "24/7 Support", description: "Get help whenever you need it from our support team", color: "from-teal-500 to-teal-600" }
  ];

  const testimonials = [
    { name: "Sarah Johnson", role: "Data Scientist", content: "This platform transformed my career! The courses are well-structured and the instructors are amazing.", rating: 5, image: "https://randomuser.me/api/portraits/women/1.jpg" },
    { name: "Michael Chen", role: "Web Developer", content: "Best learning platform I've ever used. The hands-on projects really helped me understand the concepts.", rating: 5, image: "https://randomuser.me/api/portraits/men/2.jpg" },
    { name: "Emily Rodriguez", role: "Business Analyst", content: "The flexibility to learn at my own pace made all the difference. Highly recommended!", rating: 5, image: "https://randomuser.me/api/portraits/women/3.jpg" }
  ];

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: { transition: { staggerChildren: 0.1 } }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-lg py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <FaBookOpen className="text-white text-xl" />
              </div>
              <span className={`text-xl font-bold ${scrolled ? 'text-gray-900' : 'text-white'} transition-colors`}>
                LearnHub
              </span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/courses" className={`${scrolled ? 'text-gray-700' : 'text-white'} hover:text-blue-500 transition`}>Courses</Link>
              <Link to="/about" className={`${scrolled ? 'text-gray-700' : 'text-white'} hover:text-blue-500 transition`}>About</Link>
              <Link to="/contact" className={`${scrolled ? 'text-gray-700' : 'text-white'} hover:text-blue-500 transition`}>Contact</Link>
              {!isAuthenticated ? (
                <>
                  <Link to="/login" className={`px-4 py-2 rounded-lg ${scrolled ? 'text-gray-700 hover:text-blue-600' : 'text-white hover:text-gray-200'} transition`}>
                    Login
                  </Link>
                  <Link to="/register" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition shadow-md">
                    Sign Up Free
                  </Link>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link to={`/${user?.role}/dashboard`} className={`${scrolled ? 'text-gray-700' : 'text-white'} hover:text-blue-500 transition`}>
                    Dashboard
                  </Link>
                  <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition">
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <div className="absolute inset-0 bg-black opacity-30"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
                <FaRocket className="text-yellow-400" />
                <span className="text-white text-sm">🚀 Join 15,000+ learners worldwide</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
                Learn Anything,
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> Anytime, Anywhere</span>
              </h1>
              <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
                Master new skills with our expert-led courses. Join thousands of students advancing their careers.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/courses" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition shadow-lg inline-flex items-center gap-2 group">
                  Start Learning Now <FaArrowRight className="group-hover:translate-x-1 transition" />
                </Link>
                <Link to="/about" className="bg-white/10 backdrop-blur-sm text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition border border-white/20">
                  Learn More
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">{stats.students}+</div>
              <p className="text-gray-600 mt-2">Happy Students</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600">{stats.courses}+</div>
              <p className="text-gray-600 mt-2">Expert Courses</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600">{stats.instructors}+</div>
              <p className="text-gray-600 mt-2">Expert Instructors</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600">{stats.certificates}+</div>
              <p className="text-gray-600 mt-2">Certificates Issued</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-16" {...fadeInUp}>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Why Choose LearnHub?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">We provide the best learning experience with industry experts</p>
          </motion.div>
          
          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" variants={staggerContainer} initial="initial" animate="animate">
            {features.map((feature, index) => (
              <motion.div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 group" variants={fadeInUp}>
                <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Popular Courses Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Popular Courses</h2>
            <p className="text-xl text-gray-600">Most enrolled courses this month</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((item) => (
              <div key={item} className="bg-gray-50 rounded-2xl overflow-hidden hover:shadow-xl transition-shadow group">
                <div className="h-48 bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                  <FaLaptopCode className="text-white text-6xl" />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-blue-600 font-semibold">Development</span>
                    <div className="flex items-center gap-1">
                      <FaStar className="text-yellow-400" />
                      <span className="text-sm font-medium">4.8</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Complete Web Development Bootcamp</h3>
                  <p className="text-gray-600 mb-4">Learn HTML, CSS, JavaScript, React, Node.js and more</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaUserGraduate className="text-gray-400" />
                      <span className="text-sm text-gray-500">5,234 students</span>
                    </div>
                    <Link to="/courses" className="text-blue-600 font-semibold hover:text-blue-700 inline-flex items-center gap-1">
                      Learn More <FaArrowRight className="text-sm" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link to="/courses" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition shadow-md">
              View All Courses <FaArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">What Our Students Say</h2>
            <p className="text-xl text-blue-100">Join thousands of satisfied learners worldwide</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-xl">
                <FaQuoteLeft className="text-blue-400 text-3xl mb-4 opacity-50" />
                <p className="text-gray-700 mb-6 leading-relaxed">{testimonial.content}</p>
                <div className="flex items-center gap-4">
                  <img src={testimonial.image} alt={testimonial.name} className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Ready to Start Your Learning Journey?</h2>
          <p className="text-xl text-gray-600 mb-8">Join thousands of students and start learning today</p>
          <Link to="/register" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition shadow-lg text-lg">
            Get Started For Free <FaRocket />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <FaBookOpen className="text-white text-xl" />
                </div>
                <span className="text-xl font-bold">LearnHub</span>
              </div>
              <p className="text-gray-400">Empowering learners worldwide with quality education.</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link to="/courses" className="text-gray-400 hover:text-white transition">Courses</Link></li>
                <li><Link to="/about" className="text-gray-400 hover:text-white transition">About Us</Link></li>
                <li><Link to="/contact" className="text-gray-400 hover:text-white transition">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">Support</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">Connect With Us</h3>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition">Facebook</a>
                <a href="#" className="text-gray-400 hover:text-white transition">Twitter</a>
                <a href="#" className="text-gray-400 hover:text-white transition">LinkedIn</a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 LearnHub. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;