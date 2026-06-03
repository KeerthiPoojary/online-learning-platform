const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Middleware to verify token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Middleware to check if user is instructor or admin
const verifyInstructor = (req, res, next) => {
    if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Instructor only.' });
    }
    next();
};

// ==================== STUDENT DASHBOARD ENDPOINTS ====================

// Get student's enrolled courses
router.get('/student/enrolled', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const studentId = req.user.id;
        
        console.log('Fetching enrolled courses for student:', studentId);
        
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Access denied. Student only.' });
        }
        
        const [courses] = await db.execute(`
            SELECT 
                c.id,
                c.title,
                c.description,
                c.price,
                c.thumbnail,
                c.level,
                e.progress,
                e.completed,
                e.enrolled_at,
                u.name as instructor_name,
                (SELECT COUNT(*) FROM lessons WHERE course_id = c.id) as total_lessons
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            JOIN users u ON c.instructor_id = u.id
            WHERE e.student_id = ?
            ORDER BY e.enrolled_at DESC
        `, [studentId]);
        
        console.log(`Found ${courses.length} enrolled courses`);
        res.json({ courses });
    } catch (error) {
        console.error('Error fetching enrolled courses:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get student's learning streak
router.get('/learning-streak', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const studentId = req.user.id;
        
        const [activities] = await db.execute(`
            SELECT DISTINCT DATE(activity_date) as activity_date
            FROM learning_streak
            WHERE student_id = ? 
            AND activity_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            ORDER BY activity_date DESC
        `, [studentId]);
        
        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < activities.length; i++) {
            const activityDate = new Date(activities[i].activity_date);
            activityDate.setHours(0, 0, 0, 0);
            const diffDays = Math.floor((currentDate - activityDate) / (1000 * 60 * 60 * 24));
            if (diffDays === streak) {
                streak++;
            } else {
                break;
            }
        }
        
        res.json({ streak: streak });
    } catch (error) {
        console.error('Error fetching streak:', error);
        res.json({ streak: 0 });
    }
});

