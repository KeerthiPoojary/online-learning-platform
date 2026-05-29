const db = require('../config/database');

class Lesson {
    static async create(lessonData) {
        const { course_id, title, content, video_url, duration, order } = lessonData;
        
        // Get the next order if not provided
        let lessonOrder = order;
        if (!lessonOrder) {
            const [rows] = await db.execute(
                'SELECT MAX(`order`) as max_order FROM lessons WHERE course_id = ?',
                [course_id]
            );
            lessonOrder = (rows[0].max_order || 0) + 1;
        }
        
        const [result] = await db.execute(
            `INSERT INTO lessons (course_id, title, content, video_url, duration, \`order\`) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [course_id, title, content, video_url, duration, lessonOrder]
        );
        
        return result.insertId;
    }
    
    static async findById(id) {
        const [rows] = await db.execute(
            `SELECT l.*, c.title as course_title 
             FROM lessons l
             JOIN courses c ON l.course_id = c.id
             WHERE l.id = ?`,
            [id]
        );
        return rows[0];
    }
    
    static async findByCourseId(courseId) {
        const [rows] = await db.execute(
            'SELECT * FROM lessons WHERE course_id = ? ORDER BY `order` ASC',
            [courseId]
        );
        return rows;
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
            `UPDATE lessons SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        
        return result.affectedRows > 0;
    }
    
    static async delete(id) {
        const [result] = await db.execute('DELETE FROM lessons WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
    
    static async reorder(courseId, lessonOrders) {
        const connection = await db.getConnection();
        await connection.beginTransaction();
        
        try {
            for (const { id, order } of lessonOrders) {
                await connection.execute(
                    'UPDATE lessons SET `order` = ? WHERE id = ? AND course_id = ?',
                    [order, id, courseId]
                );
            }
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = Lesson;