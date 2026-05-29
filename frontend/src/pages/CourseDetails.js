import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaStar, FaUser, FaClock, FaPlay, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const CourseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    fetchCourse();
    checkEnrollment();
  }, [id]);

  const fetchCourse = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/courses/${id}`);
      setCourse(response.data);
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollment = async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`http://localhost:5000/api/courses/${id}/check-enrollment`, { headers });
      setIsEnrolled(response.data.enrolled);
    } catch (error) {
      console.error('Error checking enrollment:', error);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      toast.error('Please login to enroll');
      navigate('/login');
      return;
    }
    
    setEnrolling(true);
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.post(
        `http://localhost:5000/api/courses/${id}/enroll`,
        {},
        { headers }
      );
      
      if (response.data.message) {
        toast.success(`Successfully enrolled in "${course?.title}"!`);
        setIsEnrolled(true);
        // Redirect to course learning page
        setTimeout(() => {
          navigate(`/course/learn/${id}`);
        }, 1500);
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to enroll';
      
      if (errorMsg === 'Already enrolled in this course') {
        toast.error('You are already enrolled in this course');
        setIsEnrolled(true);
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <FaSpinner className="animate-spin text-4xl text-blue-600" />
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-gray-700">Course not found</h2>
          <Link to="/courses" className="text-blue-600 hover:underline mt-4 inline-block">Back to Courses</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link to="/courses" className="text-blue-600 hover:underline mb-6 inline-block">← Back to Courses</Link>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {course.thumbnail && (
            <img 
              src={course.thumbnail} 
              alt={course.title}
              className="w-full h-64 object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
              }}
            />
          )}
          
          <div className="p-6">
            <h1 className="text-3xl font-bold mb-4">{course.title}</h1>
            
            <div className="flex flex-wrap items-center gap-4 mb-4 text-gray-600">
              <span className="flex items-center gap-2">
                <FaUser className="text-gray-400" /> 
                {course.instructor_name || 'Expert Instructor'}
              </span>
              <span className="flex items-center gap-2">
                <FaStar className="text-yellow-400" /> 
                {course.avg_rating || 'No ratings yet'}
              </span>
              <span className="flex items-center gap-2">
                <FaClock className="text-gray-400" /> 
                Self-paced
              </span>
              <span className="px-2 py-1 bg-gray-100 rounded-full text-sm">
                {course.level || 'Beginner'}
              </span>
            </div>
            
            <p className="text-gray-700 mb-6 leading-relaxed">{course.description}</p>
            
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-3xl font-bold text-blue-600">
                {course.price === 0 ? 'Free' : `$${course.price}`}
              </div>
              
              {isEnrolled ? (
                <div className="flex gap-3">
                  <div className="bg-green-100 text-green-700 px-4 py-2 rounded-md flex items-center gap-2">
                    <FaCheckCircle /> Already Enrolled
                  </div>
                  <Link 
                    to={`/course/learn/${course.id}`}
                    className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors"
                  >
                    <FaPlay className="inline mr-2" /> Start Learning
                  </Link>
                </div>
              ) : (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                >
                  {enrolling ? <FaSpinner className="animate-spin inline mr-2" /> : null}
                  {enrolling ? 'Enrolling...' : 'Enroll Now'}
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Course Content Section */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Course Content</h2>
          {course.lessons && course.lessons.length > 0 ? (
            <div className="space-y-3">
              {course.lessons.map((lesson, index) => (
                <div key={lesson.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{lesson.title}</h3>
                    {lesson.duration && <p className="text-sm text-gray-500">{lesson.duration} minutes</p>}
                  </div>
                  {lesson.video_url && <FaPlay className="text-gray-400" />}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No lessons available for this course yet.</p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CourseDetails;