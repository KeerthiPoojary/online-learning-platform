const db = require('../config/database');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

const getStudentDashboard = async (req, res) => {
    try {
        const userId = req.userId;
        
        // Get enrolled courses
        const enrolledCourses = await Enrollment.getStudentCourses(userId);
        
        // Get quiz statistics
        const [quizStats] = await db.execute(
            `SELECT 
                COUNT(DISTINCT qa.quiz_id) as quizzes_taken,
                AVG(qa.score) as avg_score,
                COUNT(CASE WHEN qa.passed = 1 THEN 1 END) as quizzes_passed
             FROM quiz_attempts qa
             WHERE qa.user_id = ?`,
            [userId]
        );
        
        // Get recent activity
        const [recentActivity] = await db.execute(
            `SELECT 
                'course_completion' as type,
                c.title as title,
                e.completed_at as date
             FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             WHERE e.user_id = ? AND e.completed_at IS NOT NULL
             UNION ALL
             SELECT 
                'quiz_completion' as type,
                q.title as title,
                qa.completed_at as date
             FROM quiz_attempts qa
             JOIN quizzes q ON qa.quiz_id = q.id
             WHERE qa.user_id = ? AND qa.completed_at IS NOT NULL
             ORDER BY date DESC
             LIMIT 10`,
            [userId, userId]
        );
        
        res.json({
            enrolledCourses,
            quizStats: {
                quizzesTaken: quizStats.quizzes_taken || 0,
                averageScore: Math.round(quizStats.avg_score || 0),
                quizzesPassed: quizStats.quizzes_passed || 0
            },
            recentActivity
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getInstructorDashboard = async (req, res) => {
    try {
        const instructorId = req.userId;
        
        // Get instructor's courses
        const courses = await Course.getCoursesByInstructor(instructorId);
        
        // Get overall statistics
        let totalStudents = 0;
        let totalRevenue = 0;
        
        for (const course of courses) {
            const stats = await Enrollment.getEnrollmentStats(course.id);
            totalStudents += stats.total_students;
            totalRevenue += stats.total_students * course.price;
        }
        
        // Get recent enrollments
        const [recentEnrollments] = await db.execute(
            `SELECT e.*, u.full_name as student_name, c.title as course_title
             FROM enrollments e
             JOIN users u ON e.user_id = u.id
             JOIN courses c ON e.course_id = c.id
             WHERE c.instructor_id = ?
             ORDER BY e.enrolled_at DESC
             LIMIT 10`,
            [instructorId]
        );
        
        res.json({
            courses,
            stats: {
                totalCourses: courses.length,
                totalStudents,
                totalRevenue,
                averageCourseProgress: 0 // Calculate if needed
            },
            recentEnrollments
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getAdminDashboard = async (req, res) => {
    try {
        // Get platform-wide statistics
        const [stats] = await db.execute(
            `SELECT 
                (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
                (SELECT COUNT(*) FROM users WHERE role = 'instructor') as total_instructors,
                (SELECT COUNT(*) FROM courses) as total_courses,
                (SELECT COUNT(*) FROM enrollments) as total_enrollments,
                (SELECT COUNT(*) FROM quiz_attempts) as total_quiz_attempts,
                (SELECT COALESCE(SUM(price * (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id)), 0) FROM courses c) as total_revenue
             FROM DUAL`
        );
        
        // Get monthly enrollment data for chart
        const [monthlyEnrollments] = await db.execute(
            `SELECT 
                DATE_FORMAT(enrolled_at, '%Y-%m') as month,
                COUNT(*) as count
             FROM enrollments
             WHERE enrolled_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
             GROUP BY DATE_FORMAT(enrolled_at, '%Y-%m')
             ORDER BY month ASC`
        );
        
        // Get top courses
        const [topCourses] = await db.execute(
            `SELECT 
                c.id, c.title, COUNT(e.user_id) as student_count,
                AVG(e.progress) as avg_progress
             FROM courses c
             LEFT JOIN enrollments e ON c.id = e.course_id
             GROUP BY c.id
             ORDER BY student_count DESC
             LIMIT 5`
        );
        
        // Get recent users
        const [recentUsers] = await db.execute(
            `SELECT id, full_name, email, role, created_at
             FROM users
             ORDER BY created_at DESC
             LIMIT 10`
        );
        
        res.json({
            stats: stats[0],
            monthlyEnrollments,
            topCourses,
            recentUsers
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getStudentDashboard,
    getInstructorDashboard,
    getAdminDashboard
};