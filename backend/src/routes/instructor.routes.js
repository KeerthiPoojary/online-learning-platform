const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const verifyInstructor = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        if (decoded.role !== 'instructor' && decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Instructor only.' });
        }
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Get instructor's courses
router.get('/courses', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const instructor_id = req.user.id;
        
        console.log('Fetching courses for instructor:', instructor_id);
        
        const [courses] = await db.execute(`
            SELECT 
                c.id,
                c.title,
                c.description,
                c.price,
                c.level,
                c.thumbnail,
                c.status,
                c.created_at,
                cat.name as category_name,
                (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as student_count
            FROM courses c
            LEFT JOIN categories cat ON c.category_id = cat.id
            WHERE c.instructor_id = ?
            ORDER BY c.created_at DESC
        `, [instructor_id]);
        
        console.log(`Found ${courses.length} courses`);
        res.json({ courses });
    } catch (error) {
        console.error('Error in /courses:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get instructor stats
router.get('/stats', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const instructor_id = req.user.id;
        
        console.log('Fetching stats for instructor:', instructor_id);
        
        const [courses] = await db.execute(
            'SELECT COUNT(*) as total FROM courses WHERE instructor_id = ?',
            [instructor_id]
        );
        
        res.json({
            totalCourses: courses[0].total || 0,
            totalStudents: 0,
            totalRevenue: 0,
            averageRating: '0',
            monthlyEarnings: 0,
            totalLessons: 0,
            pendingQuizzes: 0,
            upcomingClasses: 0
        });
    } catch (error) {
        console.error('Error in stats:', error);
        res.json({
            totalCourses: 0,
            totalStudents: 0,
            totalRevenue: 0,
            averageRating: '0',
            monthlyEarnings: 0,
            totalLessons: 0,
            pendingQuizzes: 0,
            upcomingClasses: 0
        });
    }
});

// ==================== LESSON MANAGEMENT ROUTES ====================

