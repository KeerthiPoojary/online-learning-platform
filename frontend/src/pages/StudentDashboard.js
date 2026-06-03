import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
  FaBook, FaPlay, FaStar, FaCheckCircle, FaClock, FaChartLine, 
  FaTrophy, FaUserGraduate, FaArrowRight, FaCertificate, FaFire, FaSpinner
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [courseProgress, setCourseProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    totalHours: 0,
    certificatesEarned: 0
  });

  useEffect(() => {
    fetchData();
    fetchLearningStreak();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Get enrolled courses
      const enrolledRes = await axios.get(
  'https://online-learning-platform-99mm.onrender.com/api/courses/student/enrolled',
  { headers }
);
      const enrolled = enrolledRes.data.courses || [];
      setEnrolledCourses(enrolled);
      
      // Get progress for each enrolled course
      const progressMap = {};
      let completedCount = 0;
      let totalHoursCount = 0;
      
      for (const course of enrolled) {
        try {
          const progressRes = await axios.get(
  `https://online-learning-platform-99mm.onrender.com/api/courses/progress/${course.id}`,
  { headers }
);
          progressMap[course.id] = progressRes.data;
          if (progressRes.data.percentage === 100) completedCount++;
          totalHoursCount += (progressRes.data.completedLessons || 0) * 1;
        } catch (err) {
          console.error('Error fetching progress for course:', course.id);
        }
      }
      setCourseProgress(progressMap);
      
      // Get available courses (only approved courses not enrolled)
      const allCoursesRes = await axios.get('https://online-learning-platform-99mm.onrender.com/api/courses');
      const allCourses = allCoursesRes.data.courses || [];
      const enrolledIds = new Set(enrolled.map(c => c.id));
      const available = allCourses.filter(c => !enrolledIds.has(c.id));
      setAvailableCourses(available);
      
      // Calculate stats
      setStats({
        totalCourses: enrolled.length,
        completedCourses: completedCount,
        totalHours: totalHoursCount,
        certificatesEarned: completedCount
      });
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchLearningStreak = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('https://online-learning-platform-99mm.onrender.com/api/courses/learning-streak', { headers });
      setStreak(response.data.streak);
    } catch (error) {
      console.error('Error fetching streak:', error);
    }
  };

  const handleEnroll = async (courseId, courseTitle) => {
    if (!user) {
      toast.error('Please login to enroll');
      return;
    }
    
    setEnrolling(true);
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      console.log('Enrolling in course:', courseId);
      
      const response = await axios.post(
        `https://online-learning-platform-99mm.onrender.com/api/courses/${courseId}/enroll`,
        {},
        { headers }
      );
      
      console.log('Enrollment response:', response.data);
      
      if (response.data.message) {
        toast.success(`✅ Successfully enrolled in "${courseTitle}"!`);
        // Refresh the data to show the course in enrolled section
        fetchData();
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to enroll';
      
      if (errorMsg === 'Already enrolled in this course') {
        toast.error('You are already enrolled in this course');
      } else if (errorMsg === 'Course is not yet approved') {
        toast.error('This course is pending approval');
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setEnrolling(false);
    }
  };

  const ProgressBar = ({ progress }) => (
    <div className="relative pt-1">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-semibold text-gray-600">Progress</span>
        <span className="text-xs font-semibold text-blue-600">{progress}%</span>
      </div>
      <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-200">
        <div 
          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const CourseCard = ({ course, isEnrolled = false, progress = 0 }) => (
    <div className="group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="relative h-48 overflow-hidden">
        {course.thumbnail ? (
          <img 
            src={course.thumbnail} 
            alt={course.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `https://picsum.photos/400/200?random=${course.id}`;
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <FaBook className="text-white text-5xl opacity-80" />
          </div>
        )}
        {isEnrolled && progress === 100 && (
          <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
            <FaCheckCircle className="text-xs" /> Completed
          </div>
        )}
        {!isEnrolled && course.price === 0 && (
          <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-md text-xs font-semibold">
            Free
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-lg text-gray-900 line-clamp-1 flex-1">{course.title}</h3>
        </div>
        <p className="text-gray-500 text-sm mb-2 flex items-center gap-1">
          <FaUserGraduate className="text-xs" /> {course.instructor_name || 'Expert Instructor'}
        </p>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {course.description?.substring(0, 100)}...
        </p>
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <FaStar className="text-yellow-400 text-sm" />
            <span className="text-sm text-gray-600">{course.avg_rating || 'New'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FaClock className="text-xs" />
            <span>{course.total_lessons || 0} lessons</span>
          </div>
        </div>
        
        {isEnrolled ? (
          <div className="space-y-3">
            <ProgressBar progress={progress} />
            <Link 
              to={`/course/learn/${course.id}`}
              className="block text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium"
            >
              <FaPlay className="inline mr-2 text-sm" /> Continue Learning
            </Link>
          </div>
        ) : (
          <button
            onClick={() => handleEnroll(course.id, course.title)}
            disabled={enrolling}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium disabled:opacity-50"
          >
            {enrolling ? 'Enrolling...' : 'Enroll Now'}
          </button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Loading your learning journey...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const totalCompletedLessons = Object.values(courseProgress).reduce((sum, p) => sum + (p.completedLessons || 0), 0);
  const totalLessons = Object.values(courseProgress).reduce((sum, p) => sum + (p.totalLessons || 0), 0);
  const overallProgress = totalLessons > 0 ? Math.round((totalCompletedLessons / totalLessons) * 100) : 0;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                  Welcome back, <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{user?.name}</span>!
                </h1>
                <p className="text-gray-600 mt-2">Continue your learning journey and achieve your goals</p>
              </div>
              
              {/* Learning Streak */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-sm ${
                streak > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-gray-100'
              }`}>
                <FaFire className={`text-lg ${streak > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
                <span className="text-sm font-medium">
                  {streak === 0 ? (
                    <span className="text-gray-500">Complete a lesson to start your streak! 🔥</span>
                  ) : (
                    <span className="text-orange-600 font-bold">{streak} day{streak > 1 ? 's' : ''} learning streak! 🔥</span>
                  )}
                </span>
              </div>
            </div>
          </div>
          
          {/* Stats Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard 
              title="Enrolled Courses" 
              value={stats.totalCourses} 
              icon={<FaBook className="text-white text-lg" />}
              color="bg-gradient-to-r from-blue-500 to-blue-600"
              subtitle="Active courses"
            />
            <StatCard 
              title="Completed" 
              value={stats.completedCourses} 
              icon={<FaCheckCircle className="text-white text-lg" />}
              color="bg-gradient-to-r from-green-500 to-green-600"
              subtitle="Courses finished"
            />
            <StatCard 
              title="Learning Hours" 
              value={stats.totalHours} 
              icon={<FaClock className="text-white text-lg" />}
              color="bg-gradient-to-r from-orange-500 to-orange-600"
              subtitle="Total time spent"
            />
            <StatCard 
              title="Certificates" 
              value={stats.certificatesEarned} 
              icon={<FaCertificate className="text-white text-lg" />}
              color="bg-gradient-to-r from-purple-500 to-purple-600"
              subtitle="Earned credentials"
            />
          </div>
          
          {/* Overall Progress Card */}
          {enrolledCourses.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <FaChartLine className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Your Learning Progress</h3>
                    <p className="text-sm text-gray-500">Track your overall course completion</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{overallProgress}%</p>
                  <p className="text-sm text-gray-500">Overall completion</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full h-3 transition-all duration-500"
                    style={{ width: `${overallProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>{totalCompletedLessons} lessons completed</span>
                  <span>{totalLessons} total lessons</span>
                </div>
              </div>
            </div>
          )}
          
          
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">My Courses</h2>
                <p className="text-gray-500 text-sm mt-1">Continue where you left off</p>
              </div>
              {enrolledCourses.length > 0 && (
                <Link to="/courses" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                  Browse More <FaArrowRight className="text-xs" />
                </Link>
              )}
            </div>
            
            {enrolledCourses.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaBook className="text-blue-600 text-3xl" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Start Your Learning Journey</h3>
                <p className="text-gray-500 mb-6">You haven't enrolled in any courses yet. Browse our catalog and find the perfect course for you.</p>
                <Link 
                  to="/courses" 
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2.5 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
                >
                  Explore Courses <FaArrowRight />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledCourses.map((course) => {
                  const progress = courseProgress[course.id] || { percentage: course.progress || 0 };
                  return (
                    <CourseCard 
                      key={course.id} 
                      course={course} 
                      isEnrolled={true}
                      progress={progress.percentage || course.progress || 0}
                    />
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Available Courses Section */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Recommended for You</h2>
                <p className="text-gray-500 text-sm mt-1">Discover new courses to accelerate your career</p>
              </div>
              {availableCourses.length > 0 && (
                <Link to="/courses" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                  View All <FaArrowRight className="text-xs" />
                </Link>
              )}
            </div>
            
            {availableCourses.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-green-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaTrophy className="text-green-600 text-3xl" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h3>
                <p className="text-gray-500 mb-4">You're enrolled in all available courses. Check back later for new courses!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableCourses.map((course) => (
                  <CourseCard key={course.id} course={course} isEnrolled={false} />
                ))}
              </div>
            )}
          </div>
          
          {/* Motivational Quote */}
          <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white text-center">
            <FaTrophy className="text-3xl mx-auto mb-3 opacity-80" />
            <p className="text-lg font-medium">"The beautiful thing about learning is that no one can take it away from you."</p>
            <p className="text-sm opacity-80 mt-2">— B.B. King</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default StudentDashboard;