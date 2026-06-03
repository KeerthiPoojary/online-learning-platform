// src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  next();
};

// Approve course endpoint
router.put('/approve-course/:id', authenticateToken, requireAdmin, async (req, res) => {
  const courseId = req.params.id;
  const db = req.db; // Get database connection from request
  
  console.log(`Attempting to approve course ID: ${courseId}`);
  console.log(`Admin user:`, req.user);
  
  try {
    // Check if course exists
    const [courses] = await db.execute(
      'SELECT id, title, status, instructor_id FROM courses WHERE id = ?',
      [courseId]
    );
    
    if (courses.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Course not found' 
      });
    }
    
    const course = courses[0];
    
    // Check if course is already approved
    if (course.status === 'approved') {
      return res.status(400).json({ 
        success: false,
        message: 'Course is already approved' 
      });
    }
    
    // Update course status to approved
    await db.execute(
      'UPDATE courses SET status = ?, updated_at = NOW() WHERE id = ?',
      ['approved', courseId]
    );
    
    console.log(`Course ${courseId} approved successfully`);
    
    res.json({ 
      success: true,
      message: 'Course approved successfully',
      course: { 
        id: courseId, 
        status: 'approved',
        title: course.title 
      }
    });
    
  } catch (error) {
    console.error('Error in approve-course:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Reject course endpoint
router.put('/reject-course/:id', authenticateToken, requireAdmin, async (req, res) => {
  const courseId = req.params.id;
  const { reason } = req.body;
  const db = req.db;
  
  console.log(`Attempting to reject course ID: ${courseId}`);
  
  try {
    // Check if course exists
    const [courses] = await db.execute(
      'SELECT id, title, status FROM courses WHERE id = ?',
      [courseId]
    );
    
    if (courses.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Course not found' 
      });
    }
    
    const course = courses[0];
    
    // Update course status to rejected
    await db.execute(
      'UPDATE courses SET status = ?, updated_at = NOW() WHERE id = ?',
      ['rejected', courseId]
    );
    
    // Store rejection reason if provided (optional - create table if needed)
    if (reason) {
      try {
        await db.execute(
          'INSERT INTO course_reviews (course_id, status, reason, created_at) VALUES (?, ?, ?, NOW())',
          [courseId, 'rejected', reason]
        );
      } catch (err) {
        console.log('Note: course_reviews table might not exist yet');
      }
    }
    
    console.log(`Course ${courseId} rejected successfully`);
    
    res.json({ 
      success: true,
      message: 'Course rejected successfully',
      course: { 
        id: courseId, 
        status: 'rejected',
        title: course.title 
      }
    });
    
  } catch (error) {
    console.error('Error in reject-course:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Get courses with filters
router.get('/courses', authenticateToken, requireAdmin, async (req, res) => {
  const db = req.db;
  
  try {
    const [courses] = await db.execute(`
      SELECT 
        c.*, 
        u.name as instructor_name, 
        cat.name as category_name,
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as student_count
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      ORDER BY c.created_at DESC
    `);
    
    res.json({ 
      success: true,
      courses: courses 
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch courses' 
    });
  }
});

// Get dashboard stats
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  const db = req.db;
  
  try {
    const [userStats] = await db.execute(`
      SELECT 
        COUNT(*) as totalUsers,
        SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as totalStudents,
        SUM(CASE WHEN role = 'instructor' THEN 1 ELSE 0 END) as totalInstructors
      FROM users
    `);
    
    const [courseStats] = await db.execute(`
      SELECT 
        COUNT(*) as totalCourses,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingCourses
      FROM courses
    `);
    
    const [enrollmentStats] = await db.execute(`
      SELECT 
        COUNT(*) as totalEnrollments,
        COALESCE(SUM(c.price), 0) as totalRevenue
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
    `);
    
    const [ratingStats] = await db.execute(`
      SELECT COALESCE(AVG(rating), 0) as averageRating
      FROM reviews
    `);
    
    res.json({
      totalUsers: userStats[0].totalUsers,
      totalStudents: userStats[0].totalStudents,
      totalInstructors: userStats[0].totalInstructors,
      totalCourses: courseStats[0].totalCourses,
      pendingCourses: courseStats[0].pendingCourses,
      totalEnrollments: enrollmentStats[0].totalEnrollments,
      totalRevenue: enrollmentStats[0].totalRevenue,
      averageRating: parseFloat(ratingStats[0].averageRating).toFixed(1)
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

// Get all users
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  const db = req.db;
  
  try {
    const [users] = await db.execute(`
      SELECT id, name, email, role, profile_pic, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get all instructors
router.get('/instructors', authenticateToken, requireAdmin, async (req, res) => {
  const db = req.db;
  
  try {
    const [instructors] = await db.execute(`
      SELECT id, name, email FROM users WHERE role = 'instructor'
    `);
    
    res.json({ instructors });
  } catch (error) {
    console.error('Error fetching instructors:', error);
    res.status(500).json({ message: 'Failed to fetch instructors' });
  }
});

// Get all categories
router.get('/categories', authenticateToken, requireAdmin, async (req, res) => {
  const db = req.db;
  
  try {
    const [categories] = await db.execute(`
      SELECT * FROM categories ORDER BY name ASC
    `);
    
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// Create new course
router.post('/courses', authenticateToken, requireAdmin, async (req, res) => {
  const { title, description, category_id, instructor_id, price, level, thumbnail, status } = req.body;
  const db = req.db;
  
  try {
    const [result] = await db.execute(
      `INSERT INTO courses (title, description, category_id, instructor_id, price, level, thumbnail, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, category_id || null, instructor_id, price || 0, level, thumbnail || '', status || 'pending']
    );
    
    res.status(201).json({ 
      message: 'Course created successfully', 
      courseId: result.insertId 
    });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ message: 'Failed to create course' });
  }
});

// Update course
router.put('/courses/:id', authenticateToken, requireAdmin, async (req, res) => {
  const courseId = req.params.id;
  const { title, description, category_id, instructor_id, price, level, thumbnail, status } = req.body;
  const db = req.db;
  
  try {
    await db.execute(
      `UPDATE courses 
       SET title = ?, description = ?, category_id = ?, instructor_id = ?, 
           price = ?, level = ?, thumbnail = ?, status = ?, updated_at = NOW()
       WHERE id = ?`,
      [title, description, category_id || null, instructor_id, price || 0, level, thumbnail || '', status, courseId]
    );
    
    res.json({ message: 'Course updated successfully' });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ message: 'Failed to update course' });
  }
});

// Delete course
router.delete('/courses/:id', authenticateToken, requireAdmin, async (req, res) => {
  const courseId = req.params.id;
  const db = req.db;
  
  try {
    await db.execute('DELETE FROM courses WHERE id = ?', [courseId]);
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ message: 'Failed to delete course' });
  }
});

// Create category
router.post('/categories', authenticateToken, requireAdmin, async (req, res) => {
  const { name, description } = req.body;
  const db = req.db;
  
  try {
    const [result] = await db.execute(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name, description || '']
    );
    
    res.status(201).json({ 
      message: 'Category created successfully', 
      categoryId: result.insertId 
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Failed to create category' });
  }
});

// Update category
router.put('/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  const categoryId = req.params.id;
  const { name, description } = req.body;
  const db = req.db;
  
  try {
    await db.execute(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [name, description || '', categoryId]
    );
    
    res.json({ message: 'Category updated successfully' });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Failed to update category' });
  }
});

// Delete category
router.delete('/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  const categoryId = req.params.id;
  const db = req.db;
  
  try {
    await db.execute('DELETE FROM categories WHERE id = ?', [categoryId]);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Failed to delete category' });
  }
});

module.exports = router;