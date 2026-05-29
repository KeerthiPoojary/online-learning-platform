const Quiz = require('../models/Quiz');
const Enrollment = require('../models/Enrollment');

const createQuiz = async (req, res) => {
    try {
        const { courseId } = req.params;
        const quizData = {
            ...req.body,
            course_id: courseId
        };
        
        const quizId = await Quiz.create(quizData);
        const quiz = await Quiz.findById(quizId);
        
        res.status(201).json(quiz);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getQuizzes = async (req, res) => {
    try {
        const { courseId } = req.params;
        const quizzes = await Quiz.findByCourseId(courseId);
        res.json(quizzes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getQuizById = async (req, res) => {
    try {
        const { quizId } = req.params;
        const quiz = await Quiz.findById(quizId);
        
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }
        
        // Check if user is enrolled in the course
        const isEnrolled = await Enrollment.isEnrolled(req.userId, quiz.course_id);
        if (req.user.role === 'student' && !isEnrolled) {
            return res.status(403).json({ message: 'You must enroll in the course to take this quiz' });
        }
        
        // Don't send correct answers for student role
        if (req.user.role === 'student' && quiz.questions) {
            quiz.questions = quiz.questions.map(q => ({
                id: q.id,
                question_text: q.question_text,
                question_type: q.question_type,
                options: q.options,
                points: q.points
                // correct_answer is excluded
            }));
        }
        
        res.json(quiz);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const addQuestion = async (req, res) => {
    try {
        const { quizId } = req.params;
        const questionId = await Quiz.addQuestion(quizId, req.body);
        
        res.status(201).json({ 
            message: 'Question added successfully',
            questionId 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const submitQuiz = async (req, res) => {
    try {
        const { quizId } = req.params;
        const { answers } = req.body;
        
        // Check if user has already attempted
        const attempts = await Quiz.getUserAttempts(req.userId, quizId);
        if (attempts.length > 0) {
            // Allow retakes, but you might want to limit this
            // return res.status(400).json({ message: 'You have already attempted this quiz' });
        }
        
        const result = await Quiz.submitAttempt(req.userId, quizId, answers);
        
        res.json({
            message: 'Quiz submitted successfully',
            ...result
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getQuizResults = async (req, res) => {
    try {
        const { attemptId } = req.params;
        const attempt = await Quiz.getAttempt(attemptId);
        
        if (!attempt) {
            return res.status(404).json({ message: 'Attempt not found' });
        }
        
        // Check permission
        if (req.user.role !== 'admin' && attempt.user_id !== req.userId) {
            return res.status(403).json({ message: 'Permission denied' });
        }
        
        // Get quiz details with correct answers for review
        const quiz = await Quiz.findById(attempt.quiz_id);
        
        res.json({
            attempt,
            quiz: {
                title: quiz.title,
                passing_score: quiz.passing_score,
                questions: quiz.questions
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createQuiz,
    getQuizzes,
    getQuizById,
    addQuestion,
    submitQuiz,
    getQuizResults
};