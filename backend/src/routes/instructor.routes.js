const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const verifyInstructor = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        if (decoded.role !== 'instructor' && decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Instructor only.' });
        }
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Get instructor's courses - FIXED VERSION
router.get('/courses', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const instructor_id = req.user.id;
        
        console.log('Fetching courses for instructor:', instructor_id);
        
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
                cat.name as category_name
            FROM courses c
            LEFT JOIN categories cat ON c.category_id = cat.id
            WHERE c.instructor_id = ?
            ORDER BY c.created_at DESC
        `, [instructor_id]);
        
        console.log(`Found ${courses.length} courses for instructor ${instructor_id}`);
        console.log('Courses:', courses);
        
        res.json({ courses });
    } catch (error) {
        console.error('Error in /courses:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get instructor stats
router.get('/stats', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const instructor_id = req.user.id;
        
        const [courses] = await db.execute('SELECT COUNT(*) as total FROM courses WHERE instructor_id = ?', [instructor_id]);
        
        res.json({
            totalCourses: courses[0].total || 0,
            totalStudents: 0,
            totalRevenue: 0,
            averageRating: '0',
            monthlyEarnings: 0,
            totalLessons: 0,
            pendingQuizzes: 0,
            upcomingClasses: 0
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get course enrollments with student details
router.get('/course/:courseId/enrollments', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.courseId;
        const instructorId = req.user.id;
        
        // Verify instructor owns this course
        const [courseCheck] = await db.execute(
            'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
            [courseId, instructorId]
        );
        
        if (courseCheck.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const [enrollments] = await db.execute(`
            SELECT e.*, u.name as student_name, u.email as student_email
            FROM enrollments e
            JOIN users u ON e.student_id = u.id
            WHERE e.course_id = ?
            ORDER BY e.enrolled_at DESC
        `, [courseId]);
        
        res.json({ enrollments });
    } catch (error) {
        console.error('Error fetching enrollments:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get quiz results for a course
router.get('/course/:courseId/quiz-results', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.courseId;
        const instructorId = req.user.id;
        
        // Verify instructor owns this course
        const [courseCheck] = await db.execute(
            'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
            [courseId, instructorId]
        );
        
        if (courseCheck.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const [results] = await db.execute(`
            SELECT qr.*, u.name as student_name, q.title as quiz_title
            FROM quiz_results qr
            JOIN users u ON qr.student_id = u.id
            JOIN quizzes q ON qr.quiz_id = q.id
            WHERE q.course_id = ?
            ORDER BY qr.submitted_at DESC
        `, [courseId]);
        
        res.json({ results });
    } catch (error) {
        console.error('Error fetching quiz results:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get assignment submissions for a course
router.get('/course/:courseId/assignments', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const courseId = req.params.courseId;
        const instructorId = req.user.id;
        
        // Verify instructor owns this course
        const [courseCheck] = await db.execute(
            'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
            [courseId, instructorId]
        );
        
        if (courseCheck.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const [submissions] = await db.execute(`
            SELECT s.*, u.name as student_name, u.email as student_email, 
                   a.title as assignment_title, a.total_points
            FROM assignment_submissions s
            JOIN users u ON s.student_id = u.id
            JOIN assignments a ON s.assignment_id = a.id
            WHERE a.course_id = ?
            ORDER BY s.submitted_at DESC
        `, [courseId]);
        
        res.json({ submissions });
    } catch (error) {
        console.error('Error fetching assignment submissions:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get recent activities
router.get('/recent-activities', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const instructorId = req.user.id;
        
        const [activities] = await db.execute(`
            (SELECT 'enrollment' as type, 'New student enrolled' as message, created_at as time 
             FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             WHERE c.instructor_id = ?
             ORDER BY created_at DESC LIMIT 5)
            UNION ALL
            (SELECT 'quiz' as type, 'Quiz completed' as message, submitted_at as time 
             FROM quiz_results qr
             JOIN quizzes q ON qr.quiz_id = q.id
             JOIN courses c ON q.course_id = c.id
             WHERE c.instructor_id = ?
             ORDER BY submitted_at DESC LIMIT 5)
            ORDER BY time DESC LIMIT 10
        `, [instructorId, instructorId]);
        
        res.json({ activities });
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.json({ activities: [] });
    }
});

// Get top students
router.get('/top-students', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const instructorId = req.user.id;
        
        const [students] = await db.execute(`
            SELECT u.id, u.name, u.email, 
                   AVG(e.progress) as avg_progress,
                   COUNT(DISTINCT e.course_id) as courses_count
            FROM users u
            JOIN enrollments e ON u.id = e.student_id
            JOIN courses c ON e.course_id = c.id
            WHERE c.instructor_id = ?
            GROUP BY u.id
            ORDER BY avg_progress DESC
            LIMIT 5
        `, [instructorId]);
        
        res.json({ students });
    } catch (error) {
        console.error('Error fetching top students:', error);
        res.json({ students: [] });
    }
});

// Get earnings data
router.get('/earnings', verifyInstructor, async (req, res) => {
    try {
        const db = req.db;
        const instructorId = req.user.id;
        
        const [revenue] = await db.execute(`
            SELECT MONTH(created_at) as month, SUM(amount) as total
            FROM payments p
            JOIN courses c ON p.course_id = c.id
            WHERE c.instructor_id = ? AND p.status = 'completed'
            AND YEAR(created_at) = YEAR(CURDATE())
            GROUP BY MONTH(created_at)
        `, [instructorId]);
        
        const revenueData = new Array(12).fill(0);
        revenue.forEach(r => {
            revenueData[r.month - 1] = r.total || 0;
        });
        
        res.json({ 
            revenue: revenueData,
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        });
    } catch (error) {
        console.error('Error fetching earnings:', error);
        res.json({ revenue: [], labels: [] });
    }
});

module.exports = router;