// Get all lessons for a course
router.get('/courses/:courseId/lessons', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.courseId;
        const instructorId = req.user.id;
        
        // Verify instructor owns this course
        const [courseCheck] = await db.execute(
            'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
            [courseId, instructorId]
        );
        
        if (courseCheck.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const [lessons] = await db.execute(
            'SELECT * FROM lessons WHERE course_id = ? ORDER BY order_number ASC',
            [courseId]
        );
        
        res.json({ lessons });
    } catch (error) {
        console.error('Error fetching lessons:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create a new lesson
router.post('/courses/:courseId/lessons', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.courseId;
        const instructorId = req.user.id;
        const { title, description, video_url, duration } = req.body;
        
        console.log(`Creating lesson for course: ${courseId}`);
        
        // Verify instructor owns this course
        const [courseCheck] = await db.execute(
            'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
            [courseId, instructorId]
        );
        
        if (courseCheck.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        // Get the highest order number to append new lesson at the end
        const [maxOrder] = await db.execute(
            'SELECT MAX(order_number) as max_order FROM lessons WHERE course_id = ?',
            [courseId]
        );
        const orderNumber = (maxOrder[0].max_order || 0) + 1;
        
        // Insert lesson
        const [result] = await db.execute(
            `INSERT INTO lessons (course_id, title, description, video_url, duration, order_number) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [courseId, title, description || '', video_url || '', duration || 0, orderNumber]
        );
        
        console.log(`Lesson created successfully with ID: ${result.insertId}`);
        res.status(201).json({ 
            success: true,
            message: 'Lesson created successfully', 
            lessonId: result.insertId 
        });
    } catch (error) {
        console.error('Error creating lesson:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update a lesson
router.put('/lessons/:lessonId', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const lessonId = req.params.lessonId;
        const instructorId = req.user.id;
        const { title, description, video_url, duration, order_number } = req.body;
        
        console.log(`Updating lesson: ${lessonId}`);
        
        // Verify lesson belongs to instructor's course
        const [lessonCheck] = await db.execute(`
            SELECT l.id FROM lessons l
            JOIN courses c ON l.course_id = c.id
            WHERE l.id = ? AND c.instructor_id = ?
        `, [lessonId, instructorId]);
        
        if (lessonCheck.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        await db.execute(
            `UPDATE lessons 
             SET title = ?, description = ?, video_url = ?, duration = ?, order_number = ?
             WHERE id = ?`,
            [title, description || '', video_url || '', duration || 0, order_number || 0, lessonId]
        );
        
        res.json({ success: true, message: 'Lesson updated successfully' });
    } catch (error) {
        console.error('Error updating lesson:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete a lesson
router.delete('/lessons/:lessonId', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const lessonId = req.params.lessonId;
        const instructorId = req.user.id;
        
        console.log(`Deleting lesson: ${lessonId}`);
        
        // Verify lesson belongs to instructor's course
        const [lessonCheck] = await db.execute(`
            SELECT l.id FROM lessons l
            JOIN courses c ON l.course_id = c.id
            WHERE l.id = ? AND c.instructor_id = ?
        `, [lessonId, instructorId]);
        
        if (lessonCheck.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        await db.execute('DELETE FROM lessons WHERE id = ?', [lessonId]);
        
        res.json({ success: true, message: 'Lesson deleted successfully' });
    } catch (error) {
        console.error('Error deleting lesson:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== QUIZ ROUTES ====================

// Get all quizzes for a course
router.get('/course/:courseId/quizzes', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.courseId;
        const instructorId = req.user.id;
        
        console.log(`Fetching quizzes for course: ${courseId}`);
        
        const [courseCheck] = await db.execute(
            'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
            [courseId, instructorId]
        );
        
        if (courseCheck.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const [quizzes] = await db.execute(`
            SELECT q.*, 
            (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as questions_count
            FROM quizzes q
            WHERE q.course_id = ?
            ORDER BY q.created_at DESC
        `, [courseId]);
        
        // Get questions for each quiz
        for (let quiz of quizzes) {
            const [questions] = await db.execute(`
                SELECT id, question_text, question_type, points, options, correct_answer
                FROM quiz_questions
                WHERE quiz_id = ?
                ORDER BY id ASC
            `, [quiz.id]);
            
            // Parse options if they are stored as JSON string
            quiz.questions = questions.map(q => ({
                ...q,
                options: typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || [])
            }));
        }
        
        console.log(`Found ${quizzes.length} existing quizzes`);
        res.json({ quizzes });
    } catch (error) {
        console.error('Error fetching quizzes:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create a NEW quiz (ADD to existing quizzes)
router.post('/courses/:courseId/quizzes', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.courseId;
        const instructorId = req.user.id;
        const { title, description, time_limit, passing_score, questions } = req.body;
        
        console.log(`Creating NEW quiz for course: ${courseId}`);
        console.log('Quiz data:', { title, description, time_limit, passing_score, questionsCount: questions?.length });
        
        const [courseCheck] = await db.execute(
            'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
            [courseId, instructorId]
        );
        
        if (courseCheck.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        // INSERT new quiz
        const [quizResult] = await db.execute(
            `INSERT INTO quizzes (course_id, title, description, time_limit, passing_score) 
             VALUES (?, ?, ?, ?, ?)`,
            [courseId, title, description || '', time_limit || 30, passing_score || 70]
        );
        
        const quizId = quizResult.insertId;
        console.log(`Created new quiz with ID: ${quizId}`);
        
        // Insert questions with correct_answer as letter (A, B, C, D)
        if (questions && questions.length > 0) {
            for (const question of questions) {
                await db.execute(
                    `INSERT INTO quiz_questions (quiz_id, question_text, question_type, points, options, correct_answer) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [quizId, question.question_text, question.question_type, question.points || 10, 
                     JSON.stringify(question.options || []), question.correct_answer || '']
                );
            }
            console.log(`Added ${questions.length} questions to quiz ${quizId}`);
        }
        
        res.status(201).json({ 
            success: true,
            message: 'Quiz created successfully', 
            quizId: quizId 
        });
    } catch (error) {
        console.error('Error creating quiz:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update ONLY the specified quiz
router.put('/quizzes/:quizId', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const quizId = req.params.quizId;
        const instructorId = req.user.id;
        const { title, description, time_limit, passing_score, questions } = req.body;
        
        console.log(`Updating quiz ID: ${quizId}`);
        
        // Verify quiz belongs to instructor's course
        const [quizCheck] = await db.execute(`
            SELECT q.id FROM quizzes q
            JOIN courses c ON q.course_id = c.id
            WHERE q.id = ? AND c.instructor_id = ?
        `, [quizId, instructorId]);
        
        if (quizCheck.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        // UPDATE only this quiz
        await db.execute(
            `UPDATE quizzes 
             SET title = ?, description = ?, time_limit = ?, passing_score = ?
             WHERE id = ?`,
            [title, description || '', time_limit || 30, passing_score || 70, quizId]
        );
        
        // Update questions - delete old and insert new for THIS quiz only
        if (questions && questions.length > 0) {
            await db.execute('DELETE FROM quiz_questions WHERE quiz_id = ?', [quizId]);
            
            for (const question of questions) {
                await db.execute(
                    `INSERT INTO quiz_questions (quiz_id, question_text, question_type, points, options, correct_answer) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [quizId, question.question_text, question.question_type, question.points || 10, 
                     JSON.stringify(question.options || []), question.correct_answer || '']
                );
            }
            console.log(`Updated ${questions.length} questions for quiz ${quizId}`);
        }
        
        res.json({ success: true, message: 'Quiz updated successfully' });
    } catch (error) {
        console.error('Error updating quiz:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete ONLY the specified quiz
router.delete('/quizzes/:quizId', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const quizId = req.params.quizId;
        const instructorId = req.user.id;
        
        console.log(`Deleting quiz ID: ${quizId}`);
        
        const [quizCheck] = await db.execute(`
            SELECT q.id FROM quizzes q
            JOIN courses c ON q.course_id = c.id
            WHERE q.id = ? AND c.instructor_id = ?
        `, [quizId, instructorId]);
        
        if (quizCheck.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        await db.execute('DELETE FROM quizzes WHERE id = ?', [quizId]);
        
        console.log(`Quiz ${quizId} deleted successfully`);
        res.json({ success: true, message: 'Quiz deleted successfully' });
    } catch (error) {
        console.error('Error deleting quiz:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== ASSIGNMENT ROUTES ====================

// Get all assignments for a course
router.get('/course/:courseId/assignments', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.courseId;
        const instructorId = req.user.id;
        
        const [courseCheck] = await db.execute(
            'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
            [courseId, instructorId]
        );
        
        if (courseCheck.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        // Check if assignments table has instructions column
        let hasInstructionsColumn = false;
        try {
            const [columns] = await db.execute('SHOW COLUMNS FROM assignments');
            hasInstructionsColumn = columns.some(col => col.Field === 'instructions');
        } catch (err) {
            console.log('Assignments table may not exist yet');
        }
        
        let assignments;
        if (hasInstructionsColumn) {
            [assignments] = await db.execute(`
                SELECT a.*, 
                (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id) as submissions_count
                FROM assignments a
                WHERE a.course_id = ?
                ORDER BY a.created_at DESC
            `, [courseId]);
        } else {
            [assignments] = await db.execute(`
                SELECT a.*, 
                (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id) as submissions_count,
                NULL as instructions
                FROM assignments a
                WHERE a.course_id = ?
                ORDER BY a.created_at DESC
            `, [courseId]);
        }
        
        res.json({ assignments });
    } catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create a new assignment
router.post('/courses/:courseId/assignments', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.courseId;
        const instructorId = req.user.id;
        const { title, description, total_points, due_date, instructions } = req.body;
        
        const [courseCheck] = await db.execute(
            'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
            [courseId, instructorId]
        );
        
        if (courseCheck.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        // Check if instructions column exists
        let hasInstructionsColumn = false;
        try {
            const [columns] = await db.execute('SHOW COLUMNS FROM assignments');
            hasInstructionsColumn = columns.some(col => col.Field === 'instructions');
        } catch (err) {
            // Table might not exist, create it
            await db.execute(`
                CREATE TABLE IF NOT EXISTS assignments (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    course_id INT NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    instructions TEXT,
                    total_points INT DEFAULT 100,
                    due_date DATETIME,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
                )
            `);
            hasInstructionsColumn = true;
        }
        
        let result;
        if (hasInstructionsColumn) {
            [result] = await db.execute(
                `INSERT INTO assignments (course_id, title, description, instructions, total_points, due_date) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [courseId, title, description || '', instructions || '', total_points || 100, due_date || null]
            );
        } else {
            [result] = await db.execute(
                `INSERT INTO assignments (course_id, title, description, total_points, due_date) 
                 VALUES (?, ?, ?, ?, ?)`,
                [courseId, title, description || '', total_points || 100, due_date || null]
            );
        }
        
        res.status(201).json({ 
            success: true,
            message: 'Assignment created successfully', 
            assignmentId: result.insertId 
        });
    } catch (error) {
        console.error('Error creating assignment:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update an assignment
router.put('/assignments/:assignmentId', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const assignmentId = req.params.assignmentId;
        const instructorId = req.user.id;
        const { title, description, total_points, due_date, instructions } = req.body;
        
        const [assignmentCheck] = await db.execute(`
            SELECT a.id FROM assignments a
            JOIN courses c ON a.course_id = c.id
            WHERE a.id = ? AND c.instructor_id = ?
        `, [assignmentId, instructorId]);
        
        if (assignmentCheck.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        // Check if instructions column exists
        let hasInstructionsColumn = false;
        try {
            const [columns] = await db.execute('SHOW COLUMNS FROM assignments');
            hasInstructionsColumn = columns.some(col => col.Field === 'instructions');
        } catch (err) {}
        
        if (hasInstructionsColumn) {
            await db.execute(
                `UPDATE assignments 
                 SET title = ?, description = ?, instructions = ?, total_points = ?, due_date = ?
                 WHERE id = ?`,
                [title, description || '', instructions || '', total_points || 100, due_date || null, assignmentId]
            );
        } else {
            await db.execute(
                `UPDATE assignments 
                 SET title = ?, description = ?, total_points = ?, due_date = ?
                 WHERE id = ?`,
                [title, description || '', total_points || 100, due_date || null, assignmentId]
            );
        }
        
        res.json({ success: true, message: 'Assignment updated successfully' });
    } catch (error) {
        console.error('Error updating assignment:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete an assignment
router.delete('/assignments/:assignmentId', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const assignmentId = req.params.assignmentId;
        const instructorId = req.user.id;
        
        const [assignmentCheck] = await db.execute(`
            SELECT a.id FROM assignments a
            JOIN courses c ON a.course_id = c.id
            WHERE a.id = ? AND c.instructor_id = ?
        `, [assignmentId, instructorId]);
        
        if (assignmentCheck.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        await db.execute('DELETE FROM assignments WHERE id = ?', [assignmentId]);
        
        res.json({ success: true, message: 'Assignment deleted successfully' });
    } catch (error) {
        console.error('Error deleting assignment:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Grade an assignment submission
router.put('/assignments/grade/:submissionId', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const submissionId = req.params.submissionId;
        const instructorId = req.user.id;
        const { grade, feedback } = req.body;
        
        const [submissionCheck] = await db.execute(`
            SELECT s.id FROM assignment_submissions s
            JOIN assignments a ON s.assignment_id = a.id
            JOIN courses c ON a.course_id = c.id
            WHERE s.id = ? AND c.instructor_id = ?
        `, [submissionId, instructorId]);
        
        if (submissionCheck.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        await db.execute(
            `UPDATE assignment_submissions 
             SET grade = ?, feedback = ?, graded_at = NOW()
             WHERE id = ?`,
            [grade, feedback || '', submissionId]
        );
        
        res.json({ success: true, message: 'Grade submitted successfully' });
    } catch (error) {
        console.error('Error grading assignment:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== ACTIVITY ROUTES ====================

// Get course enrollments
router.get('/course/:courseId/enrollments', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.courseId;
        const instructorId = req.user.id;
        
        const [courseCheck] = await db.execute(
            'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
            [courseId, instructorId]
        );
        
        if (courseCheck.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const [enrollments] = await db.execute(`
            SELECT e.*, u.name as student_name, u.email as student_email,
                   e.progress, e.completed, e.enrolled_at
            FROM enrollments e
            JOIN users u ON e.student_id = u.id
            WHERE e.course_id = ?
            ORDER BY e.enrolled_at DESC
        `, [courseId]);
        
        res.json({ enrollments });
    } catch (error) {
        console.error('Error fetching enrollments:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get quiz results for a course
router.get('/course/:courseId/quiz-results', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.courseId;
        const instructorId = req.user.id;
        
        const [courseCheck] = await db.execute(
            'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
            [courseId, instructorId]
        );
        
        if (courseCheck.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const [results] = await db.execute(`
            SELECT qr.*, u.name as student_name, q.title as quiz_title,
                   CASE WHEN qr.score >= q.passing_score THEN 1 ELSE 0 END as passed,
                   qr.submitted_at
            FROM quiz_results qr
            JOIN users u ON qr.student_id = u.id
            JOIN quizzes q ON qr.quiz_id = q.id
            WHERE q.course_id = ?
            ORDER BY qr.submitted_at DESC
        `, [courseId]);
        
        res.json({ results });
    } catch (error) {
        console.error('Error fetching quiz results:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get assignment submissions for a course
router.get('/course/:courseId/assignment-submissions', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.courseId;
        const instructorId = req.user.id;
        
        const [courseCheck] = await db.execute(
            'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
            [courseId, instructorId]
        );
        
        if (courseCheck.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const [submissions] = await db.execute(`
            SELECT s.*, u.name as student_name, u.email as student_email, 
                   a.title as assignment_title, a.total_points,
                   s.submitted_at, s.grade, s.feedback
            FROM assignment_submissions s
            JOIN users u ON s.student_id = u.id
            JOIN assignments a ON s.assignment_id = a.id
            WHERE a.course_id = ?
            ORDER BY s.submitted_at DESC
        `, [courseId]);
        
        res.json({ submissions });
    } catch (error) {
        console.error('Error fetching assignment submissions:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;