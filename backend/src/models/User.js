const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    static async create(userData) {
        const { username, email, password, full_name, role = 'student' } = userData;
        const password_hash = await bcrypt.hash(password, 10);
        
        const [result] = await db.execute(
            'INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
            [username, email, password_hash, full_name, role]
        );
        
        return result.insertId;
    }
    
    static async findByEmail(email) {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    }
    
    static async findById(id) {
        const [rows] = await db.execute(
            'SELECT id, username, email, role, full_name, avatar_url, created_at FROM users WHERE id = ?',
            [id]
        );
        return rows[0];
    }
    
    static async update(id, updateData) {
        const fields = [];
        const values = [];
        
        for (const [key, value] of Object.entries(updateData)) {
            if (key === 'password') {
                fields.push('password_hash = ?');
                values.push(await bcrypt.hash(value, 10));
            } else {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        
        values.push(id);
        const [result] = await db.execute(
            `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        
        return result.affectedRows > 0;
    }
    
    static async comparePassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }
}

module.exports = User;