// Record learning activity
router.post('/record-activity', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const studentId = req.user.id;
        const { activity_type } = req.body;
        
        await db.execute(
            `INSERT INTO learning_streak (student_id, activity_date, activity_type) 
             VALUES (?, CURDATE(), ?) 
             ON DUPLICATE KEY UPDATE activity_type = ?`,
            [studentId, activity_type || 'lesson', activity_type || 'lesson']
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error recording activity:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get course progress for student
router.get('/progress/:courseId', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.courseId;
        const studentId = req.user.id;
        
        const [totalLessons] = await db.execute(
            'SELECT COUNT(*) as total FROM lessons WHERE course_id = ?',
            [courseId]
        );
        
        const [completedLessons] = await db.execute(`
            SELECT COUNT(*) as completed 
            FROM lesson_progress lp
            JOIN lessons l ON lp.lesson_id = l.id
            WHERE l.course_id = ? AND lp.student_id = ? AND lp.completed = TRUE
        `, [courseId, studentId]);
        
        const total = totalLessons[0].total || 0;
        const completed = completedLessons[0].completed || 0;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        res.json({
            totalLessons: total,
            completedLessons: completed,
            percentage: percentage
        });
    } catch (error) {
        console.error('Error fetching progress:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get completed lessons details
router.get('/progress/:courseId/details', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.courseId;
        const studentId = req.user.id;
        
        const [completedLessons] = await db.execute(`
            SELECT l.id, l.title, l.order_number
            FROM lesson_progress lp
            JOIN lessons l ON lp.lesson_id = l.id
            WHERE l.course_id = ? AND lp.student_id = ? AND lp.completed = TRUE
            ORDER BY l.order_number ASC
        `, [courseId, studentId]);
        
        res.json({ completedLessons });
    } catch (error) {
        console.error('Error fetching completed lessons:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== CATEGORIES ====================
router.get('/categories', async (req, res) => {
    try {
        const db = req.db;
        const [categories] = await db.execute('SELECT id, name, description FROM categories ORDER BY name ASC');
        res.json({ categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== COURSE ROUTES ====================

// Get all approved courses (for students)
router.get('/', async (req, res) => {
    try {
        const db = req.db;
        const [courses] = await db.execute(`
            SELECT c.*, u.name as instructor_name, cat.name as category_name,
                   (SELECT AVG(rating) FROM reviews WHERE course_id = c.id) as avg_rating,
                   (SELECT COUNT(*) FROM lessons WHERE course_id = c.id) as total_lessons
            FROM courses c
            LEFT JOIN users u ON c.instructor_id = u.id
            LEFT JOIN categories cat ON c.category_id = cat.id
            WHERE c.status = 'approved'
            ORDER BY c.created_at DESC
        `);
        res.json({ courses });
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single course
router.get('/:id', async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.id;
        
        const [courses] = await db.execute(`
            SELECT c.*, u.name as instructor_name, cat.name as category_name
            FROM courses c
            LEFT JOIN users u ON c.instructor_id = u.id
            LEFT JOIN categories cat ON c.category_id = cat.id
            WHERE c.id = ?
        `, [courseId]);
        
        if (courses.length === 0) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        const [lessons] = await db.execute(
            'SELECT * FROM lessons WHERE course_id = ? ORDER BY order_number ASC',
            [courseId]
        );
        
        res.json({
            ...courses[0],
            lessons
        });
    } catch (error) {
        console.error('Error fetching course:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get lessons for a course (public)
router.get('/:courseId/lessons', async (req, res) => {
    try {
        const db = req.db;
        const [lessons] = await db.execute(
            'SELECT * FROM lessons WHERE course_id = ? ORDER BY order_number ASC',
            [req.params.courseId]
        );
        res.json({ lessons });
    } catch (error) {
        console.error('Error fetching lessons:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== LESSON MANAGEMENT (INSTRUCTOR ONLY) ====================

// Create a lesson (instructor only)
router.post('/lessons', verifyToken, verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const { course_id, title, description, video_url, duration, order_number } = req.body;
        
        console.log('Creating lesson for course:', course_id);
        
        // Verify course belongs to instructor
        const [courseCheck] = await db.execute(
            'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
            [course_id, req.user.id]
        );
        
        if (courseCheck.length === 0 && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'You do not own this course' });
        }
        
        // Get the highest order number to append new lesson at the end
        const [maxOrder] = await db.execute(
            'SELECT MAX(order_number) as max_order FROM lessons WHERE course_id = ?',
            [course_id]
        );
        const newOrderNumber = (maxOrder[0].max_order || 0) + 1;
        
        // Insert lesson
        const [result] = await db.execute(
            `INSERT INTO lessons (course_id, title, description, video_url, duration, order_number) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [course_id, title, description || '', video_url || '', duration || 0, order_number || newOrderNumber]
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

// Update a lesson (instructor only)
router.put('/lessons/:id', verifyToken, verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const lessonId = req.params.id;
        const { title, description, video_url, duration, order_number } = req.body;
        
        console.log('Updating lesson:', lessonId);
        
        // Check if user owns this lesson's course
        const [lessonCheck] = await db.execute(`
            SELECT c.instructor_id FROM lessons l
            JOIN courses c ON l.course_id = c.id
            WHERE l.id = ?
        `, [lessonId]);
        
        if (lessonCheck.length === 0) {
            return res.status(404).json({ message: 'Lesson not found' });
        }
        
        if (lessonCheck[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
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

// Delete a lesson (instructor only)
router.delete('/lessons/:id', verifyToken, verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const lessonId = req.params.id;
        
        console.log('Deleting lesson:', lessonId);
        
        // Check if user owns this lesson's course
        const [lessonCheck] = await db.execute(`
            SELECT c.instructor_id FROM lessons l
            JOIN courses c ON l.course_id = c.id
            WHERE l.id = ?
        `, [lessonId]);
        
        if (lessonCheck.length === 0) {
            return res.status(404).json({ message: 'Lesson not found' });
        }
        
        if (lessonCheck[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        await db.execute('DELETE FROM lessons WHERE id = ?', [lessonId]);
        
        res.json({ success: true, message: 'Lesson deleted successfully' });
    } catch (error) {
        console.error('Error deleting lesson:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== ENROLLMENT ROUTES ====================

// Check if user is enrolled
router.get('/:id/check-enrollment', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.id;
        const studentId = req.user.id;
        
        const [enrollment] = await db.execute(
            'SELECT id, progress, completed FROM enrollments WHERE student_id = ? AND course_id = ?',
            [studentId, courseId]
        );
        
        res.json({ 
            enrolled: enrollment.length > 0,
            progress: enrollment[0]?.progress || 0,
            completed: enrollment[0]?.completed || false
        });
    } catch (error) {
        console.error('Error checking enrollment:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Enroll in course
router.post('/:id/enroll', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.id;
        const studentId = req.user.id;
        
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Only students can enroll in courses' });
        }
        
        const [courses] = await db.execute(
            'SELECT id, status FROM courses WHERE id = ?',
            [courseId]
        );
        
        if (courses.length === 0) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        if (courses[0].status !== 'approved') {
            return res.status(400).json({ message: 'Course is not yet approved' });
        }
        
        const [existing] = await db.execute(
            'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?',
            [studentId, courseId]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Already enrolled in this course' });
        }
        
        await db.execute(
            'INSERT INTO enrollments (student_id, course_id, enrolled_at, progress) VALUES (?, ?, NOW(), 0)',
            [studentId, courseId]
        );
        
        res.json({ 
            success: true,
            message: 'Successfully enrolled in course!',
            enrolled: true
        });
        
    } catch (error) {
        console.error('Enrollment error:', error);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});

// Mark lesson as completed
router.post('/lesson/:lessonId/complete', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const lessonId = req.params.lessonId;
        const studentId = req.user.id;
        
        const [lesson] = await db.execute('SELECT course_id FROM lessons WHERE id = ?', [lessonId]);
        if (lesson.length === 0) {
            return res.status(404).json({ message: 'Lesson not found' });
        }
        
        const courseId = lesson[0].course_id;
        
        const [enrollment] = await db.execute(
            'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?',
            [studentId, courseId]
        );
        
        if (enrollment.length === 0) {
            return res.status(403).json({ message: 'You are not enrolled in this course' });
        }
        
        const [existing] = await db.execute(
            'SELECT id FROM lesson_progress WHERE student_id = ? AND lesson_id = ?',
            [studentId, lessonId]
        );
        
        if (existing.length === 0) {
            await db.execute(
                'INSERT INTO lesson_progress (student_id, lesson_id, completed, completed_at) VALUES (?, ?, TRUE, NOW())',
                [studentId, lessonId]
            );
        } else {
            await db.execute(
                'UPDATE lesson_progress SET completed = TRUE, completed_at = NOW() WHERE student_id = ? AND lesson_id = ?',
                [studentId, lessonId]
            );
        }
        
        await db.execute(
            `INSERT INTO learning_streak (student_id, activity_date, activity_type) 
             VALUES (?, CURDATE(), 'lesson') 
             ON DUPLICATE KEY UPDATE activity_type = 'lesson'`,
            [studentId]
        );
        
        await updateCourseProgress(db, studentId, courseId);
        
        res.json({ message: 'Lesson marked as completed' });
    } catch (error) {
        console.error('Error marking lesson complete:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Helper function to update course progress
async function updateCourseProgress(db, studentId, courseId) {
    const [totalLessons] = await db.execute(
        'SELECT COUNT(*) as total FROM lessons WHERE course_id = ?',
        [courseId]
    );
    
    const [completedLessons] = await db.execute(`
        SELECT COUNT(*) as completed 
        FROM lesson_progress lp
        JOIN lessons l ON lp.lesson_id = l.id
        WHERE l.course_id = ? AND lp.student_id = ? AND lp.completed = TRUE
    `, [courseId, studentId]);
    
    const total = totalLessons[0].total;
    const completed = completedLessons[0].completed;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    const isCompleted = progress === 100;
    
    await db.execute(
        'UPDATE enrollments SET progress = ?, completed = ? WHERE student_id = ? AND course_id = ?',
        [progress, isCompleted, studentId, courseId]
    );
}

// Update course progress (legacy endpoint)
router.put('/:id/progress', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.id;
        const { progress } = req.body;
        const studentId = req.user.id;
        
        const completed = progress === 100;
        
        await db.execute(
            'UPDATE enrollments SET progress = ?, completed = ? WHERE student_id = ? AND course_id = ?',
            [progress, completed, studentId, courseId]
        );
        
        res.json({ message: 'Progress updated' });
    } catch (error) {
        console.error('Error updating progress:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add review to course
router.post('/:id/review', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.id;
        const studentId = req.user.id;
        const { rating, comment } = req.body;
        
        const [enrollment] = await db.execute(
            'SELECT id FROM enrollments WHERE course_id = ? AND student_id = ?',
            [courseId, studentId]
        );
        
        if (enrollment.length === 0) {
            return res.status(403).json({ message: 'You must be enrolled to leave a review' });
        }
        
        const [existing] = await db.execute(
            'SELECT id FROM reviews WHERE course_id = ? AND user_id = ?',
            [courseId, studentId]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ message: 'You have already reviewed this course' });
        }
        
        await db.execute(
            'INSERT INTO reviews (course_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
            [courseId, studentId, rating, comment]
        );
        
        res.json({ message: 'Review added successfully' });
    } catch (error) {
        console.error('Error adding review:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;