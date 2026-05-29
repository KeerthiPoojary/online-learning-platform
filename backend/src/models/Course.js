const db = require('../config/database');

class Course {
    static async create(courseData) {
        const { title, description, instructor_id, category, level, price, is_published = false } = courseData;
        
        const [result] = await db.execute(
            `INSERT INTO courses (title, description, instructor_id, category, level, price, is_published) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [title, description, instructor_id, category, level, price, is_published]
        );
        
        return result.insertId;
    }
    
    static async findAll(filters = {}) {
        let query = `
            SELECT c.*, u.full_name as instructor_name, 
                   COUNT(DISTINCT e.user_id) as enrolled_students
            FROM courses c
            LEFT JOIN users u ON c.instructor_id = u.id
            LEFT JOIN enrollments e ON c.id = e.course_id
        `;
        
        const conditions = [];
        const values = [];
        
        if (filters.category) {
            conditions.push('c.category = ?');
            values.push(filters.category);
        }
        
        if (filters.level) {
            conditions.push('c.level = ?');
            values.push(filters.level);
        }
        
        if (filters.is_published !== undefined) {
            conditions.push('c.is_published = ?');
            values.push(filters.is_published);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' GROUP BY c.id ORDER BY c.created_at DESC';
        
        const [rows] = await db.execute(query, values);
        return rows;
    }
    
    static async findById(id) {
        const [rows] = await db.execute(
            `SELECT c.*, u.full_name as instructor_name,
                    (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_students
             FROM courses c
             LEFT JOIN users u ON c.instructor_id = u.id
             WHERE c.id = ?`,
            [id]
        );
        
        if (rows[0]) {
            // Get lessons
            const [lessons] = await db.execute(
                'SELECT * FROM lessons WHERE course_id = ? ORDER BY `order` ASC',
                [id]
            );
            rows[0].lessons = lessons;
        }
        
        return rows[0];
    }
    
    static async update(id, updateData) {
        const fields = [];
        const values = [];
        
        for (const [key, value] of Object.entries(updateData)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
        
        values.push(id);
        const [result] = await db.execute(
            `UPDATE courses SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        
        return result.affectedRows > 0;
    }
    
    static async delete(id) {
        const [result] = await db.execute('DELETE FROM courses WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
    
    static async getCoursesByInstructor(instructorId) {
        const [rows] = await db.execute(
            `SELECT c.*, COUNT(DISTINCT e.user_id) as enrolled_students
             FROM courses c
             LEFT JOIN enrollments e ON c.id = e.course_id
             WHERE c.instructor_id = ?
             GROUP BY c.id`,
            [instructorId]
        );
        return rows;
    }
}

module.exports = Course;