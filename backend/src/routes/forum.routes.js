const express = require('express');
const router = express.Router();
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

// Get all discussions for a course
router.get('/discussions/course/:courseId', async (req, res) => {
    try {
        const db = req.db;
        const { courseId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Get discussions with user info and reply count
        const [discussions] = await db.execute(`
            SELECT d.*, u.name as user_name, u.profile_pic as user_avatar,
                   (SELECT COUNT(*) FROM forum_replies WHERE discussion_id = d.id) as reply_count
            FROM forum_discussions d
            JOIN users u ON d.user_id = u.id
            WHERE d.course_id = ?
            ORDER BY d.created_at DESC
            LIMIT ? OFFSET ?
        `, [courseId, parseInt(limit), offset]);
        
        // Get total count
        const [countResult] = await db.execute(
            'SELECT COUNT(*) as total FROM forum_discussions WHERE course_id = ?',
            [courseId]
        );
        
        res.json({
            discussions,
            total: countResult[0].total,
            page: parseInt(page),
            totalPages: Math.ceil(countResult[0].total / limit)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single discussion with all replies
router.get('/discussions/:id', async (req, res) => {
    try {
        const db = req.db;
        const { id } = req.params;
        
        // Get discussion details
        const [discussions] = await db.execute(`
            SELECT d.*, u.name as user_name, u.email as user_email, u.profile_pic as user_avatar,
                   c.title as course_title
            FROM forum_discussions d
            JOIN users u ON d.user_id = u.id
            JOIN courses c ON d.course_id = c.id
            WHERE d.id = ?
        `, [id]);
        
        if (discussions.length === 0) {
            return res.status(404).json({ message: 'Discussion not found' });
        }
        
        // Get all replies
        const [replies] = await db.execute(`
            SELECT r.*, u.name as user_name, u.email as user_email, u.profile_pic as user_avatar,
                   u.role as user_role
            FROM forum_replies r
            JOIN users u ON r.user_id = u.id
            WHERE r.discussion_id = ?
            ORDER BY r.created_at ASC
        `, [id]);
        
        res.json({
            discussion: discussions[0],
            replies
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create new discussion
router.post('/discussions', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { course_id, title, content } = req.body;
        const user_id = req.user.id;
        
        // Validate input
        if (!title || title.trim().length === 0) {
            return res.status(400).json({ message: 'Title is required' });
        }
        
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ message: 'Content is required' });
        }
        
        // Check if user is enrolled in the course
        const [enrollment] = await db.execute(
            'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?',
            [user_id, course_id]
        );
        
        if (enrollment.length === 0 && req.user.role !== 'instructor' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'You must be enrolled in this course to post' });
        }
        
        // Create discussion
        const [result] = await db.execute(
            'INSERT INTO forum_discussions (course_id, user_id, title, content) VALUES (?, ?, ?, ?)',
            [course_id, user_id, title.trim(), content.trim()]
        );
        
        // Get the created discussion with user info
        const [newDiscussion] = await db.execute(`
            SELECT d.*, u.name as user_name, u.profile_pic as user_avatar
            FROM forum_discussions d
            JOIN users u ON d.user_id = u.id
            WHERE d.id = ?
        `, [result.insertId]);
        
        res.status(201).json({
            message: 'Discussion created successfully',
            discussion: newDiscussion[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add reply to discussion
router.post('/discussions/:id/replies', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { id } = req.params;
        const { content } = req.body;
        const user_id = req.user.id;
        
        // Validate input
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ message: 'Reply content is required' });
        }
        
        // Check if discussion exists
        const [discussions] = await db.execute(
            'SELECT course_id FROM forum_discussions WHERE id = ?',
            [id]
        );
        
        if (discussions.length === 0) {
            return res.status(404).json({ message: 'Discussion not found' });
        }
        
        const course_id = discussions[0].course_id;
        
        // Check if user is enrolled in the course
        const [enrollment] = await db.execute(
            'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?',
            [user_id, course_id]
        );
        
        if (enrollment.length === 0 && req.user.role !== 'instructor' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'You must be enrolled in this course to reply' });
        }
        
        // Create reply
        const [result] = await db.execute(
            'INSERT INTO forum_replies (discussion_id, user_id, content) VALUES (?, ?, ?)',
            [id, user_id, content.trim()]
        );
        
        // Get the created reply with user info
        const [newReply] = await db.execute(`
            SELECT r.*, u.name as user_name, u.profile_pic as user_avatar, u.role as user_role
            FROM forum_replies r
            JOIN users u ON r.user_id = u.id
            WHERE r.id = ?
        `, [result.insertId]);
        
        // Update discussion updated_at timestamp
        await db.execute(
            'UPDATE forum_discussions SET updated_at = NOW() WHERE id = ?',
            [id]
        );
        
        res.status(201).json({
            message: 'Reply added successfully',
            reply: newReply[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update discussion
router.put('/discussions/:id', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { id } = req.params;
        const { title, content } = req.body;
        const user_id = req.user.id;
        
        // Check if discussion exists and user owns it
        const [discussions] = await db.execute(
            'SELECT user_id FROM forum_discussions WHERE id = ?',
            [id]
        );
        
        if (discussions.length === 0) {
            return res.status(404).json({ message: 'Discussion not found' });
        }
        
        if (discussions[0].user_id !== user_id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'You can only edit your own discussions' });
        }
        
        // Update discussion
        await db.execute(
            'UPDATE forum_discussions SET title = ?, content = ?, updated_at = NOW() WHERE id = ?',
            [title, content, id]
        );
        
        res.json({ message: 'Discussion updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete discussion
router.delete('/discussions/:id', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { id } = req.params;
        const user_id = req.user.id;
        
        // Check if discussion exists and user owns it
        const [discussions] = await db.execute(
            'SELECT user_id FROM forum_discussions WHERE id = ?',
            [id]
        );
        
        if (discussions.length === 0) {
            return res.status(404).json({ message: 'Discussion not found' });
        }
        
        if (discussions[0].user_id !== user_id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'You can only delete your own discussions' });
        }
        
        // Start transaction
        await db.execute('START TRANSACTION');
        
        // Delete all replies first
        await db.execute('DELETE FROM forum_replies WHERE discussion_id = ?', [id]);
        
        // Delete discussion
        await db.execute('DELETE FROM forum_discussions WHERE id = ?', [id]);
        
        await db.execute('COMMIT');
        
        res.json({ message: 'Discussion deleted successfully' });
    } catch (error) {
        await req.db.execute('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update reply
router.put('/replies/:id', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { id } = req.params;
        const { content } = req.body;
        const user_id = req.user.id;
        
        // Check if reply exists and user owns it
        const [replies] = await db.execute(
            'SELECT user_id FROM forum_replies WHERE id = ?',
            [id]
        );
        
        if (replies.length === 0) {
            return res.status(404).json({ message: 'Reply not found' });
        }
        
        if (replies[0].user_id !== user_id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'You can only edit your own replies' });
        }
        
        // Update reply
        await db.execute(
            'UPDATE forum_replies SET content = ?, updated_at = NOW() WHERE id = ?',
            [content, id]
        );
        
        res.json({ message: 'Reply updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete reply
router.delete('/replies/:id', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { id } = req.params;
        const user_id = req.user.id;
        
        // Check if reply exists and user owns it
        const [replies] = await db.execute(
            'SELECT user_id, discussion_id FROM forum_replies WHERE id = ?',
            [id]
        );
        
        if (replies.length === 0) {
            return res.status(404).json({ message: 'Reply not found' });
        }
        
        if (replies[0].user_id !== user_id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'You can only delete your own replies' });
        }
        
        // Delete reply
        await db.execute('DELETE FROM forum_replies WHERE id = ?', [id]);
        
        // Update discussion updated_at
        await db.execute(
            'UPDATE forum_discussions SET updated_at = NOW() WHERE id = ?',
            [replies[0].discussion_id]
        );
        
        res.json({ message: 'Reply deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get my discussions (for logged-in user)
router.get('/my-discussions', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const user_id = req.user.id;
        
        const [discussions] = await db.execute(`
            SELECT d.*, c.title as course_title, u.name as user_name,
                   (SELECT COUNT(*) FROM forum_replies WHERE discussion_id = d.id) as reply_count
            FROM forum_discussions d
            JOIN courses c ON d.course_id = c.id
            JOIN users u ON d.user_id = u.id
            WHERE d.user_id = ?
            ORDER BY d.created_at DESC
        `, [user_id]);
        
        res.json({ discussions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get my replies (for logged-in user)
router.get('/my-replies', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const user_id = req.user.id;
        
        const [replies] = await db.execute(`
            SELECT r.*, d.title as discussion_title, d.course_id,
                   c.title as course_title
            FROM forum_replies r
            JOIN forum_discussions d ON r.discussion_id = d.id
            JOIN courses c ON d.course_id = c.id
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
            LIMIT 50
        `, [user_id]);
        
        res.json({ replies });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Search discussions
router.get('/search', async (req, res) => {
    try {
        const db = req.db;
        const { q, course_id } = req.query;
        
        if (!q || q.trim().length === 0) {
            return res.status(400).json({ message: 'Search query is required' });
        }
        
        let query = `
            SELECT d.*, u.name as user_name, c.title as course_title,
                   (SELECT COUNT(*) FROM forum_replies WHERE discussion_id = d.id) as reply_count
            FROM forum_discussions d
            JOIN users u ON d.user_id = u.id
            JOIN courses c ON d.course_id = c.id
            WHERE (d.title LIKE ? OR d.content LIKE ?)
        `;
        
        const params = [`%${q}%`, `%${q}%`];
        
        if (course_id) {
            query += ' AND d.course_id = ?';
            params.push(course_id);
        }
        
        query += ' ORDER BY d.created_at DESC LIMIT 50';
        
        const [discussions] = await db.execute(query, params);
        
        res.json({ discussions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get forum statistics for a course
router.get('/stats/course/:courseId', async (req, res) => {
    try {
        const db = req.db;
        const { courseId } = req.params;
        
        // Total discussions
        const [totalDiscussions] = await db.execute(
            'SELECT COUNT(*) as total FROM forum_discussions WHERE course_id = ?',
            [courseId]
        );
        
        // Total replies
        const [totalReplies] = await db.execute(`
            SELECT COUNT(*) as total 
            FROM forum_replies r
            JOIN forum_discussions d ON r.discussion_id = d.id
            WHERE d.course_id = ?
        `, [courseId]);
        
        // Most active discussions
        const [activeDiscussions] = await db.execute(`
            SELECT d.id, d.title, COUNT(r.id) as reply_count
            FROM forum_discussions d
            LEFT JOIN forum_replies r ON d.id = r.discussion_id
            WHERE d.course_id = ?
            GROUP BY d.id
            ORDER BY reply_count DESC
            LIMIT 5
        `, [courseId]);
        
        // Top contributors
        const [topContributors] = await db.execute(`
            SELECT u.id, u.name, u.profile_pic,
                   COUNT(DISTINCT d.id) as discussions,
                   COUNT(r.id) as replies
            FROM users u
            LEFT JOIN forum_discussions d ON u.id = d.user_id AND d.course_id = ?
            LEFT JOIN forum_replies r ON u.id = r.user_id 
            LEFT JOIN forum_discussions d2 ON r.discussion_id = d2.id AND d2.course_id = ?
            WHERE (d.id IS NOT NULL OR r.id IS NOT NULL)
            GROUP BY u.id
            ORDER BY (COUNT(DISTINCT d.id) + COUNT(r.id)) DESC
            LIMIT 5
        `, [courseId, courseId]);
        
        res.json({
            totalDiscussions: totalDiscussions[0].total,
            totalReplies: totalReplies[0].total,
            activeDiscussions,
            topContributors
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Pin/Unpin discussion (Admin/Instructor only)
router.put('/discussions/:id/pin', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { id } = req.params;
        const { pinned } = req.body;
        
        // Check if user is instructor or admin
        if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only instructors and admins can pin discussions' });
        }
        
        // Check if discussion exists
        const [discussions] = await db.execute(
            'SELECT course_id FROM forum_discussions WHERE id = ?',
            [id]
        );
        
        if (discussions.length === 0) {
            return res.status(404).json({ message: 'Discussion not found' });
        }
        
        // If instructor, check if they own the course
        if (req.user.role === 'instructor') {
            const [courses] = await db.execute(
                'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
                [discussions[0].course_id, req.user.id]
            );
            
            if (courses.length === 0) {
                return res.status(403).json({ message: 'You can only pin discussions in your own courses' });
            }
        }
        
        await db.execute(
            'UPDATE forum_discussions SET is_pinned = ?, updated_at = NOW() WHERE id = ?',
            [pinned, id]
        );
        
        res.json({ message: pinned ? 'Discussion pinned' : 'Discussion unpinned' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get pinned discussions for a course
router.get('/discussions/course/:courseId/pinned', async (req, res) => {
    try {
        const db = req.db;
        const { courseId } = req.params;
        
        const [discussions] = await db.execute(`
            SELECT d.*, u.name as user_name, u.profile_pic as user_avatar,
                   (SELECT COUNT(*) FROM forum_replies WHERE discussion_id = d.id) as reply_count
            FROM forum_discussions d
            JOIN users u ON d.user_id = u.id
            WHERE d.course_id = ? AND d.is_pinned = true
            ORDER BY d.created_at DESC
        `, [courseId]);
        
        res.json({ discussions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;