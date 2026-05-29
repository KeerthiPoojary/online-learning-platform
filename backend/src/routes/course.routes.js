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

// ==================== SPECIFIC ROUTES (BEFORE /:id) ====================

// Get learning streak
router.get('/learning-streak', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const studentId = req.user.id;
        
        const [streak] = await db.execute(`
            SELECT COUNT(DISTINCT activity_date) as streak
            FROM learning_streak
            WHERE student_id = ? AND activity_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `, [studentId]);
        
        // Calculate consecutive days
        let streakDays = 0;
        const [activities] = await db.execute(`
            SELECT DISTINCT activity_date
            FROM learning_streak
            WHERE student_id = ?
            ORDER BY activity_date DESC
        `, [studentId]);
        
        if (activities.length > 0) {
            let currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);
            
            for (let i = 0; i < activities.length; i++) {
                const activityDate = new Date(activities[i].activity_date);
                activityDate.setHours(0, 0, 0, 0);
                
                const diffDays = Math.floor((currentDate - activityDate) / (1000 * 60 * 60 * 24));
                
                if (diffDays === streakDays) {
                    streakDays++;
                } else {
                    break;
                }
            }
        }
        
        res.json({ streak: streakDays });
    } catch (error) {
        console.error('Error fetching streak:', error);
        res.json({ streak: 0 });
    }
});

