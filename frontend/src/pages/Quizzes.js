import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash, FaQuestionCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';

const Quizzes = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);
  const [formData, setFormData] = useState({
    course_id: '',
    title: '',
    description: '',
    passing_score: 70,
    questions: []
  });
  const [currentQuestion, setCurrentQuestion] = useState({
    question: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A',
    points: 1
  });

  useEffect(() => {
    fetchCourses();
    fetchQuizzes();
  }, []);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('http://localhost:5000/api/instructor/courses', { headers });
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    }
  };

  const fetchQuizzes = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('http://localhost:5000/api/quizzes/instructor', { headers });
      setQuizzes(response.data.quizzes || []);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizDetails = async (quizId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`http://localhost:5000/api/quizzes/${quizId}`, { headers });
      return response.data;
    } catch (error) {
      console.error('Error fetching quiz details:', error);
      return null;
    }
  };

  const addQuestion = () => {
    if (!currentQuestion.question) {
      toast.error('Please enter the question');
      return;
    }
    if (!currentQuestion.option_a || !currentQuestion.option_b) {
      toast.error('Please enter at least two options');
      return;
    }

    if (editingQuestionIndex !== null) {
      const updatedQuestions = [...formData.questions];
      updatedQuestions[editingQuestionIndex] = { ...currentQuestion };
      setFormData({ ...formData, questions: updatedQuestions });
      toast.success('Question updated');
    } else {
      setFormData({
        ...formData,
        questions: [...formData.questions, { ...currentQuestion }]
      });
      toast.success('Question added');
    }
    
    setCurrentQuestion({
      question: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: 'A',
      points: 1
    });
    setEditingQuestionIndex(null);
    setShowQuestionModal(false);
  };

  const editQuestion = (index) => {
    const question = formData.questions[index];
    setCurrentQuestion({
      question: question.question,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c || '',
      option_d: question.option_d || '',
      correct_answer: question.correct_answer,
      points: question.points
    });
    setEditingQuestionIndex(index);
    setShowQuestionModal(true);
  };

  const removeQuestion = (index) => {
    const updatedQuestions = formData.questions.filter((_, i) => i !== index);
    setFormData({ ...formData, questions: updatedQuestions });
    toast.success('Question removed');
  };

  const handleEditQuiz = async (quiz) => {
    setEditingQuiz(quiz);
    setLoading(true);
    
    // Fetch full quiz details including questions
    const quizDetails = await fetchQuizDetails(quiz.id);
    
    if (quizDetails) {
      setFormData({
        course_id: quizDetails.course_id,
        title: quizDetails.title,
        description: quizDetails.description || '',
        passing_score: quizDetails.passing_score,
        questions: quizDetails.questions || []
      });
      console.log('Loaded quiz with questions:', quizDetails.questions);
    } else {
      // Fallback to basic data
      setFormData({
        course_id: quiz.course_id,
        title: quiz.title,
        description: quiz.description || '',
        passing_score: quiz.passing_score,
        questions: []
      });
    }
    
    setLoading(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.course_id) {
      toast.error('Please select a course');
      return;
    }
    if (!formData.title) {
      toast.error('Please enter quiz title');
      return;
    }
    if (formData.questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const quizData = {
        course_id: parseInt(formData.course_id),
        title: formData.title,
        description: formData.description || '',
        passing_score: parseInt(formData.passing_score) || 70,
        questions: formData.questions.map(q => ({
          question: q.question,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c || '',
          option_d: q.option_d || '',
          correct_answer: q.correct_answer,
          points: parseInt(q.points) || 1
        }))
      };
      
      console.log('Saving quiz:', quizData);
      
      if (editingQuiz) {
        await axios.put(`http://localhost:5000/api/quizzes/${editingQuiz.id}`, quizData, { headers });
        toast.success('Quiz updated successfully');
      } else {
        await axios.post('http://localhost:5000/api/quizzes/create', quizData, { headers });
        toast.success('Quiz created successfully');
      }
      
      setShowModal(false);
      setFormData({
        course_id: '',
        title: '',
        description: '',
        passing_score: 70,
        questions: []
      });
      setEditingQuiz(null);
      fetchQuizzes();
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast.error(error.response?.data?.message || 'Failed to save quiz');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this quiz? This will also delete all questions.')) {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        await axios.delete(`http://localhost:5000/api/quizzes/${id}`, { headers });
        toast.success('Quiz deleted');
        fetchQuizzes();
      } catch (error) {
        toast.error('Failed to delete quiz');
      }
    }
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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Quiz Management</h1>
          <button
            onClick={() => { 
              setShowModal(true); 
              setEditingQuiz(null); 
              setFormData({ 
                course_id: '', 
                title: '', 
                description: '', 
                passing_score: 70, 
                questions: [] 
              }); 
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <FaPlus /> Create Quiz
          </button>
        </div>

        {quizzes.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FaQuestionCircle className="text-gray-400 text-6xl mx-auto mb-4" />
            <p className="text-gray-500">No quizzes yet. Click "Create Quiz" to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{quiz.title}</h3>
                  <p className="text-gray-600 text-sm mb-2">{quiz.description}</p>
                  <div className="flex justify-between items-center mb-2 text-sm">
                    <span className="text-gray-500">Course: {quiz.course_title}</span>
                    <span className="text-gray-500">Questions: {quiz.question_count || 0}</span>
                  </div>
                  <div className="mb-3">
                    <span className="text-sm text-gray-500">Passing Score: {quiz.passing_score}%</span>
                  </div>
                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <button 
                      onClick={() => handleEditQuiz(quiz)} 
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FaEdit /> Edit
                    </button>
                    <button onClick={() => handleDelete(quiz.id)} className="text-red-600 hover:text-red-800">
                      <FaTrash /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quiz Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto z-50 p-4">
          <div className="relative bg-white rounded-lg max-w-4xl mx-auto p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Select Course *</label>
                <select
                  required
                  value={formData.course_id}
                  onChange={(e) => setFormData({...formData, course_id: e.target.value})}
                  className="w-full border rounded-md p-2"
                >
                  <option value="">Select a course</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Quiz Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full border rounded-md p-2"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border rounded-md p-2"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Passing Score (%)</label>
                <input
                  type="number"
                  value={formData.passing_score}
                  onChange={(e) => setFormData({...formData, passing_score: parseInt(e.target.value)})}
                  className="w-full border rounded-md p-2"
                  min="0"
                  max="100"
                />
              </div>
              
              {/* Questions Section */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold">Questions ({formData.questions.length})</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentQuestion({
                        question: '',
                        option_a: '',
                        option_b: '',
                        option_c: '',
                        option_d: '',
                        correct_answer: 'A',
                        points: 1
                      });
                      setEditingQuestionIndex(null);
                      setShowQuestionModal(true);
                    }}
                    className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700"
                  >
                    <FaPlus className="inline mr-1" /> Add Question
                  </button>
                </div>
                
                {formData.questions.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No questions added yet. Click "Add Question" to start.</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {formData.questions.map((q, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">Q{index + 1}: {q.question}</p>
                            <p className="text-sm text-gray-600">A) {q.option_a} | B) {q.option_b}</p>
                            {q.option_c && <p className="text-sm text-gray-600">C) {q.option_c}</p>}
                            {q.option_d && <p className="text-sm text-gray-600">D) {q.option_d}</p>}
                            <p className="text-sm text-green-600">Correct: {q.correct_answer} | Points: {q.points}</p>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => editQuestion(index)} className="text-blue-600 hover:text-blue-800">Edit</button>
                            <button type="button" onClick={() => removeQuestion(index)} className="text-red-600 hover:text-red-800">Remove</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">{editingQuiz ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Question Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">{editingQuestionIndex !== null ? 'Edit Question' : 'Add Question'}</h3>
              <button onClick={() => setShowQuestionModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Question"
                value={currentQuestion.question}
                onChange={(e) => setCurrentQuestion({...currentQuestion, question: e.target.value})}
                className="w-full border rounded-md p-2"
                required
              />
              
              <input
                type="text"
                placeholder="Option A"
                value={currentQuestion.option_a}
                onChange={(e) => setCurrentQuestion({...currentQuestion, option_a: e.target.value})}
                className="w-full border rounded-md p-2"
                required
              />
              
              <input
                type="text"
                placeholder="Option B"
                value={currentQuestion.option_b}
                onChange={(e) => setCurrentQuestion({...currentQuestion, option_b: e.target.value})}
                className="w-full border rounded-md p-2"
                required
              />
              
              <input
                type="text"
                placeholder="Option C (optional)"
                value={currentQuestion.option_c}
                onChange={(e) => setCurrentQuestion({...currentQuestion, option_c: e.target.value})}
                className="w-full border rounded-md p-2"
              />
              
              <input
                type="text"
                placeholder="Option D (optional)"
                value={currentQuestion.option_d}
                onChange={(e) => setCurrentQuestion({...currentQuestion, option_d: e.target.value})}
                className="w-full border rounded-md p-2"
              />
              
              <div className="flex gap-2">
                <select
                  value={currentQuestion.correct_answer}
                  onChange={(e) => setCurrentQuestion({...currentQuestion, correct_answer: e.target.value})}
                  className="flex-1 border rounded-md p-2"
                >
                  <option value="A">Correct Answer: A</option>
                  <option value="B">Correct Answer: B</option>
                  <option value="C">Correct Answer: C</option>
                  <option value="D">Correct Answer: D</option>
                </select>
                
                <input
                  type="number"
                  placeholder="Points"
                  value={currentQuestion.points}
                  onChange={(e) => setCurrentQuestion({...currentQuestion, points: parseInt(e.target.value)})}
                  className="w-24 border rounded-md p-2"
                  min="1"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <button onClick={() => setShowQuestionModal(false)} className="px-4 py-2 border rounded-md">Cancel</button>
                <button onClick={addQuestion} className="px-4 py-2 bg-blue-600 text-white rounded-md">Save Question</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Quizzes;