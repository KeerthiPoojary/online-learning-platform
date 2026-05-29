const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Change to your MySQL password
    database: 'online_learning_platform'
});

// Admin credentials
const ADMIN_EMAIL = 'admin@learning.com';
const NEW_PASSWORD = 'Admin@123';

db.connect(async (err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    
    console.log('✅ Connected to database\n');
    console.log(`🔄 Resetting password for: ${ADMIN_EMAIL}\n`);
    
    // Hash password with Node.js bcrypt (will create $2a$ format)
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);
    console.log('📝 New password hash created:', hashedPassword.substring(0, 30) + '...');
    
    // Update admin password
    db.query('UPDATE users SET password_hash = ? WHERE email = ?', 
        [hashedPassword, ADMIN_EMAIL], 
        (err, result) => {
            if (err) {
                console.error('❌ Error updating password:', err);
            } else if (result.affectedRows === 0) {
                console.log(`❌ No user found with email: ${ADMIN_EMAIL}`);
            } else {
                console.log(`\n✅ Admin password reset successfully!`);
                console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                console.log(`📧 Email: ${ADMIN_EMAIL}`);
                console.log(`🔑 New Password: ${NEW_PASSWORD}`);
                console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
            }
            db.end();
        });
});