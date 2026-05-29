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

// Create live class
router.post('/create', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { course_id, title, meeting_link, scheduled_time, duration } = req.body;
        
        const [result] = await db.execute(
            'INSERT INTO live_classes (course_id, instructor_id, title, meeting_link, scheduled_time, duration) VALUES (?, ?, ?, ?, ?, ?)',
            [course_id, req.user.id, title, meeting_link, scheduled_time, duration || 60]
        );
        res.status(201).json({ message: 'Live class scheduled', id: result.insertId });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get instructor live classes
router.get('/instructor', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const [liveClasses] = await db.execute(`
            SELECT l.*, c.title as course_title
            FROM live_classes l
            JOIN courses c ON l.course_id = c.id
            WHERE l.instructor_id = ?
            ORDER BY l.scheduled_time ASC
        `, [req.user.id]);
        res.json({ liveClasses });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete live class
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        await db.execute('DELETE FROM live_classes WHERE id = ?', [req.params.id]);
        res.json({ message: 'Live class deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;