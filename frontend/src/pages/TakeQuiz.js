// src/pages/TakeQuiz.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';

const TakeQuiz = () => {
    const { quizId } = useParams();
    const navigate = useNavigate();
    const [quiz, setQuiz] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);

    useEffect(() => {
        fetchQuiz();
    }, [quizId]);

    useEffect(() => {
        if (timeLeft !== null && timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0) {
            handleSubmit();
        }
    }, [timeLeft]);

    const fetchQuiz = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            console.log('Fetching quiz with ID:', quizId);
            console.log('Token:', token);
            
            const response = await axios.get(`http://localhost:5000/api/quizzes/take/${quizId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('API Response:', response.data);
            console.log('Questions received:', response.data.questions);
            
            setQuiz(response.data.quiz);
            setQuestions(response.data.questions || []);
            
            if (response.data.quiz?.time_limit) {
                setTimeLeft(response.data.quiz.time_limit * 60);
            }
        } catch (error) {
            console.error('Error fetching quiz:', error);
            console.error('Error response:', error.response?.data);
            
            if (error.response?.status === 403) {
                toast.error(error.response.data.message || 'You cannot take this quiz');
                setTimeout(() => navigate(-1), 2000);
            } else if (error.response?.status === 404) {
                toast.error('Quiz not found');
                navigate(-1);
            } else {
                toast.error('Failed to load quiz');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (questionId, answer) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answer
        }));
    };

    const handleSubmit = async () => {
        // Check if all questions are answered
        const unanswered = questions.filter(q => !answers[q.id]);
        if (unanswered.length > 0) {
            toast.error(`Please answer all questions. ${unanswered.length} question(s) remaining.`);
            return;
        }
        
        if (!window.confirm('Are you sure you want to submit your answers?')) {
            return;
        }
        
        try {
            setSubmitting(true);
            const token = localStorage.getItem('token');
            
            console.log('Submitting answers:', answers);
            
            const response = await axios.post(
                `http://localhost:5000/api/quizzes/${quizId}/submit`,
                { answers },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            console.log('Submit response:', response.data);
            
            toast.success(response.data.message);
            
            // Navigate back to course page
            setTimeout(() => {
                navigate(`/student/course/${quiz?.course_id || ''}`);
            }, 2000);
            
        } catch (error) {
            console.error('Error submitting quiz:', error);
            toast.error(error.response?.data?.message || 'Failed to submit quiz');
        } finally {
            setSubmitting(false);
        }
    };

    const renderQuestion = (question, index) => {
        console.log('Rendering question:', question);
        
        switch (question.question_type) {
            case 'multiple_choice':
                return (
                    <div className="space-y-3">
                        {question.options && question.options.map((option, optIdx) => (
                            <label 
                                key={optIdx} 
                                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition"
                            >
                                <input
                                    type="radio"
                                    name={`question_${question.id}`}
                                    value={option}
                                    checked={answers[question.id] === option}
                                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-gray-700">{option}</span>
                            </label>
                        ))}
                    </div>
                );
                
            case 'true_false':
                return (
                    <div className="space-y-3">
                        {['True', 'False'].map(option => (
                            <label 
                                key={option}
                                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition"
                            >
                                <input
                                    type="radio"
                                    name={`question_${question.id}`}
                                    value={option}
                                    checked={answers[question.id] === option}
                                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-gray-700">{option}</span>
                            </label>
                        ))}
                    </div>
                );
                
            case 'text':
                return (
                    <textarea
                        className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows="4"
                        placeholder="Type your answer here..."
                        value={answers[question.id] || ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    />
                );
                
            default:
                return (
                    <input
                        type="text"
                        className="w-full border rounded-lg p-3"
                        value={answers[question.id] || ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        placeholder="Enter your answer"
                    />
                );
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </Layout>
        );
    }

    if (!quiz) {
        return (
            <Layout>
                <div className="max-w-3xl mx-auto px-4 py-8 text-center">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <h2 className="text-2xl font-bold text-red-600 mb-2">Quiz Not Found</h2>
                        <p className="text-gray-600">The quiz you're looking for doesn't exist.</p>
                        <button
                            onClick={() => navigate(-1)}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    if (questions.length === 0) {
        return (
            <Layout>
                <div className="max-w-3xl mx-auto px-4 py-8 text-center">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                        <h2 className="text-2xl font-bold text-yellow-600 mb-2">No Questions Found</h2>
                        <p className="text-gray-600">This quiz doesn't have any questions yet. Please contact your instructor.</p>
                        <button
                            onClick={() => navigate(-1)}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-3xl mx-auto px-4 py-8">
                {/* Quiz Header */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
                            <p className="text-gray-500 mt-1">{quiz.course_title}</p>
                        </div>
                        {timeLeft !== null && (
                            <div className="text-right bg-blue-50 px-4 py-2 rounded-lg">
                                <p className="text-sm text-gray-500">Time Remaining</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                                </p>
                            </div>
                        )}
                    </div>
                    
                    <p className="text-gray-600 mt-4">{quiz.description}</p>
                    
                    <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Passing Score:</span>
                            <span className="font-semibold text-green-600">{quiz.passing_score}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Questions:</span>
                            <span className="font-semibold">{questions.length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Total Points:</span>
                            <span className="font-semibold">
                                {questions.reduce((sum, q) => sum + (q.points || 0), 0)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Questions */}
                <div className="space-y-6">
                    {questions.map((question, index) => (
                        <div key={question.id} className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Q{index + 1}. {question.question_text}
                                </h3>
                                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                    {question.points} pts
                                </span>
                            </div>
                            {renderQuestion(question, index)}
                        </div>
                    ))}
                </div>

                {/* Submit Button */}
                <div className="mt-8 flex justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
                    >
                        Back
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        {submitting ? (
                            <span className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Submitting...
                            </span>
                        ) : (
                            'Submit Quiz'
                        )}
                    </button>
                </div>
            </div>
        </Layout>
    );
};

export default TakeQuiz;