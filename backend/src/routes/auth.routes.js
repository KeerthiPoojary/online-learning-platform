const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim(),
  body('role').isIn(['student', 'instructor'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { name, email, password, role } = req.body;
    const db = req.db;
    
    // Check if user exists
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role]
    );
    
    // Generate token
    const token = jwt.sign(
      { id: result.insertId, email, role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: result.insertId, name, email, role }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login - SIMPLIFIED VERSION
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = req.db;
    
    console.log('Login attempt:', email);
    
    // Get user
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      console.log('User not found:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = users[0];
    console.log('User found:', user.email);
    
    // Compare password
    const isValid = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isValid);
    
    if (!isValid) {
      console.log('Invalid password for:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('Login successful for:', email);
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_pic: user.profile_pic
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Get current user (me) - Add this after your login route
router.get('/me', async (req, res) => {
    try {
        // Get token from header
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }
        
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        const db = req.db;
        const [users] = await db.execute(
            'SELECT id, name, email, role, profile_pic, bio, created_at FROM users WHERE id = ?',
            [decoded.id]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json({ user: users[0] });
    } catch (error) {
        console.error('Me endpoint error:', error);
        res.status(401).json({ message: 'Invalid token' });
    }
});

// Get current user info
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }
        
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        const db = req.db;
        const [users] = await db.execute('SELECT id, name, email, role FROM users WHERE id = ?', [decoded.id]);
        
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json({ user: users[0] });
    } catch (error) {
        console.error('Error in /me:', error);
        res.status(401).json({ message: 'Invalid token' });
    }
});

module.exports = router;