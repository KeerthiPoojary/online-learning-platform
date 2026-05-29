const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
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

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const userId = req.user.id;
        
        const [users] = await db.execute(
            'SELECT id, name, email, role, profile_pic, bio, created_at FROM users WHERE id = ?',
            [userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(users[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user by ID (public profile)
router.get('/:id', async (req, res) => {
    try {
        const db = req.db;
        const userId = req.params.id;
        
        const [users] = await db.execute(
            'SELECT id, name, email, role, profile_pic, bio, created_at FROM users WHERE id = ?',
            [userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(users[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const userId = req.user.id;
        const { name, bio, profile_pic } = req.body;
        
        await db.execute(
            'UPDATE users SET name = ?, bio = ?, profile_pic = ? WHERE id = ?',
            [name, bio, profile_pic, userId]
        );
        
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Change password
router.put('/change-password', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const userId = req.user.id;
        const { current_password, new_password } = req.body;
        
        // Get current user
        const [users] = await db.execute('SELECT password FROM users WHERE id = ?', [userId]);
        
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Verify current password
        const isValid = await bcrypt.compare(current_password, users[0].password);
        if (!isValid) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(new_password, 10);
        
        // Update password
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
        
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get enrolled courses for a student
router.get('/:userId/enrolled-courses', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const userId = req.params.userId;
        
        // Check if user has access (own profile or admin)
        if (req.user.id != userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const [courses] = await db.execute(`
            SELECT c.*, e.progress, e.completed, e.enrolled_at,
                   (SELECT COUNT(*) FROM lessons WHERE course_id = c.id) as total_lessons,
                   (SELECT COUNT(*) FROM lessons WHERE course_id = c.id AND id IN 
                    (SELECT lesson_id FROM lesson_progress WHERE student_id = ? AND completed = 1)) as completed_lessons
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE e.student_id = ?
            ORDER BY e.enrolled_at DESC
        `, [userId, userId]);
        
        res.json({ courses });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user statistics
router.get('/stats', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const userId = req.user.id;
        
        // Total enrolled courses
        const [enrolled] = await db.execute(
            'SELECT COUNT(*) as total FROM enrollments WHERE student_id = ?',
            [userId]
        );
        
        // Completed courses
        const [completed] = await db.execute(
            'SELECT COUNT(*) as total FROM enrollments WHERE student_id = ? AND completed = true',
            [userId]
        );
        
        // Total certificates
        const [certificates] = await db.execute(
            'SELECT COUNT(*) as total FROM certificates WHERE student_id = ?',
            [userId]
        );
        
        // Average quiz score
        const [avgScore] = await db.execute(
            'SELECT AVG(score) as average FROM quiz_results WHERE student_id = ?',
            [userId]
        );
        
        // Total learning hours (assuming each lesson is 1 hour on average)
        const [totalHours] = await db.execute(`
            SELECT SUM(l.duration) as total FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            JOIN lessons l ON c.id = l.course_id
            WHERE e.student_id = ?
        `, [userId]);
        
        res.json({
            enrolledCourses: enrolled[0].total,
            completedCourses: completed[0].total,
            totalCertificates: certificates[0].total,
            averageQuizScore: Math.round(avgScore[0].average || 0),
            totalLearningHours: Math.round((totalHours[0].total || 0) / 60)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get instructor statistics
router.get('/instructor-stats', verifyToken, async (req, res) => {
    try {
        // Check if user is instructor or admin
        if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const db = req.db;
        const instructorId = req.user.id;
        
        // Total courses
        const [totalCourses] = await db.execute(
            'SELECT COUNT(*) as total FROM courses WHERE instructor_id = ?',
            [instructorId]
        );
        
        // Total students enrolled in instructor's courses
        const [totalStudents] = await db.execute(`
            SELECT COUNT(DISTINCT e.student_id) as total 
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE c.instructor_id = ?
        `, [instructorId]);
        
        // Total revenue
        const [totalRevenue] = await db.execute(`
            SELECT SUM(p.amount) as total 
            FROM payments p
            JOIN courses c ON p.course_id = c.id
            WHERE c.instructor_id = ? AND p.status = 'completed'
        `, [instructorId]);
        
        // Average course rating
        const [avgRating] = await db.execute(`
            SELECT AVG(r.rating) as average 
            FROM reviews r
            JOIN courses c ON r.course_id = c.id
            WHERE c.instructor_id = ?
        `, [instructorId]);
        
        res.json({
            totalCourses: totalCourses[0].total,
            totalStudents: totalStudents[0].total,
            totalRevenue: totalRevenue[0].total || 0,
            averageRating: parseFloat(avgRating[0].average || 0).toFixed(1)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all students (Admin only)
router.get('/admin/students', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const db = req.db;
        const { search, page = 1, limit = 10 } = req.query;
        
        let query = 'SELECT id, name, email, profile_pic, created_at FROM users WHERE role = "student"';
        const params = [];
        
        if (search) {
            query += ' AND (name LIKE ? OR email LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
        
        const [students] = await db.execute(query, params);
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM users WHERE role = "student"';
        if (search) {
            countQuery += ' AND (name LIKE ? OR email LIKE ?)';
            const [countResult] = await db.execute(countQuery, [`%${search}%`, `%${search}%`]);
            total = countResult[0].total;
        } else {
            const [countResult] = await db.execute(countQuery);
            total = countResult[0].total;
        }
        
        res.json({
            students,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all instructors (Admin only)
router.get('/admin/instructors', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const db = req.db;
        
        const [instructors] = await db.execute(`
            SELECT u.*, COUNT(DISTINCT c.id) as course_count, 
                   COUNT(DISTINCT e.student_id) as student_count
            FROM users u
            LEFT JOIN courses c ON u.id = c.instructor_id
            LEFT JOIN enrollments e ON c.id = e.course_id
            WHERE u.role = 'instructor'
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `);
        
        res.json({ instructors });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user role (Admin only)
router.put('/admin/update-role/:userId', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const db = req.db;
        const { userId } = req.params;
        const { role } = req.body;
        
        if (!['student', 'instructor', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }
        
        await db.execute('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
        
        res.json({ message: 'User role updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete user (Admin only)
router.delete('/admin/delete/:userId', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const db = req.db;
        const { userId } = req.params;
        
        // Start transaction
        await db.execute('START TRANSACTION');
        
        // Delete user data
        await db.execute('DELETE FROM notifications WHERE user_id = ?', [userId]);
        await db.execute('DELETE FROM chat_messages WHERE sender_id = ? OR receiver_id = ?', [userId, userId]);
        await db.execute('DELETE FROM forum_replies WHERE user_id = ?', [userId]);
        await db.execute('DELETE FROM forum_discussions WHERE user_id = ?', [userId]);
        await db.execute('DELETE FROM reviews WHERE student_id = ?', [userId]);
        await db.execute('DELETE FROM wishlist WHERE student_id = ?', [userId]);
        await db.execute('DELETE FROM quiz_results WHERE student_id = ?', [userId]);
        await db.execute('DELETE FROM enrollments WHERE student_id = ?', [userId]);
        await db.execute('DELETE FROM payments WHERE student_id = ?', [userId]);
        await db.execute('DELETE FROM certificates WHERE student_id = ?', [userId]);
        
        // Delete courses if instructor
        const [courses] = await db.execute('SELECT id FROM courses WHERE instructor_id = ?', [userId]);
        for (const course of courses) {
            await db.execute('DELETE FROM lessons WHERE course_id = ?', [course.id]);
            await db.execute('DELETE FROM quizzes WHERE course_id = ?', [course.id]);
            await db.execute('DELETE FROM reviews WHERE course_id = ?', [course.id]);
        }
        await db.execute('DELETE FROM courses WHERE instructor_id = ?', [userId]);
        
        // Delete user
        await db.execute('DELETE FROM users WHERE id = ?', [userId]);
        
        await db.execute('COMMIT');
        
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        await req.db.execute('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user notifications
router.get('/notifications', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const userId = req.user.id;
        
        const [notifications] = await db.execute(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [userId]
        );
        
        res.json({ notifications });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Mark notification as read
router.put('/notifications/:id/read', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const userId = req.user.id;
        const { id } = req.params;
        
        await db.execute(
            'UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user's wishlist
router.get('/wishlist', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const userId = req.user.id;
        
        const [wishlist] = await db.execute(`
            SELECT w.*, c.title, c.description, c.price, c.thumbnail, c.level,
                   u.name as instructor_name
            FROM wishlist w
            JOIN courses c ON w.course_id = c.id
            JOIN users u ON c.instructor_id = u.id
            WHERE w.student_id = ?
            ORDER BY w.added_at DESC
        `, [userId]);
        
        res.json({ wishlist });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add to wishlist
router.post('/wishlist/:courseId', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const userId = req.user.id;
        const { courseId } = req.params;
        
        // Check if already in wishlist
        const [existing] = await db.execute(
            'SELECT id FROM wishlist WHERE student_id = ? AND course_id = ?',
            [userId, courseId]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Course already in wishlist' });
        }
        
        await db.execute(
            'INSERT INTO wishlist (student_id, course_id) VALUES (?, ?)',
            [userId, courseId]
        );
        
        res.json({ message: 'Course added to wishlist' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Remove from wishlist
router.delete('/wishlist/:courseId', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const userId = req.user.id;
        const { courseId } = req.params;
        
        await db.execute(
            'DELETE FROM wishlist WHERE student_id = ? AND course_id = ?',
            [userId, courseId]
        );
        
        res.json({ message: 'Course removed from wishlist' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all users (Admin only)
router.get('/admin/all-users', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const db = req.db;
        
        const [users] = await db.execute(`
            SELECT id, name, email, role, created_at, 
                   (SELECT COUNT(*) FROM courses WHERE instructor_id = users.id) as course_count,
                   (SELECT COUNT(*) FROM enrollments WHERE student_id = users.id) as enrollment_count
            FROM users
            ORDER BY created_at DESC
        `);
        
        res.json({ users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;