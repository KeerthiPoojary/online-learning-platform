import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaYoutube, FaPlay, FaQuestionCircle, FaTrophy, FaCheckCircle, FaFileAlt, FaChartLine } from 'react-icons/fa';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';

const CourseLearn = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(0);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittingAssignment, setSubmittingAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('lessons');
  const [attemptInfo, setAttemptInfo] = useState(null);
  const [completedLessons, setCompletedLessons] = useState({});
  const [courseProgress, setCourseProgress] = useState({ totalLessons: 0, completedLessons: 0, percentage: 0 });

  useEffect(() => {
    fetchCourseData();
    fetchCourseProgress();
    fetchCompletedLessons();
  }, [id]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const courseRes = await axios.get(`https://online-learning-platform-99mm.onrender.com/api/courses/${id}`);
      setCourse(courseRes.data);
      
      const lessonsRes = await axios.get(`https://online-learning-platform-99mm.onrender.com/api/courses/${id}/lessons`);
      setLessons(lessonsRes.data.lessons || []);
      
      if (token) {
        const quizzesRes = await axios.get(`https://online-learning-platform-99mm.onrender.com/api/quizzes/course/${id}`, { headers });
        setQuizzes(quizzesRes.data.quizzes || []);
        
        const assignmentsRes = await axios.get(`https://online-learning-platform-99mm.onrender.com/api/assignments/course/${id}`, { headers });
        setAssignments(assignmentsRes.data.assignments || []);
      }
      
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`https://online-learning-platform-99mm.onrender.com/api/courses/progress/${id}/details`,{ headers }
);
      setCourseProgress(response.data);
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  const fetchCompletedLessons = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`https://online-learning-platform-99mm.onrender.com/api/courses/progress/${id}/details`,{ headers }
);
      
      const completedMap = {};
      (response.data.completedLessons || []).forEach(lesson => {
        completedMap[lesson.id] = true;
      });
      setCompletedLessons(completedMap);
    } catch (error) {
      console.error('Error fetching completed lessons:', error);
    }
  };

  const markLessonComplete = async (lessonId) => {
    if (completedLessons[lessonId]) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`https://online-learning-platform-99mm.onrender.com/api/courses/lesson/${lessonId}/complete`, {}, { headers });
      
      setCompletedLessons(prev => ({ ...prev, [lessonId]: true }));
      toast.success('Lesson marked as completed!');
      
      await fetchCourseProgress();
    } catch (error) {
      console.error('Error marking lesson complete:', error);
      toast.error('Failed to mark lesson as completed');
    }
  };

  const extractYouTubeID = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getYouTubeEmbedUrl = (url) => {
    const videoId = extractYouTubeID(url);
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  // FIXED: Store LETTER (A, B, C, D) instead of full text
  const handleAnswerSelect = (questionId, answerLetter) => {
    console.log(`Selected answer for Q${questionId}: ${answerLetter}`);
    setQuizAnswers({ ...quizAnswers, [questionId]: answerLetter });
  };

  const handleQuizSubmit = async () => {
    if (!currentQuiz || !quizQuestions.length) {
      toast.error('No questions available');
      return;
    }
    
    const totalQuestions = quizQuestions.length;
    const answeredCount = Object.keys(quizAnswers).length;
    
    console.log('=== SUBMITTING QUIZ ===');
    console.log('Quiz ID:', currentQuiz.id);
    console.log('Answers:', quizAnswers);
    
    if (answeredCount < totalQuestions) {
      toast.error(`Please answer all ${totalQuestions} questions`);
      return;
    }
    
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const formattedAnswers = {};
      quizQuestions.forEach(question => {
        if (quizAnswers[question.id]) {
          formattedAnswers[question.id] = quizAnswers[question.id];
        }
      });
      
      console.log('Submitting answers:', formattedAnswers);
      
      const response = await axios.post(
        `https://online-learning-platform-99mm.onrender.com/api/quizzes/${currentQuiz.id}/submit`,
        { answers: formattedAnswers },
        { headers }
      );
      
      console.log('Response:', response.data);
      
      if (response.data.success) {
        setQuizResult({
          score: response.data.score,
          passed: response.data.passed,
          earnedPoints: response.data.earnedPoints,
          totalPoints: response.data.totalPoints,
          attemptNumber: response.data.attemptNumber,
          maxAttempts: response.data.maxAttempts,
          attemptsLeft: response.data.attemptsLeft,
          bestScore: response.data.bestScore
        });
        toast.success(`Quiz submitted! You scored ${response.data.score}%`);
        
        const quizzesRes = await axios.get(
  `https://online-learning-platform-99mm.onrender.com/api/quizzes/course/${id}`,
  { headers }
);
        setQuizzes(quizzesRes.data.quizzes || []);
      } else {
        toast.error(response.data.message || 'Failed to submit quiz');
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error(error.response?.data?.message || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const startQuiz = async (quiz) => {
    setLoadingQuiz(true);
    setCurrentQuiz(quiz);
    setQuizAnswers({});
    setQuizResult(null);
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`https://online-learning-platform-99mm.onrender.com/api/quizzes/take/${quiz.id}`,{ headers }
);
      
      if (response.status === 403) {
        toast.error(response.data.message);
        setCurrentQuiz(null);
        setLoadingQuiz(false);
        return;
      }
      
      console.log('Quiz questions received:', response.data.questions);
      setQuizQuestions(response.data.questions || []);
      setAttemptInfo({
        attemptNumber: response.data.attemptNumber,
        maxAttempts: response.data.maxAttempts,
        attemptsLeft: response.data.attemptsLeft
      });
    } catch (error) {
      console.error('Error loading quiz questions:', error);
      if (error.response?.status === 403) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to load quiz questions');
      }
      setCurrentQuiz(null);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleSubmitAssignment = async (assignmentId) => {
    if (!submissionText.trim()) {
      toast.error('Please enter your submission');
      return;
    }
    
    setSubmittingAssignment(assignmentId);
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post('https://online-learning-platform-99mm.onrender.com/api/assignments/submit',
  {
    assignment_id: assignmentId,
    submission_text: submissionText
  },
  { headers }
);
      
      toast.success('Assignment submitted successfully!');
      setSubmissionText('');
      
      const assignmentsRes = await axios.get(
  `https://online-learning-platform-99mm.onrender.com/api/assignments/course/${id}`,
  { headers }
);
      setAssignments(assignmentsRes.data.assignments || []);
      
    } catch (error) {
      console.error('Error submitting assignment:', error);
      toast.error(error.response?.data?.message || 'Failed to submit assignment');
    } finally {
      setSubmittingAssignment(null);
    }
  };

  const nextLesson = () => {
    if (currentLesson < lessons.length - 1) {
      setCurrentLesson(currentLesson + 1);
    }
  };

  const prevLesson = () => {
    if (currentLesson > 0) {
      setCurrentLesson(currentLesson - 1);
    }
  };

  // FIXED: Render function that stores LETTERS (A, B, C, D) instead of full text
  const renderQuizQuestion = (question, idx) => {
    const isTrueFalse = question.question_type === 'true_false';
    
    if (isTrueFalse) {
      // For True/False, store 'A' for True, 'B' for False
      return (
        <div className="space-y-2 ml-4">
          <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
            <input
              type="radio"
              name={`q${question.id}`}
              value="A"
              checked={quizAnswers[question.id] === 'A'}
              onChange={() => handleAnswerSelect(question.id, 'A')}
              className="w-4 h-4"
            />
            <span>True</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
            <input
              type="radio"
              name={`q${question.id}`}
              value="B"
              checked={quizAnswers[question.id] === 'B'}
              onChange={() => handleAnswerSelect(question.id, 'B')}
              className="w-4 h-4"
            />
            <span>False</span>
          </label>
        </div>
      );
    }
    
    // For multiple choice questions - store LETTERS (A, B, C, D)
    if (question.options && Array.isArray(question.options)) {
      const letters = ['A', 'B', 'C', 'D'];
      return (
        <div className="space-y-2 ml-4">
          {question.options.map((option, optIdx) => {
            const letter = letters[optIdx];
            return option && option.trim() !== '' && (
              <label key={optIdx} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                <input
                  type="radio"
                  name={`q${question.id}`}
                  value={letter}
                  checked={quizAnswers[question.id] === letter}
                  onChange={() => handleAnswerSelect(question.id, letter)}
                  className="w-4 h-4"
                />
                <span>{letter}) {option}</span>
              </label>
            );
          })}
        </div>
      );
    }
    
    // Fallback for older format with option_a, option_b, etc. - store LETTERS
    const options = [
      { letter: 'A', text: question.option_a },
      { letter: 'B', text: question.option_b },
      { letter: 'C', text: question.option_c },
      { letter: 'D', text: question.option_d }
    ].filter(opt => opt.text);
    
    return (
      <div className="space-y-2 ml-4">
        {options.map(opt => (
          <label key={opt.letter} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
            <input
              type="radio"
              name={`q${question.id}`}
              value={opt.letter}
              checked={quizAnswers[question.id] === opt.letter}
              onChange={() => handleAnswerSelect(question.id, opt.letter)}
              className="w-4 h-4"
            />
            <span>{opt.letter}) {opt.text}</span>
          </label>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </Layout>
    );
  }

  const currentVideo = lessons[currentLesson];
  const videoUrl = currentVideo?.video_url ? getYouTubeEmbedUrl(currentVideo.video_url) : null;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button 
            onClick={() => navigate('/student/dashboard')}
            className="text-blue-600 hover:underline mb-4 inline-flex items-center gap-1"
          >
            <FaArrowLeft /> Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold">{course?.title}</h1>
          <p className="text-gray-600 mt-1">{course?.description}</p>
        </div>
        
        {/* Progress Bar for Course */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <FaChartLine className="text-blue-500" /> Course Progress
            </span>
            <span className="text-sm font-semibold text-blue-600">{courseProgress.percentage || 0}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-green-600 rounded-full h-2.5 transition-all duration-500"
              style={{ width: `${courseProgress.percentage || 0}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {courseProgress.completedLessons || 0} of {courseProgress.totalLessons || 0} lessons completed
          </p>
        </div>
        
        <div className="border-b border-gray-200 mb-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('lessons')}
              className={`pb-3 px-1 text-sm font-medium ${
                activeTab === 'lessons'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaYoutube className="inline mr-2" /> Lessons ({lessons.length})
            </button>
            <button
              onClick={() => setActiveTab('quizzes')}
              className={`pb-3 px-1 text-sm font-medium ${
                activeTab === 'quizzes'
                  ? 'border-b-2 border-green-500 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaQuestionCircle className="inline mr-2" /> Quizzes ({quizzes.length})
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`pb-3 px-1 text-sm font-medium ${
                activeTab === 'assignments'
                  ? 'border-b-2 border-orange-500 text-orange-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaFileAlt className="inline mr-2" /> Assignments ({assignments.length})
            </button>
          </div>
        </div>
        
        {activeTab === 'lessons' && (
          // ... (keep your existing lessons code)
          <>
            {lessons.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <FaYoutube className="text-gray-400 text-6xl mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Lessons Available</h3>
                <p className="text-gray-500">The instructor hasn't added any lessons yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Video Player */}
                <div className="lg:col-span-2">
                  <div className="bg-black rounded-lg overflow-hidden aspect-video">
                    {videoUrl ? (
                      <iframe
                        src={videoUrl}
                        className="w-full h-full"
                        title={currentVideo?.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <FaYoutube className="text-gray-600 text-6xl" />
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <h2 className="text-xl font-semibold">{currentVideo?.title}</h2>
                    {currentVideo?.description && (
                      <p className="text-gray-600 mt-2">{currentVideo.description}</p>
                    )}
                  </div>
                  <div className="flex justify-between mt-6">
                    <button onClick={prevLesson} disabled={currentLesson === 0} className="px-4 py-2 border rounded-md disabled:opacity-50">← Previous Lesson</button>
                    <div className="flex gap-3">
                      {!completedLessons[currentVideo?.id] && (
                        <button onClick={() => markLessonComplete(currentVideo?.id)} className="px-4 py-2 bg-green-600 text-white rounded-md">
                          <FaCheckCircle className="inline mr-1" /> Mark as Completed
                        </button>
                      )}
                      <button onClick={nextLesson} disabled={currentLesson === lessons.length - 1} className="px-4 py-2 bg-blue-600 text-white rounded-md">
                        Next Lesson →
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Lessons List */}
                <div className="bg-white rounded-lg shadow-md p-4">
                  <h3 className="font-semibold text-lg mb-3">Course Content ({lessons.length} lessons)</h3>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {lessons.map((lesson, index) => (
                      <button key={lesson.id} onClick={() => setCurrentLesson(index)} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 ${currentLesson === index ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${currentLesson === index ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{index + 1}</div>
                        <div className="flex-1"><span className={currentLesson === index ? 'font-medium' : ''}>{lesson.title}</span></div>
                        {completedLessons[lesson.id] && <FaCheckCircle className="text-green-500 text-sm" />}
                        <FaPlay className="text-gray-400 text-xs" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        {activeTab === 'quizzes' && (
          <div>
            {quizzes.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <FaQuestionCircle className="text-gray-400 text-6xl mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Quizzes Available</h3>
                <p className="text-gray-500">The instructor hasn't added any quizzes yet.</p>
              </div>
            ) : currentQuiz ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                {loadingQuiz ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4">Loading quiz...</p>
                  </div>
                ) : quizResult ? (
                  <div className="text-center py-8">
                    <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${quizResult.passed ? 'bg-green-100' : 'bg-red-100'}`}>
                      <FaTrophy className={`text-4xl ${quizResult.passed ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Your Score: {quizResult.score}%</h3>
                    <p className="text-gray-600 mb-2">Earned: {quizResult.earnedPoints} / {quizResult.totalPoints} points</p>
                    <p className={`text-lg mb-4 ${quizResult.passed ? 'text-green-600' : 'text-red-600'}`}>
                      {quizResult.passed ? '🎉 Congratulations! You passed!' : '❌ You did not pass.'}
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                      Attempt {quizResult.attemptNumber} of {quizResult.maxAttempts} • Best Score: {quizResult.bestScore}%
                    </p>
                    <button onClick={() => { setCurrentQuiz(null); setQuizResult(null); setQuizAnswers({}); setQuizQuestions([]); fetchCourseData(); }} className="bg-blue-600 text-white px-6 py-2 rounded-md">
                      Back to Quizzes
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-xl font-bold">{currentQuiz.title}</h2>
                        <p className="text-gray-600 text-sm">{currentQuiz.description}</p>
                        {attemptInfo && <p className="text-sm text-blue-600 mt-1">Attempt {attemptInfo.attemptNumber} of {attemptInfo.maxAttempts}</p>}
                      </div>
                      <button onClick={() => { setCurrentQuiz(null); setQuizAnswers({}); setQuizQuestions([]); }} className="text-blue-600 hover:underline">Back to Quizzes</button>
                    </div>
                    <p className="text-sm text-gray-500 mb-6">Passing Score: {currentQuiz.passing_score}%</p>
                    
                    {quizQuestions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500"><p>No questions available for this quiz.</p></div>
                    ) : (
                      quizQuestions.map((question, idx) => (
                        <div key={question.id} className="mb-6 p-4 border rounded-lg">
                          <p className="font-semibold mb-3">Q{idx + 1}. {question.question_text || question.question}</p>
                          <p className="text-xs text-gray-400 mb-2">Points: {question.points}</p>
                          {renderQuizQuestion(question, idx)}
                        </div>
                      ))
                    )}
                    
                    {quizQuestions.length > 0 && (
                      <button onClick={handleQuizSubmit} disabled={submitting} className="w-full bg-green-600 text-white py-3 rounded-md hover:bg-green-700 disabled:bg-green-300 font-semibold">
                        {submitting ? 'Submitting...' : 'Submit Quiz'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {quizzes.map((quiz) => {
                  const isCompleted = quiz.has_passed === 1;
                  const attemptsUsed = quiz.attempt_count || 0;
                  const attemptsLeft = 2 - attemptsUsed;
                  const canAttempt = !isCompleted && attemptsLeft > 0;
                  
                  return (
                    <div key={quiz.id} className={`bg-white rounded-lg shadow-md p-6 ${isCompleted ? 'border-l-4 border-green-500' : ''}`}>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg">{quiz.title}</h3>
                        {isCompleted && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full"><FaCheckCircle className="inline mr-1" /> Completed</span>}
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{quiz.description}</p>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-sm text-gray-500">Questions: {quiz.question_count || 0}</span>
                        <span className="text-sm text-gray-500">Passing: {quiz.passing_score}%</span>
                      </div>
                      <div className="mb-4 text-sm">
                        {isCompleted ? <p className="text-green-600">✓ Quiz Completed - You passed!</p> : attemptsUsed > 0 ? <p className="text-orange-600">Attempts: {attemptsUsed}/2 • {attemptsLeft} left</p> : <p className="text-gray-500">2 attempts available</p>}
                      </div>
                      <button onClick={() => startQuiz(quiz)} disabled={!canAttempt} className={`w-full py-2 rounded-md ${canAttempt ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                        {isCompleted ? 'Completed' : attemptsLeft === 0 ? 'No Attempts Left' : 'Start Quiz'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'assignments' && (
          // ... (keep your existing assignments code)
          <div>
            {assignments.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <FaFileAlt className="text-gray-400 text-6xl mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Assignments Available</h3>
                <p className="text-gray-500">The instructor hasn't added any assignments yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{assignment.title}</h3>
                        {assignment.due_date && <p className="text-sm text-gray-500 mt-1">Due: {new Date(assignment.due_date).toLocaleDateString()}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Total Points: {assignment.total_points}</p>
                        {assignment.has_submitted > 0 && <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">{assignment.grade ? `Graded: ${assignment.grade}/${assignment.total_points}` : 'Submitted'}</span>}
                      </div>
                    </div>
                    <p className="text-gray-700 mb-4">{assignment.description}</p>
                    {assignment.has_submitted > 0 ? (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">You have submitted this assignment.</p>
                        {assignment.grade && <p className="text-sm text-green-600 mt-1">Grade: {assignment.grade}/{assignment.total_points}</p>}
                        {assignment.feedback && <p className="text-sm text-gray-600 mt-2">Feedback: {assignment.feedback}</p>}
                      </div>
                    ) : (
                      <div className="mt-4">
                        <textarea rows="4" value={submissionText} onChange={(e) => setSubmissionText(e.target.value)} placeholder="Write your submission here..." className="w-full border rounded-md p-3" />
                        <button onClick={() => handleSubmitAssignment(assignment.id)} disabled={submittingAssignment === assignment.id} className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-md">
                          {submittingAssignment === assignment.id ? 'Submitting...' : 'Submit Assignment'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CourseLearn;