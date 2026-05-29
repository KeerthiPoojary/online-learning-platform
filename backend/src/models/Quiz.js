const db = require('../config/database');

class Quiz {
    static async create(quizData) {
        const { course_id, lesson_id, title, description, time_limit, passing_score } = quizData;
        
        const [result] = await db.execute(
            `INSERT INTO quizzes (course_id, lesson_id, title, description, time_limit, passing_score) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [course_id, lesson_id, title, description, time_limit, passing_score]
        );
        
        return result.insertId;
    }
    
    static async findById(id) {
        const [rows] = await db.execute(
            `SELECT q.*, c.title as course_title,
                    COUNT(DISTINCT qq.id) as total_questions
             FROM quizzes q
             JOIN courses c ON q.course_id = c.id
             LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
             WHERE q.id = ?
             GROUP BY q.id`,
            [id]
        );
        
        if (rows[0]) {
            // Get questions
            const [questions] = await db.execute(
                'SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY id',
                [id]
            );
            rows[0].questions = questions;
        }
        
        return rows[0];
    }
    
    static async findByCourseId(courseId) {
        const [rows] = await db.execute(
            `SELECT q.*, COUNT(qq.id) as total_questions
             FROM quizzes q
             LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
             WHERE q.course_id = ?
             GROUP BY q.id`,
            [courseId]
        );
        return rows;
    }
    
    static async addQuestion(quizId, questionData) {
        const { question_text, question_type, options, correct_answer, points } = questionData;
        
        const [result] = await db.execute(
            `INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, points) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [quizId, question_text, question_type, JSON.stringify(options), correct_answer, points]
        );
        
        return result.insertId;
    }
    
    static async updateQuestion(questionId, questionData) {
        const fields = [];
        const values = [];
        
        for (const [key, value] of Object.entries(questionData)) {
            if (key === 'options') {
                fields.push('options = ?');
                values.push(JSON.stringify(value));
            } else {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        
        values.push(questionId);
        const [result] = await db.execute(
            `UPDATE quiz_questions SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        
        return result.affectedRows > 0;
    }
    
    static async deleteQuestion(questionId) {
        const [result] = await db.execute('DELETE FROM quiz_questions WHERE id = ?', [questionId]);
        return result.affectedRows > 0;
    }
    
    static async submitAttempt(userId, quizId, answers) {
        const connection = await db.getConnection();
        await connection.beginTransaction();
        
        try {
            // Get quiz questions
            const [questions] = await connection.execute(
                'SELECT * FROM quiz_questions WHERE quiz_id = ?',
                [quizId]
            );
            
            let totalPoints = 0;
            let earnedPoints = 0;
            
            // Calculate score
            for (const question of questions) {
                totalPoints += question.points;
                const userAnswer = answers[question.id];
                
                if (userAnswer && userAnswer.toLowerCase() === question.correct_answer.toLowerCase()) {
                    earnedPoints += question.points;
                }
            }
            
            const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
            const passed = score >= (await this.getPassingScore(quizId));
            
            // Save attempt
            const [result] = await connection.execute(
                `INSERT INTO quiz_attempts (user_id, quiz_id, score, passed, answers, completed_at) 
                 VALUES (?, ?, ?, ?, ?, NOW())`,
                [userId, quizId, score, passed, JSON.stringify(answers)]
            );
            
            await connection.commit();
            
            return {
                attemptId: result.insertId,
                score,
                passed,
                totalPoints,
                earnedPoints
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
    
    static async getPassingScore(quizId) {
        const [rows] = await db.execute('SELECT passing_score FROM quizzes WHERE id = ?', [quizId]);
        return rows[0]?.passing_score || 70;
    }
    
    static async getUserAttempts(userId, quizId) {
        const [rows] = await db.execute(
            `SELECT * FROM quiz_attempts 
             WHERE user_id = ? AND quiz_id = ? 
             ORDER BY completed_at DESC`,
            [userId, quizId]
        );
        return rows;
    }
    
    static async getAttempt(attemptId) {
        const [rows] = await db.execute(
            `SELECT qa.*, q.title as quiz_title, q.passing_score,
                    u.full_name as user_name
             FROM quiz_attempts qa
             JOIN quizzes q ON qa.quiz_id = q.id
             JOIN users u ON qa.user_id = u.id
             WHERE qa.id = ?`,
            [attemptId]
        );
        return rows[0];
    }
}

module.exports = Quiz;