// Get course progress
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
            SELECT l.id, l.title
            FROM lesson_progress lp
            JOIN lessons l ON lp.lesson_id = l.id
            WHERE l.course_id = ? AND lp.student_id = ? AND lp.completed = TRUE
        `, [courseId, studentId]);
        
        res.json({ completedLessons });
    } catch (error) {
        console.error('Error fetching completed lessons:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get enrolled courses for student
router.get('/student/enrolled', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const studentId = req.user.id;
        
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
                u.name as instructor_name
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            JOIN users u ON c.instructor_id = u.id
            WHERE e.student_id = ?
            ORDER BY e.enrolled_at DESC
        `, [studentId]);
        
        res.json({ courses });
    } catch (error) {
        console.error('Error fetching enrolled courses:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get instructor's courses
router.get('/instructor/courses', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const instructorId = req.user.id;
        
        const [courses] = await db.execute(`
            SELECT c.*, cat.name as category_name,
                   (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as student_count
            FROM courses c
            LEFT JOIN categories cat ON c.category_id = cat.id
            WHERE c.instructor_id = ?
            ORDER BY c.created_at DESC
        `, [instructorId]);
        
        res.json({ courses });
    } catch (error) {
        console.error('Error fetching instructor courses:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get lessons for a course
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

// Check if user is enrolled
router.get('/:id/check-enrollment', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.id;
        const studentId = req.user.id;
        
        const [enrollment] = await db.execute(
            'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?',
            [studentId, courseId]
        );
        
        res.json({ enrolled: enrollment.length > 0 });
    } catch (error) {
        console.error('Error checking enrollment:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== DYNAMIC ROUTES (AFTER SPECIFIC ONES) ====================

// Get all approved courses
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

// Create course
router.post('/', async (req, res) => {
    try {
        const db = req.db;
        const { title, description, category_id, instructor_id, price, level, thumbnail, status } = req.body;
        
        if (!title) {
            return res.status(400).json({ message: 'Title is required' });
        }
        if (!description) {
            return res.status(400).json({ message: 'Description is required' });
        }
        if (!instructor_id) {
            return res.status(400).json({ message: 'Instructor ID is required' });
        }
        
        const finalCategoryId = category_id && category_id !== '' ? parseInt(category_id) : null;
        const finalPrice = price && !isNaN(price) ? parseFloat(price) : 0;
        const finalLevel = level || 'beginner';
        
        const [result] = await db.execute(
            'INSERT INTO courses (title, description, category_id, instructor_id, price, level, thumbnail, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [title, description, finalCategoryId, instructor_id, finalPrice, finalLevel, thumbnail || null, status || 'pending']
        );
        
        res.status(201).json({ 
            message: 'Course created successfully', 
            courseId: result.insertId 
        });
    } catch (error) {
        console.error('Error creating course:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// Update course
router.put('/:id', async (req, res) => {
    try {
        const db = req.db;
        const { title, description, category_id, instructor_id, price, level, thumbnail, status } = req.body;
        
        await db.execute(
            'UPDATE courses SET title=?, description=?, category_id=?, instructor_id=?, price=?, level=?, thumbnail=?, status=? WHERE id=?',
            [title, description, category_id || null, instructor_id, price || 0, level || 'beginner', thumbnail || null, status || 'pending', req.params.id]
        );
        
        res.json({ message: 'Course updated' });
    } catch (error) {
        console.error('Error updating course:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete course
router.delete('/:id', async (req, res) => {
    try {
        const db = req.db;
        await db.execute('DELETE FROM courses WHERE id = ?', [req.params.id]);
        res.json({ message: 'Course deleted' });
    } catch (error) {
        console.error('Error deleting course:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== ENROLLMENT ====================

// Enroll in course
router.post('/:id/enroll', async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.id;
        
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Please login to enroll' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const studentId = decoded.id;
        
        // Check if user is a student
        const [users] = await db.execute('SELECT role FROM users WHERE id = ?', [studentId]);
        if (users[0]?.role !== 'student') {
            return res.status(403).json({ message: 'Only students can enroll in courses' });
        }
        
        // Check if course exists and is approved
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
        
        // Check if already enrolled
        const [existing] = await db.execute(
            'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?',
            [studentId, courseId]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Already enrolled in this course' });
        }
        
        // Enroll in course
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

// Update course progress
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

// ==================== LESSONS ====================

// Create a lesson
router.post('/lessons', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { course_id, title, description, video_url, duration, order_number } = req.body;
        
        const [result] = await db.execute(
            'INSERT INTO lessons (course_id, title, description, video_url, duration, order_number) VALUES (?, ?, ?, ?, ?, ?)',
            [course_id, title, description || '', video_url, duration || 0, order_number || 0]
        );
        
        res.status(201).json({ message: 'Lesson created', id: result.insertId });
    } catch (error) {
        console.error('Error creating lesson:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// Update a lesson
router.put('/lessons/:id', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { title, description, video_url, duration, order_number } = req.body;
        
        await db.execute(
            'UPDATE lessons SET title=?, description=?, video_url=?, duration=?, order_number=? WHERE id=?',
            [title, description, video_url, duration, order_number, req.params.id]
        );
        
        res.json({ message: 'Lesson updated' });
    } catch (error) {
        console.error('Error updating lesson:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a lesson
router.delete('/lessons/:id', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        await db.execute('DELETE FROM lessons WHERE id = ?', [req.params.id]);
        res.json({ message: 'Lesson deleted' });
    } catch (error) {
        console.error('Error deleting lesson:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Mark lesson as completed
router.post('/lesson/:lessonId/complete', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const lessonId = req.params.lessonId;
        const studentId = req.user.id;
        
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
        
        // Update overall course progress
        await updateCourseProgress(db, studentId, lessonId);
        
        // Record learning activity for streak
        await db.execute(
            `INSERT INTO learning_streak (student_id, activity_date, activity_type) 
             VALUES (?, CURDATE(), 'lesson') 
             ON DUPLICATE KEY UPDATE activity_type = 'lesson'`,
            [studentId]
        );
        
        res.json({ message: 'Lesson marked as completed' });
    } catch (error) {
        console.error('Error marking lesson complete:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== HELPER FUNCTIONS ====================

async function updateCourseProgress(db, studentId, lessonId) {
    const [lesson] = await db.execute('SELECT course_id FROM lessons WHERE id = ?', [lessonId]);
    if (lesson.length === 0) return;
    
    const courseId = lesson[0].course_id;
    
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
    
    await db.execute(
        'UPDATE enrollments SET progress = ?, completed = ? WHERE student_id = ? AND course_id = ?',
        [progress, progress === 100, studentId, courseId]
    );
}

// ==================== INSTRUCTOR STATS ====================

router.get('/instructor/stats', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const instructorId = req.user.id;
        
        const [courses] = await db.execute('SELECT COUNT(*) as total FROM courses WHERE instructor_id = ?', [instructorId]);
        
        res.json({
            totalCourses: courses[0].total || 0,
            totalStudents: 0,
            totalRevenue: 0,
            averageRating: '0'
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;