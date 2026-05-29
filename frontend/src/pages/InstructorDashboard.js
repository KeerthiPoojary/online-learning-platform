import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaPlus, FaEdit, FaTrash, FaEye, FaUsers, FaChartLine, 
  FaDollarSign, FaStar, FaVideo, FaFileAlt, FaQuestionCircle,
  FaBookOpen, FaUserGraduate, FaChalkboardTeacher, FaArrowRight,
  FaCheckCircle, FaClock, FaDownload, FaUpload, FaTrophy
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';

const InstructorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalRevenue: 0,
    averageRating: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [quizResults, setQuizResults] = useState([]);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);
  const [courseEnrollments, setCourseEnrollments] = useState([]);
  const [gradingModal, setGradingModal] = useState(null);
  const [gradeValue, setGradeValue] = useState('');
  const [feedbackValue, setFeedbackValue] = useState('');
  const [activityTab, setActivityTab] = useState('enrollments');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [coursesRes, statsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/instructor/courses', { headers }),
        axios.get('http://localhost:5000/api/instructor/stats', { headers })
      ]);
      
      setCourses(coursesRes.data.courses || []);
      setStats(statsRes.data);
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseActivity = async (courseId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch course enrollments with student details
      const enrollmentsRes = await axios.get(`http://localhost:5000/api/instructor/course/${courseId}/enrollments`, { headers });
      setCourseEnrollments(enrollmentsRes.data.enrollments || []);
      
      // Fetch quiz results for this course
      const quizzesRes = await axios.get(`http://localhost:5000/api/instructor/course/${courseId}/quiz-results`, { headers });
      setQuizResults(quizzesRes.data.results || []);
      
      // Fetch assignment submissions for this course
      const assignmentsRes = await axios.get(`http://localhost:5000/api/instructor/course/${courseId}/assignments`, { headers });
      setAssignmentSubmissions(assignmentsRes.data.submissions || []);
      
    } catch (error) {
      console.error('Error fetching course activity:', error);
      toast.error('Failed to load course activity');
    } finally {
      setLoading(false);
    }
  };

  const handleViewActivity = async (course) => {
    setSelectedCourse(course);
    setActivityTab('enrollments');
    await fetchCourseActivity(course.id);
  };

  const handleGradeAssignment = async (submissionId) => {
    if (!gradeValue) {
      toast.error('Please enter a grade');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.put(`http://localhost:5000/api/assignments/grade/${submissionId}`, {
        grade: parseInt(gradeValue),
        feedback: feedbackValue
      }, { headers });
      
      toast.success('Grade submitted successfully');
      setGradingModal(null);
      setGradeValue('');
      setFeedbackValue('');
      
      // Refresh activity
      if (selectedCourse) {
        await fetchCourseActivity(selectedCourse.id);
      }
    } catch (error) {
      console.error('Error grading assignment:', error);
      toast.error('Failed to submit grade');
    }
  };

  const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color}`}>{icon}</div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Instructor Dashboard</h1>
        <p className="text-gray-600 mb-6">Welcome back, {user?.name}!</p>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Courses" value={stats.totalCourses} icon={<FaBookOpen className="text-white text-xl" />} color="bg-blue-500" />
          <StatCard title="Total Students" value={stats.totalStudents} icon={<FaUsers className="text-white text-xl" />} color="bg-green-500" />
          <StatCard title="Total Revenue" value={`$${stats.totalRevenue}`} icon={<FaDollarSign className="text-white text-xl" />} color="bg-yellow-500" />
          <StatCard title="Average Rating" value={`${stats.averageRating} ⭐`} icon={<FaStar className="text-white text-xl" />} color="bg-purple-500" />
        </div>
        
        {/* Course List */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">My Courses</h2>
            <Link 
              to="/instructor/courses/create"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <FaPlus /> Create New Course
            </Link>
          </div>
          
          {courses.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <FaBookOpen className="text-gray-400 text-6xl mx-auto mb-4" />
              <p className="text-gray-500 text-lg">You haven't created any courses yet.</p>
              <Link 
                to="/instructor/courses/create"
                className="inline-block mt-4 text-blue-600 hover:text-blue-800"
              >
                Click here to create your first course <FaArrowRight className="inline ml-1" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div key={course.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  {course.thumbnail ? (
                    <img 
                      src={course.thumbnail} 
                      alt={course.title}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/400x200?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                      <FaBookOpen className="text-white text-5xl" />
                    </div>
                  )}
                  
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">{course.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        course.status === 'approved' ? 'bg-green-100 text-green-800' : 
                        course.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {course.status || 'pending'}
                      </span>
                    </div>
                    
                    {course.category_name && (
                      <p className="text-sm text-gray-500 mb-2">{course.category_name}</p>
                    )}
                    
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {course.description?.substring(0, 100)}...
                    </p>
                    
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <FaUsers /> <span>{course.student_count || 0} students</span>
                      </div>
                      <div className="text-lg font-bold text-blue-600">
                        {course.price === 0 ? 'Free' : `$${course.price}`}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 pt-3 border-t">
                      <button
                        onClick={() => handleViewActivity(course)}
                        className="text-purple-600 hover:text-purple-800 transition-colors flex items-center gap-1 text-sm"
                      >
                        <FaChartLine /> View Activity
                      </button>
                      <Link 
                        to={`/instructor/courses/${course.id}/lessons`}
                        className="text-purple-600 hover:text-purple-800 transition-colors flex items-center gap-1 text-sm"
                      >
                        <FaVideo /> Content
                      </Link>
                      <Link 
                        to={`/instructor/courses/${course.id}/edit`}
                        className="text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 text-sm"
                      >
                        <FaEdit /> Edit
                      </Link>
                      <button 
                        onClick={async () => {
                          if (window.confirm('Delete this course?')) {
                            const token = localStorage.getItem('token');
                            await axios.delete(`http://localhost:5000/api/courses/${course.id}`, {
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            toast.success('Course deleted');
                            loadData();
                          }
                        }}
                        className="text-red-600 hover:text-red-800 transition-colors flex items-center gap-1 text-sm"
                      >
                        <FaTrash /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Activity Modal */}
        {selectedCourse && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">{selectedCourse.title}</h2>
                  <p className="text-gray-500 text-sm">Student Activity & Performance</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedCourse(null);
                    setCourseEnrollments([]);
                    setQuizResults([]);
                    setAssignmentSubmissions([]);
                  }} 
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              {/* Activity Tabs */}
              <div className="border-b px-6">
                <div className="flex space-x-6">
                  <button
                    onClick={() => setActivityTab('enrollments')}
                    className={`py-3 px-1 text-sm font-medium ${
                      activityTab === 'enrollments'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FaUsers className="inline mr-2" /> Enrolled Students ({courseEnrollments.length})
                  </button>
                  <button
                    onClick={() => setActivityTab('quizzes')}
                    className={`py-3 px-1 text-sm font-medium ${
                      activityTab === 'quizzes'
                        ? 'border-b-2 border-green-500 text-green-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FaQuestionCircle className="inline mr-2" /> Quiz Results ({quizResults.length})
                  </button>
                  <button
                    onClick={() => setActivityTab('assignments')}
                    className={`py-3 px-1 text-sm font-medium ${
                      activityTab === 'assignments'
                        ? 'border-b-2 border-orange-500 text-orange-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FaFileAlt className="inline mr-2" /> Assignments ({assignmentSubmissions.length})
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {activityTab === 'enrollments' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Enrolled Students</h3>
                    {courseEnrollments.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No students enrolled yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enrolled Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                             </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {courseEnrollments.map((enrollment) => (
                              <tr key={enrollment.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {enrollment.student_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {enrollment.student_email}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(enrollment.enrolled_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="w-32">
                                    <div className="flex justify-between text-xs mb-1">
                                      <span className="text-gray-600">Progress</span>
                                      <span className="text-gray-600">{enrollment.progress || 0}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-blue-600 rounded-full h-2"
                                        style={{ width: `${enrollment.progress || 0}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    enrollment.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {enrollment.completed ? 'Completed' : 'In Progress'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
                
                {activityTab === 'quizzes' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Quiz Results</h3>
                    {quizResults.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No quiz submissions yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quiz</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                             </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {quizResults.map((result, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {result.student_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {result.quiz_title}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  {result.score}%
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    result.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {result.passed ? 'Passed' : 'Failed'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(result.submitted_at).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
                
                {activityTab === 'assignments' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Assignment Submissions</h3>
                    {assignmentSubmissions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No assignment submissions yet.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {assignmentSubmissions.map((submission, idx) => (
                          <div key={idx} className="bg-gray-50 rounded-lg p-4 border">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-semibold">{submission.assignment_title}</h4>
                                <p className="text-sm text-gray-600">Student: {submission.student_name} ({submission.student_email})</p>
                                <p className="text-sm text-gray-500">Submitted: {new Date(submission.submitted_at).toLocaleString()}</p>
                              </div>
                              {submission.grade !== null ? (
                                <div className="text-right">
                                  <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                    Grade: {submission.grade}/{submission.total_points || 100}
                                  </span>
                                  {submission.feedback && (
                                    <p className="text-xs text-gray-500 mt-1 max-w-xs">{submission.feedback}</p>
                                  )}
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setGradingModal(submission);
                                    setGradeValue('');
                                    setFeedbackValue('');
                                  }}
                                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                                >
                                  Grade Submission
                                </button>
                              )}
                            </div>
                            <div className="bg-white p-3 rounded">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{submission.submission_text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Grading Modal */}
        {gradingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Grade Assignment</h3>
                <button onClick={() => setGradingModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Student: <span className="font-medium">{gradingModal.student_name}</span></p>
                <p className="text-sm text-gray-600 mb-4">Assignment: <span className="font-medium">{gradingModal.assignment_title}</span></p>
                
                <label className="block text-sm font-medium mb-1">Grade (out of {gradingModal.total_points || 100})</label>
                <input
                  type="number"
                  value={gradeValue}
                  onChange={(e) => setGradeValue(e.target.value)}
                  className="w-full border rounded-md p-2 mb-4"
                  placeholder="Enter grade"
                  max={gradingModal.total_points || 100}
                />
                
                <label className="block text-sm font-medium mb-1">Feedback (Optional)</label>
                <textarea
                  value={feedbackValue}
                  onChange={(e) => setFeedbackValue(e.target.value)}
                  className="w-full border rounded-md p-2"
                  rows="3"
                  placeholder="Add feedback for the student..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setGradingModal(null)} className="px-4 py-2 border rounded-md">Cancel</button>
                <button onClick={() => handleGradeAssignment(gradingModal.id)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Submit Grade
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default InstructorDashboard;