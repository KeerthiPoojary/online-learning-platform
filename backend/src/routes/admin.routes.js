// src/routes/admin.routes.js
const express = require('express');
const router = express.Router();

// Simple test route - no authentication required
router.get('/test', (req, res) => {
  console.log('Test route hit!');
  res.json({ 
    success: true, 
    message: 'Admin routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Approve course endpoint
router.put('/approve-course/:id', async (req, res) => {
  const courseId = req.params.id;
  const db = req.db;
  
  console.log('=== APPROVE COURSE HIT ===');
  console.log('Course ID:', courseId);
  
  if (!db) {
    return res.status(500).json({ error: 'Database not available' });
  }
  
  try {
    // Check if course exists
    const [courses] = await db.execute(
      'SELECT id, title, status FROM courses WHERE id = ?',
      [courseId]
    );
    
    if (courses.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // Update course status - REMOVED updated_at
    await db.execute(
      'UPDATE courses SET status = ? WHERE id = ?',
      ['approved', courseId]
    );
    
    console.log('Course approved successfully!');
    
    res.json({ 
      success: true, 
      message: 'Course approved successfully',
      course: courses[0]
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject course endpoint
router.put('/reject-course/:id', async (req, res) => {
  const courseId = req.params.id;
  const db = req.db;
  
  try {
    const [courses] = await db.execute(
      'SELECT id, title, status FROM courses WHERE id = ?',
      [courseId]
    );
    
    if (courses.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // Update course status - REMOVED updated_at
    await db.execute(
      'UPDATE courses SET status = ? WHERE id = ?',
      ['rejected', courseId]
    );
    
    res.json({ 
      success: true, 
      message: 'Course rejected successfully',
      course: courses[0]
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get courses
router.get('/courses', async (req, res) => {
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
    
    res.json({ courses });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get stats
router.get('/stats', async (req, res) => {
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
      totalUsers: userStats[0].totalUsers || 0,
      totalStudents: userStats[0].totalStudents || 0,
      totalInstructors: userStats[0].totalInstructors || 0,
      totalCourses: courseStats[0].totalCourses || 0,
      pendingCourses: courseStats[0].pendingCourses || 0,
      totalEnrollments: enrollmentStats[0].totalEnrollments || 0,
      totalRevenue: enrollmentStats[0].totalRevenue || 0,
      averageRating: ratingStats[0].averageRating || 0
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get users
router.get('/users', async (req, res) => {
  const db = req.db;
  
  try {
    const [users] = await db.execute(`
      SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC
    `);
    
    res.json({ users });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get instructors
router.get('/instructors', async (req, res) => {
  const db = req.db;
  
  try {
    const [instructors] = await db.execute(`
      SELECT id, name, email FROM users WHERE role = 'instructor'
    `);
    
    res.json({ instructors });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get categories
router.get('/categories', async (req, res) => {
  const db = req.db;
  
  try {
    const [categories] = await db.execute(`
      SELECT * FROM categories ORDER BY name ASC
    `);
    
    res.json({ categories });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create category
router.post('/categories', async (req, res) => {
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
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update category
router.put('/categories/:id', async (req, res) => {
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
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete category
router.delete('/categories/:id', async (req, res) => {
  const categoryId = req.params.id;
  const db = req.db;
  
  try {
    await db.execute('DELETE FROM categories WHERE id = ?', [categoryId]);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create course
router.post('/courses', async (req, res) => {
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
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update course
router.put('/courses/:id', async (req, res) => {
  const courseId = req.params.id;
  const { title, description, category_id, instructor_id, price, level, thumbnail, status } = req.body;
  const db = req.db;
  
  try {
    await db.execute(
      `UPDATE courses 
       SET title = ?, description = ?, category_id = ?, instructor_id = ?, 
           price = ?, level = ?, thumbnail = ?, status = ?
       WHERE id = ?`,
      [title, description, category_id || null, instructor_id, price || 0, level, thumbnail || '', status, courseId]
    );
    
    res.json({ message: 'Course updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete course
router.delete('/courses/:id', async (req, res) => {
  const courseId = req.params.id;
  const db = req.db;
  
  try {
    await db.execute('DELETE FROM courses WHERE id = ?', [courseId]);
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;