// src/routes/quiz.routes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Helper function to get quiz passing score
async function getQuizPassingScore(db, quizId) {
    const [quizzes] = await db.execute('SELECT passing_score FROM quizzes WHERE id = ?', [quizId]);
    return quizzes[0]?.passing_score || 70;
}

// ==================== STUDENT ROUTES ====================

// Get quizzes for a course (for students) - with attempt info
router.get('/course/:courseId', async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.courseId;
        
        const token = req.headers.authorization?.split(' ')[1];
        let studentId = null;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                studentId = decoded.id;
            } catch(e) {}
        }
        
        const [quizzes] = await db.execute(`
            SELECT q.*, 
                   (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as question_count,
                   (SELECT COUNT(*) FROM quiz_results WHERE quiz_id = q.id AND student_id = ?) as attempt_count,
                   (SELECT passed FROM quiz_results WHERE quiz_id = q.id AND student_id = ? ORDER BY score DESC LIMIT 1) as has_passed
            FROM quizzes q
            WHERE q.course_id = ?
            ORDER BY q.created_at ASC
        `, [studentId, studentId, courseId]);
        
        res.json({ quizzes });
    } catch (error) {
        console.error('Error fetching course quizzes:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get quiz for taking (with questions)
router.get('/take/:id', async (req, res) => {
    try {
        const db = req.db;
        const quizId = req.params.id;
        
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const studentId = decoded.id;
        
        console.log(`Fetching quiz ${quizId} for student ${studentId}`);
        
        // Check attempt count
        const [attempts] = await db.execute(
            'SELECT COUNT(*) as count FROM quiz_results WHERE quiz_id = ? AND student_id = ?',
            [quizId, studentId]
        );
        
        const attemptCount = attempts[0].count;
        const MAX_ATTEMPTS = 2;
        
        if (attemptCount >= MAX_ATTEMPTS) {
            const [passed] = await db.execute(
                'SELECT passed FROM quiz_results WHERE quiz_id = ? AND student_id = ? AND passed = true LIMIT 1',
                [quizId, studentId]
            );
            
            if (passed.length > 0) {
                return res.status(403).json({ 
                    message: 'You have already passed this quiz!',
                    alreadyPassed: true 
                });
            } else {
                return res.status(403).json({ 
                    message: `You have used all ${MAX_ATTEMPTS} attempts for this quiz.`,
                    maxAttemptsReached: true 
                });
            }
        }
        
        // Get quiz details
        const [quizzes] = await db.execute(`
            SELECT q.id, q.title, q.description, q.time_limit, q.passing_score, c.title as course_title
            FROM quizzes q
            JOIN courses c ON q.course_id = c.id
            WHERE q.id = ?
        `, [quizId]);
        
        if (quizzes.length === 0) {
            return res.status(404).json({ message: 'Quiz not found' });
        }
        
        const quiz = quizzes[0];
        
        // Get questions with properly parsed options
        const [questions] = await db.execute(`
            SELECT id, question_text, question_type, points, options
            FROM quiz_questions
            WHERE quiz_id = ?
            ORDER BY id ASC
        `, [quizId]);
        
        console.log(`Found ${questions.length} questions for quiz ${quizId}`);
        
        // Parse questions and ensure options are properly formatted
        const parsedQuestions = questions.map(q => {
            let optionsArray = [];
            
            if (q.options) {
                try {
                    if (typeof q.options === 'string') {
                        optionsArray = JSON.parse(q.options);
                    } else if (Array.isArray(q.options)) {
                        optionsArray = q.options;
                    } else if (typeof q.options === 'object') {
                        optionsArray = Object.values(q.options);
                    }
                } catch(e) {
                    console.error('Error parsing options:', e);
                    optionsArray = [];
                }
            }
            
            // For multiple choice questions with no options, add defaults
            if (q.question_type === 'multiple_choice' && optionsArray.length === 0) {
                optionsArray = ['Option A', 'Option B', 'Option C', 'Option D'];
            }
            
            // Filter out empty options
            optionsArray = optionsArray.filter(opt => opt && opt.trim() !== '');
            
            return {
                id: q.id,
                question_text: q.question_text,
                question_type: q.question_type,
                points: q.points,
                options: optionsArray
            };
        });
        
        res.json({
            quiz: {
                id: quiz.id,
                title: quiz.title,
                description: quiz.description,
                time_limit: quiz.time_limit,
                passing_score: quiz.passing_score,
                course_title: quiz.course_title
            },
            questions: parsedQuestions,
            attemptNumber: attemptCount + 1,
            maxAttempts: MAX_ATTEMPTS,
            attemptsLeft: MAX_ATTEMPTS - attemptCount
        });
    } catch (error) {
        console.error('Error fetching quiz for taking:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Submit quiz answers - FIXED VERSION with proper answer comparison
router.post('/:id/submit', async (req, res) => {
    try {
        const db = req.db;
        const quizId = req.params.id;
        const { answers } = req.body;
        
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const studentId = decoded.id;
        
        console.log('========================================');
        console.log('SUBMITTING QUIZ');
        console.log('Quiz ID:', quizId);
        console.log('Student ID:', studentId);
        console.log('Answers received:', answers);
        
        const MAX_ATTEMPTS = 2;
        
        // Check attempt count
        const [attempts] = await db.execute(
            'SELECT COUNT(*) as count FROM quiz_results WHERE quiz_id = ? AND student_id = ?',
            [quizId, studentId]
        );
        
        const attemptCount = attempts[0].count;
        
        if (attemptCount >= MAX_ATTEMPTS) {
            const [passed] = await db.execute(
                'SELECT passed FROM quiz_results WHERE quiz_id = ? AND student_id = ? AND passed = true LIMIT 1',
                [quizId, studentId]
            );
            
            if (passed.length > 0) {
                return res.status(403).json({ message: 'You have already passed this quiz!' });
            } else {
                return res.status(403).json({ message: `You have used all ${MAX_ATTEMPTS} attempts.` });
            }
        }
        
        // Get all questions with correct answers
        const [questions] = await db.execute(
            'SELECT id, correct_answer, points, question_text FROM quiz_questions WHERE quiz_id = ?',
            [quizId]
        );
        
        console.log('Questions from DB:', questions.map(q => ({ 
            id: q.id, 
            correct_answer: q.correct_answer, 
            points: q.points,
            question_text: q.question_text?.substring(0, 50)
        })));
        
        if (questions.length === 0) {
            return res.status(404).json({ message: 'No questions found for this quiz' });
        }
        
        // Calculate score with detailed logging
        let totalPoints = 0;
        let earnedPoints = 0;
        let detailedResults = [];
        
        for (const question of questions) {
            totalPoints += question.points;
            const userAnswer = answers[question.id];
            const dbCorrectAnswer = question.correct_answer;
            
            // Convert both to strings and compare (case insensitive)
            let isCorrect = false;
            if (userAnswer && dbCorrectAnswer) {
                const userAnswerStr = String(userAnswer).trim().toUpperCase();
                const correctAnswerStr = String(dbCorrectAnswer).trim().toUpperCase();
                isCorrect = userAnswerStr === correctAnswerStr;
            }
            
            if (isCorrect) {
                earnedPoints += question.points;
            }
            
            console.log(`Q${question.id}: User="${userAnswer}", DB="${dbCorrectAnswer}", Correct=${isCorrect}, Points=${isCorrect ? question.points : 0}`);
            
            detailedResults.push({
                question_id: question.id,
                question_text: question.question_text,
                user_answer: userAnswer,
                correct_answer: dbCorrectAnswer,
                is_correct: isCorrect,
                points: question.points,
                earned_points: isCorrect ? question.points : 0
            });
        }
        
        const scorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
        const quizPassingScore = await getQuizPassingScore(db, quizId);
        const passed = scorePercentage >= quizPassingScore;
        const attemptNumber = attemptCount + 1;
        
        console.log(`Total Points: ${totalPoints}, Earned: ${earnedPoints}, Score: ${scorePercentage}%, Passed: ${passed}`);
        console.log('========================================');
        
        // Save result
        await db.execute(
            'INSERT INTO quiz_results (student_id, quiz_id, score, passed, answers, submitted_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [studentId, quizId, scorePercentage, passed, JSON.stringify(answers)]
        );
        
        // Check if this is the best score
        const [bestScore] = await db.execute(
            'SELECT MAX(score) as best FROM quiz_results WHERE quiz_id = ? AND student_id = ?',
            [quizId, studentId]
        );
        
        // Record learning activity for streak
        try {
            await db.execute(
                `INSERT INTO learning_streak (student_id, activity_date, activity_type) 
                 VALUES (?, CURDATE(), 'quiz') 
                 ON DUPLICATE KEY UPDATE activity_type = 'quiz'`,
                [studentId]
            );
        } catch (err) {
            console.log('Learning streak table may not exist yet');
        }
        
        res.json({
            success: true,
            score: scorePercentage,
            earnedPoints: earnedPoints,
            totalPoints: totalPoints,
            passed: passed,
            passing_score: quizPassingScore,
            attemptNumber: attemptNumber,
            maxAttempts: MAX_ATTEMPTS,
            attemptsLeft: MAX_ATTEMPTS - attemptNumber,
            bestScore: bestScore[0].best,
            detailedResults: detailedResults,
            message: passed ? '🎉 Congratulations! You passed the quiz!' : `You scored ${scorePercentage}%. Need ${quizPassingScore}% to pass.`
        });
        
    } catch (error) {
        console.error('Error submitting quiz:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// Get quiz results for a student in a course
router.get('/results/:courseId', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.courseId;
        const studentId = req.user.id;
        
        const [results] = await db.execute(`
            SELECT q.id, q.title, q.passing_score, q.time_limit,
                   MAX(qr.score) as best_score,
                   COUNT(qr.id) as attempts,
                   MAX(CASE WHEN qr.passed = true THEN 1 ELSE 0 END) as completed
            FROM quizzes q
            LEFT JOIN quiz_results qr ON q.id = qr.quiz_id AND qr.student_id = ?
            WHERE q.course_id = ?
            GROUP BY q.id
        `, [studentId, courseId]);
        
        res.json({ results });
    } catch (error) {
        console.error('Error fetching quiz results:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== INSTRUCTOR ROUTES ====================

// Get instructor quizzes
router.get('/instructor', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const instructorId = req.user.id;
        
        if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Instructor only.' });
        }
        
        const [quizzes] = await db.execute(`
            SELECT q.*, c.title as course_title,
                   (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as question_count
            FROM quizzes q
            JOIN courses c ON q.course_id = c.id
            WHERE c.instructor_id = ?
            ORDER BY q.created_at DESC
        `, [instructorId]);
        
        res.json({ quizzes });
    } catch (error) {
        console.error('Error fetching quizzes:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single quiz with questions (for editing)
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const quizId = req.params.id;
        
        const [quizzes] = await db.execute('SELECT * FROM quizzes WHERE id = ?', [quizId]);
        
        if (quizzes.length === 0) {
            return res.status(404).json({ message: 'Quiz not found' });
        }
        
        const [questions] = await db.execute(`
            SELECT id, question_text, question_type, points, options, correct_answer 
            FROM quiz_questions 
            WHERE quiz_id = ? 
            ORDER BY id ASC
        `, [quizId]);
        
        const parsedQuestions = questions.map(q => {
            let options = [];
            if (q.options) {
                try {
                    options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
                } catch(e) {
                    options = [];
                }
            }
            return {
                ...q,
                options: options
            };
        });
        
        res.json({
            ...quizzes[0],
            questions: parsedQuestions
        });
    } catch (error) {
        console.error('Error fetching quiz:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create quiz (for instructors)
router.post('/create', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { course_id, title, description, time_limit, passing_score, questions } = req.body;
        
        if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Instructor only.' });
        }
        
        const [courseCheck] = await db.execute(
            'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
            [course_id, req.user.id]
        );
        
        if (courseCheck.length === 0 && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'You do not own this course' });
        }
        
        const [quizResult] = await db.execute(
            'INSERT INTO quizzes (course_id, title, description, time_limit, passing_score) VALUES (?, ?, ?, ?, ?)',
            [course_id, title, description || '', time_limit || 30, passing_score || 70]
        );
        
        const quizId = quizResult.insertId;
        
        for (const question of questions) {
            await db.execute(
                `INSERT INTO quiz_questions 
                (quiz_id, question_text, question_type, points, options, correct_answer) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    quizId, 
                    question.question_text, 
                    question.question_type || 'multiple_choice', 
                    question.points || 10, 
                    JSON.stringify(question.options || []), 
                    question.correct_answer || ''
                ]
            );
        }
        
        res.status(201).json({ message: 'Quiz created successfully', quizId: quizId });
    } catch (error) {
        console.error('Error creating quiz:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// Update quiz
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const quizId = req.params.id;
        const { title, description, time_limit, passing_score, questions } = req.body;
        
        const [quizCheck] = await db.execute(`
            SELECT c.instructor_id FROM quizzes q
            JOIN courses c ON q.course_id = c.id
            WHERE q.id = ?
        `, [quizId]);
        
        if (quizCheck.length === 0) {
            return res.status(404).json({ message: 'Quiz not found' });
        }
        
        if (quizCheck[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        await db.execute(
            'UPDATE quizzes SET title = ?, description = ?, time_limit = ?, passing_score = ? WHERE id = ?',
            [title, description || '', time_limit || 30, passing_score || 70, quizId]
        );
        
        await db.execute('DELETE FROM quiz_questions WHERE quiz_id = ?', [quizId]);
        
        for (const question of questions) {
            await db.execute(
                `INSERT INTO quiz_questions 
                (quiz_id, question_text, question_type, points, options, correct_answer) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    quizId, 
                    question.question_text, 
                    question.question_type || 'multiple_choice', 
                    question.points || 10, 
                    JSON.stringify(question.options || []), 
                    question.correct_answer || ''
                ]
            );
        }
        
        res.json({ message: 'Quiz updated successfully' });
    } catch (error) {
        console.error('Error updating quiz:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete quiz
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const quizId = req.params.id;
        
        const [quizCheck] = await db.execute(`
            SELECT c.instructor_id FROM quizzes q
            JOIN courses c ON q.course_id = c.id
            WHERE q.id = ?
        `, [quizId]);
        
        if (quizCheck.length === 0) {
            return res.status(404).json({ message: 'Quiz not found' });
        }
        
        if (quizCheck[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        await db.execute('DELETE FROM quizzes WHERE id = ?', [quizId]);
        
        res.json({ message: 'Quiz deleted successfully' });
    } catch (error) {
        console.error('Error deleting quiz:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all student results for a quiz (for instructors)
router.get('/results/quiz/:quizId', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const quizId = req.params.quizId;
        
        const [quizCheck] = await db.execute(`
            SELECT c.instructor_id FROM quizzes q
            JOIN courses c ON q.course_id = c.id
            WHERE q.id = ?
        `, [quizId]);
        
        if (quizCheck.length === 0) {
            return res.status(404).json({ message: 'Quiz not found' });
        }
        
        if (quizCheck[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const [results] = await db.execute(`
            SELECT 
                qr.*,
                u.name as student_name,
                u.email as student_email,
                q.title as quiz_title
            FROM quiz_results qr
            JOIN users u ON qr.student_id = u.id
            JOIN quizzes q ON qr.quiz_id = q.id
            WHERE qr.quiz_id = ?
            ORDER BY qr.submitted_at DESC
        `, [quizId]);
        
        res.json({ results });
    } catch (error) {
        console.error('Error fetching quiz results:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;