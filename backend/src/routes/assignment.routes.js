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

// Get assignments for a course (for students)
router.get('/course/:courseId', async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.courseId;
        
        const token = req.headers.authorization?.split(' ')[1];
        let studentId = null;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                studentId = decoded.id;
            } catch(e) {}
        }
        
        const [assignments] = await db.execute(`
            SELECT a.*,
                   (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id AND student_id = ?) as has_submitted,
                   (SELECT grade FROM assignment_submissions WHERE assignment_id = a.id AND student_id = ?) as grade,
                   (SELECT submitted_at FROM assignment_submissions WHERE assignment_id = a.id AND student_id = ?) as submitted_at
            FROM assignments a
            WHERE a.course_id = ?
            ORDER BY a.due_date ASC
        `, [studentId, studentId, studentId, courseId]);
        
        res.json({ assignments });
    } catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Submit assignment
router.post('/submit', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { assignment_id, submission_text, submission_file } = req.body;
        const studentId = req.user.id;
        
        // Check if already submitted
        const [existing] = await db.execute(
            'SELECT id FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?',
            [assignment_id, studentId]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ message: 'You have already submitted this assignment' });
        }
        
        await db.execute(
            'INSERT INTO assignment_submissions (assignment_id, student_id, submission_text, submission_file, submitted_at) VALUES (?, ?, ?, ?, NOW())',
            [assignment_id, studentId, submission_text || '', submission_file || '']
        );
        
        res.status(201).json({ message: 'Assignment submitted successfully' });
    } catch (error) {
        console.error('Error submitting assignment:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get assignment submission status for student
router.get('/status/:assignmentId', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const assignmentId = req.params.assignmentId;
        const studentId = req.user.id;
        
        const [submission] = await db.execute(
            'SELECT * FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?',
            [assignmentId, studentId]
        );
        
        res.json({ submitted: submission.length > 0, submission: submission[0] || null });
    } catch (error) {
        console.error('Error checking submission status:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all assignments for instructor
router.get('/instructor', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const instructorId = req.user.id;
        
        const [assignments] = await db.execute(`
            SELECT a.*, c.title as course_title,
                   (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id) as submissions_count
            FROM assignments a
            JOIN courses c ON a.course_id = c.id
            WHERE c.instructor_id = ?
            ORDER BY a.created_at DESC
        `, [instructorId]);
        
        res.json({ assignments });
    } catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create assignment (for instructors)
router.post('/create', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { course_id, title, description, due_date, total_points } = req.body;
        
        const [result] = await db.execute(
            'INSERT INTO assignments (course_id, title, description, due_date, total_points) VALUES (?, ?, ?, ?, ?)',
            [course_id, title, description || '', due_date || null, total_points || 100]
        );
        
        res.status(201).json({ message: 'Assignment created', id: result.insertId });
    } catch (error) {
        console.error('Error creating assignment:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update assignment
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { title, description, due_date, total_points } = req.body;
        
        await db.execute(
            'UPDATE assignments SET title=?, description=?, due_date=?, total_points=? WHERE id=?',
            [title, description, due_date, total_points, req.params.id]
        );
        
        res.json({ message: 'Assignment updated' });
    } catch (error) {
        console.error('Error updating assignment:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete assignment
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        await db.execute('DELETE FROM assignments WHERE id = ?', [req.params.id]);
        res.json({ message: 'Assignment deleted' });
    } catch (error) {
        console.error('Error deleting assignment:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Grade assignment (for instructors)
router.post('/grade/:submissionId', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { grade, feedback } = req.body;
        
        await db.execute(
            'UPDATE assignment_submissions SET grade = ?, feedback = ?, graded_at = NOW() WHERE id = ?',
            [grade, feedback || '', req.params.submissionId]
        );
        
        res.json({ message: 'Assignment graded successfully' });
    } catch (error) {
        console.error('Error grading assignment:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all submissions for an assignment (for instructors)
router.get('/submissions/:assignmentId', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const assignmentId = req.params.assignmentId;
        const instructorId = req.user.id;
        
        // Verify instructor owns this assignment's course
        const [assignmentCheck] = await db.execute(`
            SELECT c.instructor_id FROM assignments a
            JOIN courses c ON a.course_id = c.id
            WHERE a.id = ?
        `, [assignmentId]);
        
        if (assignmentCheck.length === 0 || assignmentCheck[0].instructor_id !== instructorId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const [submissions] = await db.execute(`
            SELECT 
                s.*,
                u.name as student_name,
                u.email as student_email,
                a.title as assignment_title
            FROM assignment_submissions s
            JOIN users u ON s.student_id = u.id
            JOIN assignments a ON s.assignment_id = a.id
            WHERE s.assignment_id = ?
            ORDER BY s.submitted_at DESC
        `, [assignmentId]);
        
        res.json({ submissions });
    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Grade a submission
router.put('/grade/:submissionId', verifyToken, async (req, res) => {
    try {
        const db = req.db;
        const { grade, feedback } = req.body;
        const submissionId = req.params.submissionId;
        const instructorId = req.user.id;
        
        // Verify instructor owns this submission's course
        const [submissionCheck] = await db.execute(`
            SELECT c.instructor_id FROM assignment_submissions s
            JOIN assignments a ON s.assignment_id = a.id
            JOIN courses c ON a.course_id = c.id
            WHERE s.id = ?
        `, [submissionId]);
        
        if (submissionCheck.length === 0 || submissionCheck[0].instructor_id !== instructorId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        await db.execute(
            'UPDATE assignment_submissions SET grade = ?, feedback = ?, graded_at = NOW() WHERE id = ?',
            [grade, feedback || '', submissionId]
        );
        
        res.json({ message: 'Assignment graded successfully' });
    } catch (error) {
        console.error('Error grading assignment:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;