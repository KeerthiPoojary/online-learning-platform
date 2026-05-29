const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const verifyAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// GET CATEGORIES
router.get('/categories', verifyAdmin, async (req, res) => {
    try {
        const db = req.db;
        const [categories] = await db.execute('SELECT * FROM categories ORDER BY name ASC');
        res.json({ categories });
    } catch (error) {
        console.error('Categories error:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET INSTRUCTORS
router.get('/instructors', verifyAdmin, async (req, res) => {
    try {
        const db = req.db;
        const [instructors] = await db.execute('SELECT id, name, email FROM users WHERE role = "instructor"');
        res.json({ instructors });
    } catch (error) {
        console.error('Instructors error:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET COURSES
router.get('/courses', verifyAdmin, async (req, res) => {
    try {
        const db = req.db;
        
        // Simple query first to check if we get courses
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
                c.category_id,
                c.instructor_id,
                cat.name as category_name,
                u.name as instructor_name
            FROM courses c
            LEFT JOIN categories cat ON cat.id = c.category_id
            LEFT JOIN users u ON u.id = c.instructor_id
            ORDER BY c.created_at DESC
        `);
        
        console.log('=== COURSES API CALLED ===');
        console.log('Number of courses:', courses.length);
        
        if (courses.length > 0) {
            console.log('First course:', {
                id: courses[0].id,
                title: courses[0].title,
                category_id: courses[0].category_id,
                category_name: courses[0].category_name,
                instructor_id: courses[0].instructor_id,
                instructor_name: courses[0].instructor_name
            });
        }
        
        res.json({ courses });
    } catch (error) {
        console.error('Courses API Error:', error);
        res.status(500).json({ message: error.message });
    }
});

// CREATE COURSE
router.post('/courses', verifyAdmin, async (req, res) => {
    try {
        const db = req.db;
        const { title, description, category_id, instructor_id, price, level, thumbnail, status } = req.body;
        
        console.log('Creating course:', { title, category_id, instructor_id });
        
        const [result] = await db.execute(
            `INSERT INTO courses (title, description, category_id, instructor_id, price, level, thumbnail, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, category_id, instructor_id, price || 0, level || 'beginner', thumbnail || '', status || 'pending']
        );
        
        res.json({ message: 'Course created', id: result.insertId });
    } catch (error) {
        console.error('Create course error:', error);
        res.status(500).json({ message: error.message });
    }
});

// UPDATE COURSE
router.put('/courses/:id', verifyAdmin, async (req, res) => {
    try {
        const db = req.db;
        const { title, description, category_id, instructor_id, price, level, thumbnail, status } = req.body;
        await db.execute(
            `UPDATE courses SET title=?, description=?, category_id=?, instructor_id=?, price=?, level=?, thumbnail=?, status=? 
             WHERE id=?`,
            [title, description, category_id, instructor_id, price, level, thumbnail, status, req.params.id]
        );
        res.json({ message: 'Course updated' });
    } catch (error) {
        console.error('Update course error:', error);
        res.status(500).json({ message: error.message });
    }
});

// DELETE COURSE
router.delete('/courses/:id', verifyAdmin, async (req, res) => {
    try {
        const db = req.db;
        await db.execute('DELETE FROM courses WHERE id = ?', [req.params.id]);
        res.json({ message: 'Course deleted' });
    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({ message: error.message });
    }
});

// CREATE CATEGORY
router.post('/categories', verifyAdmin, async (req, res) => {
    try {
        const db = req.db;
        const { name, description } = req.body;
        const [result] = await db.execute(
            'INSERT INTO categories (name, description) VALUES (?, ?)',
            [name, description || '']
        );
        res.json({ message: 'Category created', id: result.insertId });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ message: error.message });
    }
});

// UPDATE CATEGORY
router.put('/categories/:id', verifyAdmin, async (req, res) => {
    try {
        const db = req.db;
        const { name, description } = req.body;
        await db.execute(
            'UPDATE categories SET name = ?, description = ? WHERE id = ?',
            [name, description || '', req.params.id]
        );
        res.json({ message: 'Category updated' });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ message: error.message });
    }
});

// DELETE CATEGORY
router.delete('/categories/:id', verifyAdmin, async (req, res) => {
    try {
        const db = req.db;
        await db.execute('DELETE FROM categories WHERE id = ?', [req.params.id]);
        res.json({ message: 'Category deleted' });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET STATS
router.get('/stats', verifyAdmin, async (req, res) => {
    try {
        const db = req.db;
        const [totalUsers] = await db.execute('SELECT COUNT(*) as total FROM users');
        const [totalCourses] = await db.execute('SELECT COUNT(*) as total FROM courses');
        const [totalInstructors] = await db.execute('SELECT COUNT(*) as total FROM users WHERE role="instructor"');
        const [totalStudents] = await db.execute('SELECT COUNT(*) as total FROM users WHERE role="student"');
        res.json({
            totalUsers: totalUsers[0].total,
            totalCourses: totalCourses[0].total,
            totalInstructors: totalInstructors[0].total,
            totalStudents: totalStudents[0].total,
            totalRevenue: 0,
            totalEnrollments: 0,
            totalCertificates: 0,
            averageRating: 0,
            pendingCourses: 0
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET USERS
router.get('/users', verifyAdmin, async (req, res) => {
    try {
        const db = req.db;
        const [users] = await db.execute('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
        res.json({ users });
    } catch (error) {
        console.error('Users error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Dashboard Statistics
router.get('/stats', verifyAdmin, async (req, res) => {
    try {
        const db = req.db;
        
        // User statistics
        const [totalUsers] = await db.execute('SELECT COUNT(*) as total FROM users');
        const [totalStudents] = await db.execute('SELECT COUNT(*) as total FROM users WHERE role = "student"');
        const [totalInstructors] = await db.execute('SELECT COUNT(*) as total FROM users WHERE role = "instructor"');
        
        // Course statistics
        const [totalCourses] = await db.execute('SELECT COUNT(*) as total FROM courses');
        const [pendingCourses] = await db.execute('SELECT COUNT(*) as total FROM courses WHERE status = "pending"');
        
        // Revenue statistics
        const [totalRevenue] = await db.execute('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = "completed"');
        
        // Enrollment statistics - FIX THIS
        const [totalEnrollments] = await db.execute('SELECT COUNT(*) as total FROM enrollments');
        
        // Certificate statistics
        const [totalCertificates] = await db.execute('SELECT COUNT(*) as total FROM certificates');
        
        // Average rating
        const [avgRating] = await db.execute('SELECT COALESCE(AVG(rating), 0) as average FROM reviews');
        
        console.log('Stats calculated:', {
            totalEnrollments: totalEnrollments[0].total,
            totalCourses: totalCourses[0].total,
            totalStudents: totalStudents[0].total
        });
        
        res.json({
            totalUsers: totalUsers[0].total || 0,
            totalStudents: totalStudents[0].total || 0,
            totalInstructors: totalInstructors[0].total || 0,
            totalCourses: totalCourses[0].total || 0,
            totalRevenue: totalRevenue[0].total || 0,
            totalEnrollments: totalEnrollments[0].total || 0,
            totalCertificates: totalCertificates[0].total || 0,
            averageRating: parseFloat(avgRating[0].average || 0).toFixed(1),
            pendingCourses: pendingCourses[0].total || 0,
            monthlyGrowth: 15
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;