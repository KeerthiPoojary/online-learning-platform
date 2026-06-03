import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
  FaPlus, FaEdit, FaTrash, FaEye, FaUsers, FaChartLine, 
  FaDollarSign, FaStar, FaVideo, FaFileAlt, FaQuestionCircle,
  FaBookOpen, FaUserGraduate, FaChalkboardTeacher, FaArrowRight,
  FaTasks, FaSave, FaTimes, FaSpinner
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';

const InstructorDashboard = () => {
  const { user } = useAuth();
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
  const [actionLoading, setActionLoading] = useState(false);
  
  // Quiz management states
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [currentCourseForModal, setCurrentCourseForModal] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState(null);
  
  const [quizForm, setQuizForm] = useState({
    title: '',
    description: '',
    time_limit: 30,
    passing_score: 70,
    questions: []
  });
  
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    total_points: 100,
    due_date: '',
    instructions: ''
  });
  
  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    question_type: 'multiple_choice',
    points: 10,
    options: ['', '', '', ''],
    correct_answer: ''
  });
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const defaultImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"%3E%3Crect width="400" height="200" fill="%234f46e5"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="20"%3ECourse%3C/text%3E%3C/svg%3E';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login again');
        return;
      }
      
      const headers = { Authorization: `Bearer ${token}` };
      
      const coursesRes = await axios.get('https://online-learning-platform-99mm.onrender.com/api/instructor/courses', { headers });
      setCourses(coursesRes.data.courses || []);
      
      try {
        const statsRes = await axios.get('https://online-learning-platform-99mm.onrender.com/api/instructor/stats', { headers });
        setStats(statsRes.data);
      } catch (statsError) {
        setStats({
          totalCourses: coursesRes.data.courses?.length || 0,
          totalStudents: 0,
          totalRevenue: 0,
          averageRating: 0
        });
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error(error.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseQuizzes = async (courseId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`https://online-learning-platform-99mm.onrender.com/api/instructor/course/${courseId}/quizzes`, { headers });
      
      const quizzesData = response.data.quizzes || [];
      console.log('Fetched quizzes:', quizzesData);
      setQuizzes(quizzesData);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      setQuizzes([]);
      toast.error('Failed to load quizzes');
    }
  };

  const fetchCourseAssignments = async (courseId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`https://online-learning-platform-99mm.onrender.com/api/instructor/course/${courseId}/assignments`, { headers });
      setAssignments(response.data.assignments || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setAssignments([]);
    }
  };

  const fetchCourseActivity = async (courseId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      try {
        const enrollmentsRes = await axios.get(`https://online-learning-platform-99mm.onrender.com/api/instructor/course/${courseId}/enrollments`, { headers });
        setCourseEnrollments(enrollmentsRes.data.enrollments || []);
      } catch (err) {
        setCourseEnrollments([]);
      }
      
      try {
        const quizzesRes = await axios.get(`https://online-learning-platform-99mm.onrender.com/api/instructor/course/${courseId}/quiz-results`, { headers });
        setQuizResults(quizzesRes.data.results || []);
      } catch (err) {
        setQuizResults([]);
      }
      
      try {
        const assignmentsRes = await axios.get(`https://online-learning-platform-99mm.onrender.com/api/instructor/course/${courseId}/assignment-submissions`, { headers });
        setAssignmentSubmissions(assignmentsRes.data.submissions || []);
      } catch (err) {
        setAssignmentSubmissions([]);
      }
      
    } catch (error) {
      console.error('Error fetching course activity:', error);
    }
  };

  const handleViewActivity = async (course) => {
    setSelectedCourse(course);
    setActivityTab('enrollments');
    await fetchCourseActivity(course.id);
  };

  const handleManageQuizzes = async (course) => {
    setCurrentCourseForModal(course);
    setShowQuizModal(true);
    await fetchCourseQuizzes(course.id);
  };

  const handleManageAssignments = async (course) => {
    setCurrentCourseForModal(course);
    setShowAssignmentModal(true);
    await fetchCourseAssignments(course.id);
  };

  const handleEditQuiz = (quiz) => {
    console.log('Editing quiz:', quiz);
    
    let questions = quiz.questions || [];
    if (typeof questions === 'string') {
      try {
        questions = JSON.parse(questions);
      } catch (e) {
        questions = [];
      }
    }
    
    if (!Array.isArray(questions)) {
      questions = [];
    }
    
    setEditingQuiz(quiz);
    setQuizForm({
      title: quiz.title || '',
      description: quiz.description || '',
      time_limit: quiz.time_limit || 30,
      passing_score: quiz.passing_score || 70,
      questions: questions
    });
    setShowQuizModal(true);
  };

  const handleSaveQuiz = async () => {
    if (!quizForm.title) {
      toast.error('Please enter quiz title');
      return;
    }
    
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const quizData = {
        title: quizForm.title,
        description: quizForm.description,
        time_limit: quizForm.time_limit,
        passing_score: quizForm.passing_score,
        questions: quizForm.questions
      };
      
      if (editingQuiz) {
        await axios.put(`https://online-learning-platform-99mm.onrender.com/api/instructor/quizzes/${editingQuiz.id}`, quizData, { headers });
        toast.success('Quiz updated successfully');
      } else {
        await axios.post(`https://online-learning-platform-99mm.onrender.com/api/instructor/courses/${currentCourseForModal.id}/quizzes`, quizData, { headers });
        toast.success('Quiz created successfully');
      }
      
      setQuizForm({ title: '', description: '', time_limit: 30, passing_score: 70, questions: [] });
      setEditingQuiz(null);
      await fetchCourseQuizzes(currentCourseForModal.id);
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast.error(error.response?.data?.message || 'Failed to save quiz');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveAssignment = async () => {
    if (!assignmentForm.title) {
      toast.error('Please enter assignment title');
      return;
    }
    
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      if (editingAssignment) {
        await axios.put(`https://online-learning-platform-99mm.onrender.com/api/instructor/assignments/${editingAssignment.id}`, assignmentForm, { headers });
        toast.success('Assignment updated successfully');
      } else {
        await axios.post(`https://online-learning-platform-99mm.onrender.com/api/instructor/courses/${currentCourseForModal.id}/assignments`, assignmentForm, { headers });
        toast.success('Assignment created successfully');
      }
      
      setAssignmentForm({ title: '', description: '', total_points: 100, due_date: '', instructions: '' });
      setEditingAssignment(null);
      await fetchCourseAssignments(currentCourseForModal.id);
    } catch (error) {
      console.error('Error saving assignment:', error);
      toast.error(error.response?.data?.message || 'Failed to save assignment');
    } finally {
      setActionLoading(false);
    }
  };

  // UPDATED: handleAddQuestion - Stores correct answer as LETTER (A, B, C, D)
  const handleAddQuestion = () => {
    if (!questionForm.question_text) {
      toast.error('Please enter question text');
      return;
    }
    
    if (questionForm.question_type === 'multiple_choice' && !questionForm.correct_answer) {
      toast.error('Please select the correct answer');
      return;
    }
    
    if (questionForm.question_type === 'true_false' && !questionForm.correct_answer) {
      toast.error('Please select the correct answer (True/False)');
      return;
    }
    
    if (questionForm.question_type === 'text' && !questionForm.correct_answer) {
      toast.error('Please enter the expected answer or keywords');
      return;
    }
    
    let options = questionForm.options;
    if (questionForm.question_type === 'multiple_choice') {
      options = questionForm.options.filter(opt => opt && opt.trim() !== '');
      if (options.length < 2) {
        toast.error('Please add at least 2 options for multiple choice question');
        return;
      }
    }
    
    // For true/false, set options to ['True', 'False']
    if (questionForm.question_type === 'true_false') {
      options = ['True', 'False'];
    }
    
    const newQuestion = {
      id: editingQuestion?.id || Date.now(),
      question_text: questionForm.question_text,
      question_type: questionForm.question_type,
      points: questionForm.points || 10,
      options: options,
      correct_answer: questionForm.correct_answer  // This is now A, B, C, or D (the letter)
    };
    
    setQuizForm({
      ...quizForm,
      questions: editingQuestion 
        ? quizForm.questions.map(q => q.id === editingQuestion.id ? newQuestion : q)
        : [...quizForm.questions, newQuestion]
    });
    
    // Reset form
    setQuestionForm({
      question_text: '',
      question_type: 'multiple_choice',
      points: 10,
      options: ['', '', '', ''],
      correct_answer: ''
    });
    setEditingQuestion(null);
    setShowQuestionModal(false);
    toast.success('Question added successfully');
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setQuestionForm({
      question_text: question.question_text,
      question_type: question.question_type,
      points: question.points,
      options: question.options || (question.question_type === 'true_false' ? ['True', 'False'] : ['', '', '', '']),
      correct_answer: question.correct_answer || ''
    });
    setShowQuestionModal(true);
  };

  const handleDeleteQuiz = async (quizId) => {
    if (window.confirm('Are you sure you want to delete this quiz?')) {
      try {
        setActionLoading(true);
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        await axios.delete(`https://online-learning-platform-99mm.onrender.com/api/instructor/quizzes/${quizId}`, { headers });
        toast.success('Quiz deleted');
        await fetchCourseQuizzes(currentCourseForModal.id);
      } catch (error) {
        console.error('Error deleting quiz:', error);
        toast.error('Failed to delete quiz');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (window.confirm('Are you sure you want to delete this assignment?')) {
      try {
        setActionLoading(true);
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        await axios.delete(`https://online-learning-platform-99mm.onrender.com/api/instructor/assignments/${assignmentId}`, { headers });
        toast.success('Assignment deleted');
        await fetchCourseAssignments(currentCourseForModal.id);
      } catch (error) {
        console.error('Error deleting assignment:', error);
        toast.error('Failed to delete assignment');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleGradeAssignment = async (submissionId) => {
    if (!gradeValue) {
      toast.error('Please enter a grade');
      return;
    }
    
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.put(`https://online-learning-platform-99mm.onrender.com/api/instructor/assignments/grade/${submissionId}`, {
        grade: parseInt(gradeValue),
        feedback: feedbackValue
      }, { headers });
      
      toast.success('Grade submitted successfully');
      setGradingModal(null);
      setGradeValue('');
      setFeedbackValue('');
      
      if (selectedCourse) {
        await fetchCourseActivity(selectedCourse.id);
      }
    } catch (error) {
      console.error('Error grading assignment:', error);
      toast.error('Failed to submit grade');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }
    
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`https://online-learning-platform-99mm.onrender.com/api/courses/${courseId}`, { headers });
      toast.success('Course deleted successfully');
      await loadData();
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    } finally {
      setActionLoading(false);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
          <StatCard title="Total Courses" value={stats.totalCourses || courses.length} icon={<FaBookOpen className="text-white text-xl" />} color="bg-blue-500" />
          <StatCard title="Total Students" value={stats.totalStudents || 0} icon={<FaUsers className="text-white text-xl" />} color="bg-green-500" />
          <StatCard title="Total Revenue" value={`$${stats.totalRevenue || 0}`} icon={<FaDollarSign className="text-white text-xl" />} color="bg-yellow-500" />
          <StatCard title="Average Rating" value={`${stats.averageRating || 0} ⭐`} icon={<FaStar className="text-white text-xl" />} color="bg-purple-500" />
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
                  <img 
                    src={course.thumbnail || defaultImage} 
                    alt={course.title}
                    className="w-full h-48 object-cover"
                  />
                  
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg text-gray-900 truncate">{course.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
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
                        className="text-purple-600 hover:text-purple-800 text-sm flex items-center gap-1"
                      >
                        <FaChartLine /> Activity
                      </button>
                      <button
                        onClick={() => handleManageQuizzes(course)}
                        className="text-green-600 hover:text-green-800 text-sm flex items-center gap-1"
                      >
                        <FaQuestionCircle /> Quizzes
                      </button>
                      <button
                        onClick={() => handleManageAssignments(course)}
                        className="text-orange-600 hover:text-orange-800 text-sm flex items-center gap-1"
                      >
                        <FaTasks /> Assignments
                      </button>
                      <Link 
                        to={`/instructor/courses/${course.id}/lessons`}
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                      >
                        <FaVideo /> Content
                      </Link>
                      <Link 
                        to={`/instructor/courses/${course.id}/edit`}
                        className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
                      >
                        <FaEdit /> Edit
                      </Link>
                      <button 
                        onClick={() => handleDeleteCourse(course.id)}
                        className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
                        disabled={actionLoading}
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
        
        {/* Quiz Management Modal */}
        {showQuizModal && currentCourseForModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Manage Quizzes</h2>
                  <p className="text-gray-500">Course: {currentCourseForModal.title}</p>
                </div>
                <button 
                  onClick={() => { 
                    setShowQuizModal(false); 
                    setCurrentCourseForModal(null);
                    setEditingQuiz(null);
                    setQuizForm({ title: '', description: '', time_limit: 30, passing_score: 70, questions: [] });
                  }} 
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="p-6">
                {/* Create/Edit Quiz Form */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold mb-4">{editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input
                      type="text"
                      placeholder="Quiz Title"
                      value={quizForm.title}
                      onChange={(e) => setQuizForm({...quizForm, title: e.target.value})}
                      className="border rounded-md p-2"
                    />
                    <input
                      type="number"
                      placeholder="Time Limit (minutes)"
                      value={quizForm.time_limit}
                      onChange={(e) => setQuizForm({...quizForm, time_limit: parseInt(e.target.value)})}
                      className="border rounded-md p-2"
                    />
                    <input
                      type="number"
                      placeholder="Passing Score (%)"
                      value={quizForm.passing_score}
                      onChange={(e) => setQuizForm({...quizForm, passing_score: parseInt(e.target.value)})}
                      className="border rounded-md p-2"
                    />
                  </div>
                  <textarea
                    placeholder="Quiz Description"
                    value={quizForm.description}
                    onChange={(e) => setQuizForm({...quizForm, description: e.target.value})}
                    className="w-full border rounded-md p-2 mb-4"
                    rows="2"
                  />
                  
                  {/* Questions Section */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold">Questions ({quizForm.questions.length})</h4>
                      <button
                        onClick={() => {
                          setEditingQuestion(null);
                          setQuestionForm({
                            question_text: '',
                            question_type: 'multiple_choice',
                            points: 10,
                            options: ['', '', '', ''],
                            correct_answer: ''
                          });
                          setShowQuestionModal(true);
                        }}
                        className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700"
                      >
                        <FaPlus className="inline mr-1" size={12} /> Add Question
                      </button>
                    </div>
                    
                    {quizForm.questions.map((q, idx) => (
                      <div key={q.id} className="bg-white border rounded-lg p-3 mb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">{idx + 1}. {q.question_text}</p>
                            <p className="text-xs text-gray-500">
                              Type: {q.question_type} | Points: {q.points}
                            </p>
                            {q.question_type === 'multiple_choice' && q.options && (
                              <p className="text-xs text-gray-500 mt-1">
                                Options: {q.options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join(', ')} | 
                                <span className="text-green-600"> Correct: {q.correct_answer}</span>
                              </p>
                            )}
                            {q.question_type === 'true_false' && (
                              <p className="text-xs text-gray-500 mt-1">
                                <span className="text-green-600">Correct Answer: {q.correct_answer}</span>
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditQuestion(q)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => {
                                setQuizForm({
                                  ...quizForm,
                                  questions: quizForm.questions.filter(item => item.id !== q.id)
                                });
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    {editingQuiz && (
                      <button 
                        onClick={() => { 
                          setEditingQuiz(null); 
                          setQuizForm({ title: '', description: '', time_limit: 30, passing_score: 70, questions: [] }); 
                        }} 
                        className="px-4 py-2 border rounded-md"
                      >
                        Cancel Edit
                      </button>
                    )}
                    <button 
                      onClick={handleSaveQuiz} 
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      disabled={actionLoading}
                    >
                      {actionLoading ? <FaSpinner className="inline animate-spin mr-2" /> : <FaSave className="inline mr-2" />}
                      {editingQuiz ? 'Update Quiz' : 'Save Quiz'}
                    </button>
                  </div>
                </div>
                
                {/* Existing Quizzes List */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Existing Quizzes</h3>
                  {quizzes.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No quizzes created yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {quizzes.map(quiz => (
                        <div key={quiz.id} className="border rounded-lg p-4 flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold">{quiz.title}</h4>
                            <p className="text-sm text-gray-500">
                              {quiz.questions_count || 0} questions | Time: {quiz.time_limit} min | Passing: {quiz.passing_score}%
                            </p>
                            {quiz.description && (
                              <p className="text-xs text-gray-400 mt-1">{quiz.description.substring(0, 100)}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditQuiz(quiz)}
                              className="text-blue-600 hover:text-blue-800"
                              disabled={actionLoading}
                            >
                              <FaEdit />
                            </button>
                            <button onClick={() => handleDeleteQuiz(quiz.id)} className="text-red-600 hover:text-red-800" disabled={actionLoading}>
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Assignment Management Modal */}
        {showAssignmentModal && currentCourseForModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Manage Assignments</h2>
                  <p className="text-gray-500">Course: {currentCourseForModal.title}</p>
                </div>
                <button 
                  onClick={() => { 
                    setShowAssignmentModal(false); 
                    setCurrentCourseForModal(null);
                    setEditingAssignment(null);
                    setAssignmentForm({ title: '', description: '', total_points: 100, due_date: '', instructions: '' });
                  }} 
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="p-6">
                {/* Create/Edit Assignment Form */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold mb-4">{editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}</h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Assignment Title"
                      value={assignmentForm.title}
                      onChange={(e) => setAssignmentForm({...assignmentForm, title: e.target.value})}
                      className="w-full border rounded-md p-2"
                    />
                    <textarea
                      placeholder="Assignment Description"
                      value={assignmentForm.description}
                      onChange={(e) => setAssignmentForm({...assignmentForm, description: e.target.value})}
                      className="w-full border rounded-md p-2"
                      rows="3"
                    />
                    <textarea
                      placeholder="Instructions for students"
                      value={assignmentForm.instructions}
                      onChange={(e) => setAssignmentForm({...assignmentForm, instructions: e.target.value})}
                      className="w-full border rounded-md p-2"
                      rows="3"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="number"
                        placeholder="Total Points"
                        value={assignmentForm.total_points}
                        onChange={(e) => setAssignmentForm({...assignmentForm, total_points: parseInt(e.target.value)})}
                        className="border rounded-md p-2"
                      />
                      <input
                        type="datetime-local"
                        placeholder="Due Date"
                        value={assignmentForm.due_date}
                        onChange={(e) => setAssignmentForm({...assignmentForm, due_date: e.target.value})}
                        className="border rounded-md p-2"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-4">
                    {editingAssignment && (
                      <button 
                        onClick={() => { 
                          setEditingAssignment(null); 
                          setAssignmentForm({ title: '', description: '', total_points: 100, due_date: '', instructions: '' }); 
                        }} 
                        className="px-4 py-2 border rounded-md"
                      >
                        Cancel Edit
                      </button>
                    )}
                    <button 
                      onClick={handleSaveAssignment} 
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      disabled={actionLoading}
                    >
                      {actionLoading ? <FaSpinner className="inline animate-spin mr-2" /> : <FaSave className="inline mr-2" />}
                      {editingAssignment ? 'Update Assignment' : 'Save Assignment'}
                    </button>
                  </div>
                </div>
                
                {/* Existing Assignments List */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Existing Assignments</h3>
                  {assignments.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No assignments created yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {assignments.map(assignment => (
                        <div key={assignment.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold">{assignment.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">{assignment.description}</p>
                              <div className="flex gap-4 mt-2 text-sm text-gray-500">
                                <span>Points: {assignment.total_points}</span>
                                {assignment.due_date && <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>}
                                <span>Submissions: {assignment.submissions_count || 0}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingAssignment(assignment);
                                  setAssignmentForm({
                                    title: assignment.title,
                                    description: assignment.description || '',
                                    total_points: assignment.total_points,
                                    due_date: assignment.due_date ? assignment.due_date.split('T')[0] : '',
                                    instructions: assignment.instructions || ''
                                  });
                                }}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <FaEdit />
                              </button>
                              <button onClick={() => handleDeleteAssignment(assignment.id)} className="text-red-600 hover:text-red-800" disabled={actionLoading}>
                                <FaTrash />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Question Modal with Dropdown for Correct Answer - UPDATED to store LETTERS */}
        {showQuestionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">{editingQuestion ? 'Edit Question' : 'Add Question'}</h3>
                <button onClick={() => setShowQuestionModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>
              
              <div className="space-y-4">
                {/* Question Text */}
                <textarea
                  placeholder="Question Text"
                  value={questionForm.question_text}
                  onChange={(e) => setQuestionForm({...questionForm, question_text: e.target.value})}
                  className="w-full border rounded-md p-2"
                  rows="2"
                />
                
                {/* Question Type */}
                <select
                  value={questionForm.question_type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setQuestionForm({
                      ...questionForm,
                      question_type: newType,
                      options: newType === 'multiple_choice' ? ['', '', '', ''] : (newType === 'true_false' ? ['True', 'False'] : []),
                      correct_answer: ''
                    });
                  }}
                  className="w-full border rounded-md p-2"
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">True/False</option>
                  <option value="text">Text Answer</option>
                </select>
                
                {/* Points */}
                <input
                  type="number"
                  placeholder="Points"
                  value={questionForm.points}
                  onChange={(e) => setQuestionForm({...questionForm, points: parseInt(e.target.value)})}
                  className="w-full border rounded-md p-2"
                />
                
                {/* Options for Multiple Choice */}
                {questionForm.question_type === 'multiple_choice' && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Options:</p>
                    {questionForm.options.map((opt, idx) => (
                      <input
                        key={idx}
                        type="text"
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        value={opt}
                        onChange={(e) => {
                          const newOptions = [...questionForm.options];
                          newOptions[idx] = e.target.value;
                          setQuestionForm({...questionForm, options: newOptions});
                        }}
                        className="w-full border rounded-md p-2"
                      />
                    ))}
                  </div>
                )}
                
                {/* True/False Options */}
                {questionForm.question_type === 'true_false' && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Options:</p>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="tf_option"
                          value="True"
                          checked={questionForm.options[0] === 'True'}
                          onChange={() => {
                            setQuestionForm({
                              ...questionForm,
                              options: ['True', 'False']
                            });
                          }}
                        />
                        True
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="tf_option"
                          value="False"
                          checked={questionForm.options[0] === 'False'}
                          onChange={() => {
                            setQuestionForm({
                              ...questionForm,
                              options: ['False', 'True']
                            });
                          }}
                        />
                        False
                      </label>
                    </div>
                  </div>
                )}
                
                {/* Correct Answer - Dropdown that stores LETTERS (A, B, C, D) */}
                {(questionForm.question_type === 'multiple_choice' || questionForm.question_type === 'true_false') && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Correct Answer:</label>
                    <select
                      value={questionForm.correct_answer}
                      onChange={(e) => setQuestionForm({...questionForm, correct_answer: e.target.value})}
                      className="w-full border rounded-md p-2"
                    >
                      <option value="">Select correct answer</option>
                      {questionForm.options.map((opt, idx) => {
                        const letter = String.fromCharCode(65 + idx); // A, B, C, D
                        return opt && opt.trim() !== '' && (
                          <option key={idx} value={letter}>
                            {letter}) {opt}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
                
                {/* Text Answer - Input field */}
                {questionForm.question_type === 'text' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Correct Answer (Keywords):</label>
                    <input
                      type="text"
                      placeholder="Enter expected answer or keywords"
                      value={questionForm.correct_answer}
                      onChange={(e) => setQuestionForm({...questionForm, correct_answer: e.target.value})}
                      className="w-full border rounded-md p-2"
                    />
                    <p className="text-xs text-gray-500">Students' answers will be compared with this text for grading.</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowQuestionModal(false)} className="px-4 py-2 border rounded-md">Cancel</button>
                <button onClick={handleAddQuestion} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  {editingQuestion ? 'Update Question' : 'Add Question'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Activity Modal */}
        {selectedCourse && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">{selectedCourse.title}</h2>
                  <p className="text-gray-500 text-sm">Student Activity & Performance</p>
                </div>
                <button onClick={() => setSelectedCourse(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>
              
              <div className="p-6">
                <div className="flex space-x-6 border-b mb-4">
                  <button onClick={() => setActivityTab('enrollments')} className={`py-2 px-1 ${activityTab === 'enrollments' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>
                    Enrolled Students ({courseEnrollments.length})
                  </button>
                  <button onClick={() => setActivityTab('quizzes')} className={`py-2 px-1 ${activityTab === 'quizzes' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>
                    Quiz Results ({quizResults.length})
                  </button>
                  <button onClick={() => setActivityTab('assignments')} className={`py-2 px-1 ${activityTab === 'assignments' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>
                    Assignments ({assignmentSubmissions.length})
                  </button>
                </div>
                
                {/* Activity content - same as before */}
                {activityTab === 'enrollments' && (
                  <div>
                    {courseEnrollments.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No students enrolled yet.</p>
                    ) : (
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left">Student</th>
                            <th className="px-4 py-2 text-left">Email</th>
                            <th className="px-4 py-2 text-left">Enrolled Date</th>
                            <th className="px-4 py-2 text-left">Progress</th>
                          </tr>
                        </thead>
                        <tbody>
                          {courseEnrollments.map((enrollment, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="px-4 py-2">{enrollment.student_name}</td>
                              <td className="px-4 py-2">{enrollment.student_email}</td>
                              <td className="px-4 py-2">{new Date(enrollment.enrolled_at).toLocaleDateString()}</td>
                              <td className="px-4 py-2">
                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                  <div className="bg-blue-600 rounded-full h-2" style={{ width: `${enrollment.progress || 0}%` }}></div>
                                </div>
                                <span className="text-xs">{enrollment.progress || 0}%</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
                
                {activityTab === 'quizzes' && (
                  <div>
                    {quizResults.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No quiz submissions yet.</p>
                    ) : (
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left">Student</th>
                            <th className="px-4 py-2 text-left">Quiz</th>
                            <th className="px-4 py-2 text-left">Score</th>
                            <th className="px-4 py-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quizResults.map((result, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="px-4 py-2">{result.student_name}</td>
                              <td className="px-4 py-2">{result.quiz_title}</td>
                              <td className="px-4 py-2">{result.score}%</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${result.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  {result.passed ? 'Passed' : 'Failed'}
                                </span>
                                </td>
                              </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
                
                {activityTab === 'assignments' && (
                  <div>
                    {assignmentSubmissions.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No assignment submissions yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {assignmentSubmissions.map((submission, idx) => (
                          <div key={idx} className="border rounded-lg p-4">
                            <div className="flex justify-between">
                              <div>
                                <h4 className="font-semibold">{submission.assignment_title}</h4>
                                <p className="text-sm text-gray-600">Student: {submission.student_name}</p>
                                <p className="text-sm text-gray-500">Submitted: {new Date(submission.submitted_at).toLocaleString()}</p>
                              </div>
                              {submission.grade !== null ? (
                                <div className="text-right">
                                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                                    Grade: {submission.grade}/{submission.total_points}
                                  </span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setGradingModal(submission);
                                    setGradeValue('');
                                    setFeedbackValue('');
                                  }}
                                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm"
                                >
                                  Grade
                                </button>
                              )}
                            </div>
                            {submission.submission_text && (
                              <div className="mt-2 p-2 bg-gray-50 rounded">
                                <p className="text-sm">{submission.submission_text}</p>
                              </div>
                            )}
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
                <button onClick={() => setGradingModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
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
                  max={gradingModal.total_points || 100}
                />
                
                <label className="block text-sm font-medium mb-1">Feedback (Optional)</label>
                <textarea
                  value={feedbackValue}
                  onChange={(e) => setFeedbackValue(e.target.value)}
                  className="w-full border rounded-md p-2"
                  rows="3"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setGradingModal(null)} className="px-4 py-2 border rounded-md">Cancel</button>
                <button onClick={() => handleGradeAssignment(gradingModal.id)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" disabled={actionLoading}>
                  {actionLoading ? 'Submitting...' : 'Submit Grade'}
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