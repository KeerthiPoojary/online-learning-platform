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

// Get quizzes for a course (for students) - with attempt info
router.get('/course/:courseId', async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.courseId;
        
        // Get student ID from token
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
        res.status(500).json({ message: 'Server error' });
    }
});

// Get student's quiz progress
router.get('/progress/:courseId', async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.courseId;
        
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.json({ quizzes: [] });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const studentId = decoded.id;
        
        const [progress] = await db.execute(`
            SELECT q.id, q.title, 
                   COUNT(DISTINCT qr.id) as attempts,
                   MAX(CASE WHEN qr.passed = true THEN 1 ELSE 0 END) as completed
            FROM quizzes q
            LEFT JOIN quiz_results qr ON q.id = qr.quiz_id AND qr.student_id = ?
            WHERE q.course_id = ?
            GROUP BY q.id
        `, [studentId, courseId]);
        
        res.json({ progress });
    } catch (error) {
        console.error('Error fetching quiz progress:', error);
        res.status(500).json({ message: 'Server error' });
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
        
        // Check attempt count
        const [attempts] = await db.execute(
            'SELECT COUNT(*) as count FROM quiz_results WHERE quiz_id = ? AND student_id = ?',
            [quizId, studentId]
        );
        
        const attemptCount = attempts[0].count;
        const MAX_ATTEMPTS = 2;
        
        if (attemptCount >= MAX_ATTEMPTS) {
            // Check if they already passed
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
        const [quizzes] = await db.execute('SELECT id, title, description, passing_score FROM quizzes WHERE id = ?', [quizId]);
        
        if (quizzes.length === 0) {
            return res.status(404).json({ message: 'Quiz not found' });
        }
        
        // Get questions (without correct answers for students)
        const [questions] = await db.execute(
            'SELECT id, question, option_a, option_b, option_c, option_d, points FROM quiz_questions WHERE quiz_id = ? ORDER BY id',
            [quizId]
        );
        
        res.json({
            ...quizzes[0],
            questions: questions,
            attemptNumber: attemptCount + 1,
            maxAttempts: MAX_ATTEMPTS,
            attemptsLeft: MAX_ATTEMPTS - attemptCount
        });
    } catch (error) {
        console.error('Error fetching quiz for taking:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Submit quiz answers
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
            'SELECT id, correct_answer, points FROM quiz_questions WHERE quiz_id = ?',
            [quizId]
        );
        
        if (questions.length === 0) {
            return res.status(404).json({ message: 'No questions found for this quiz' });
        }
        
        // Calculate score
        let totalPoints = 0;
        let earnedPoints = 0;
        
        for (const question of questions) {
            totalPoints += question.points;
            const userAnswer = answers[question.id];
            if (userAnswer && userAnswer.toUpperCase() === question.correct_answer) {
                earnedPoints += question.points;
            }
        }
        
        const scorePercentage = (earnedPoints / totalPoints) * 100;
        const quizPassingScore = await getQuizPassingScore(db, quizId);
        const passed = scorePercentage >= quizPassingScore;
        const attemptNumber = attemptCount + 1;
        
        // Save result
        await db.execute(
            'INSERT INTO quiz_results (student_id, quiz_id, score, passed, attempt_number, submitted_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [studentId, quizId, Math.round(scorePercentage), passed, attemptNumber]
        );
        
        // Check if this is the best score
        const [bestScore] = await db.execute(
            'SELECT MAX(score) as best FROM quiz_results WHERE quiz_id = ? AND student_id = ?',
            [quizId, studentId]
        );
        
        res.json({
            success: true,
            score: Math.round(scorePercentage),
            earnedPoints: earnedPoints,
            totalPoints: totalPoints,
            passed: passed,
            attemptNumber: attemptNumber,
            maxAttempts: MAX_ATTEMPTS,
            attemptsLeft: MAX_ATTEMPTS - attemptNumber,
            bestScore: bestScore[0].best,
            message: passed ? '🎉 Congratulations! You passed the quiz!' : 'You did not pass. Please try again.'
        });
        
    } catch (error) {
        console.error('Error submitting quiz:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// Get quiz results for a student
router.get('/results/:courseId', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.courseId;
        const studentId = req.user.id;
        
        const [results] = await db.execute(`
            SELECT q.id, q.title, q.passing_score,
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

// Create quiz (for instructors)
router.post('/create', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { course_id, title, description, passing_score, questions } = req.body;
        
        const [quizResult] = await db.execute(
            'INSERT INTO quizzes (course_id, title, description, passing_score) VALUES (?, ?, ?, ?)',
            [course_id, title, description || '', passing_score || 70]
        );
        
        const quizId = quizResult.insertId;
        
        for (const question of questions) {
            await db.execute(
                `INSERT INTO quiz_questions 
                (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer, points) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    quizId, 
                    question.question, 
                    question.option_a, 
                    question.option_b, 
                    question.option_c || '', 
                    question.option_d || '', 
                    question.correct_answer, 
                    question.points || 1
                ]
            );
        }
        
        res.status(201).json({ message: 'Quiz created successfully', quizId: quizId });
    } catch (error) {
        console.error('Error creating quiz:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// Get instructor quizzes
router.get('/instructor', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const instructorId = req.user.id;
        
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
        
        const [questions] = await db.execute(
            'SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY id',
            [quizId]
        );
        
        res.json({
            ...quizzes[0],
            questions: questions
        });
    } catch (error) {
        console.error('Error fetching quiz:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update quiz
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const quizId = req.params.id;
        const { title, description, passing_score, questions } = req.body;
        
        await db.execute(
            'UPDATE quizzes SET title = ?, description = ?, passing_score = ? WHERE id = ?',
            [title, description || '', passing_score || 70, quizId]
        );
        
        await db.execute('DELETE FROM quiz_questions WHERE quiz_id = ?', [quizId]);
        
        for (const question of questions) {
            await db.execute(
                `INSERT INTO quiz_questions 
                (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer, points) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    quizId, 
                    question.question, 
                    question.option_a, 
                    question.option_b, 
                    question.option_c || '', 
                    question.option_d || '', 
                    question.correct_answer, 
                    question.points || 1
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
        await db.execute('DELETE FROM quizzes WHERE id = ?', [req.params.id]);
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
        const instructorId = req.user.id;
        
        // Verify instructor owns this quiz's course
        const [quizCheck] = await db.execute(`
            SELECT c.instructor_id FROM quizzes q
            JOIN courses c ON q.course_id = c.id
            WHERE q.id = ?
        `, [quizId]);
        
        if (quizCheck.length === 0 || quizCheck[0].instructor_id !== instructorId) {
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