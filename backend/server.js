const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const socketIO = require('socket.io');
const http = require('http');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'learning_platform',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Make db available to routes
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// Import Routes
const authRoutes = require('./src/routes/auth.routes');
const courseRoutes = require('./src/routes/course.routes');
const userRoutes = require('./src/routes/user.routes');
const adminRoutes = require('./src/routes/admin.routes');
const instructorRoutes = require('./src/routes/instructor.routes');
const quizRoutes = require('./src/routes/quiz.routes');
const assignmentRoutes = require('./src/routes/assignment.routes');
const liveClassRoutes = require('./src/routes/liveclass.routes');


// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/instructor', instructorRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/live-classes', liveClassRoutes);
// Add these routes after your existing routes
app.use('/api/courses', courseRoutes);



// Categories endpoint - direct route
app.get('/api/categories', async (req, res) => {
  try {
    const db = req.db;
    const [categories] = await db.execute('SELECT id, name, description FROM categories ORDER BY name ASC');
    res.json({ categories });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Online Learning Platform API is running' });
});

// Socket.io for real-time chat
io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
  });
  socket.on('send_message', async (data) => {
    const { sender_id, receiver_id, message } = data;
    try {
      const [result] = await pool.execute(
        'INSERT INTO chat_messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
        [sender_id, receiver_id, message]
      );
      io.to(`user_${receiver_id}`).emit('receive_message', {
        id: result.insertId,
        sender_id,
        message,
        created_at: new Date()
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});



// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
});


