const db = require('../config/database');

class Enrollment {
    static async enroll(userId, courseId) {
        const [result] = await db.execute(
            'INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)',
            [userId, courseId]
        );
        return result.insertId;
    }
    
    static async isEnrolled(userId, courseId) {
        const [rows] = await db.execute(
            'SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?',
            [userId, courseId]
        );
        return rows.length > 0;
    }
    
    static async getStudentCourses(userId) {
        const [rows] = await db.execute(
            `SELECT c.*, e.progress, e.enrolled_at, e.last_accessed,
                    u.full_name as instructor_name
             FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             LEFT JOIN users u ON c.instructor_id = u.id
             WHERE e.user_id = ?
             ORDER BY e.last_accessed DESC`,
            [userId]
        );
        return rows;
    }
    
    static async updateProgress(userId, courseId, progress) {
        const [result] = await db.execute(
            'UPDATE enrollments SET progress = ?, last_accessed = NOW() WHERE user_id = ? AND course_id = ?',
            [progress, userId, courseId]
        );
        return result.affectedRows > 0;
    }
    
    static async getEnrollmentStats(courseId) {
        const [rows] = await db.execute(
            `SELECT 
                COUNT(*) as total_students,
                AVG(progress) as average_progress,
                SUM(CASE WHEN progress = 100 THEN 1 ELSE 0 END) as completed_students
             FROM enrollments
             WHERE course_id = ?`,
            [courseId]
        );
        return rows[0];
    }
}

module.exports = Enrollment;