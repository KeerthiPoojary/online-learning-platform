const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function updateWorkingPassword() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'learning_platform'
    });
    
    try {
        // Generate a fresh working hash for '123456'
        const workingPassword = '123456';
        const workingHash = await bcrypt.hash(workingPassword, 10);
        
        console.log('Generated working hash:', workingHash);
        console.log('For password:', workingPassword);
        console.log('');
        
        // Update the user's password
        const [result] = await connection.execute(
            'UPDATE users SET password = ? WHERE email = ?',
            [workingHash, 'ramya@gmail.com']
        );
        
        if (result.affectedRows > 0) {
            console.log('✅ Password updated successfully!');
            
            // Verify the update
            const [users] = await connection.execute('SELECT * FROM users WHERE email = ?', ['ramya@gmail.com']);
            const isValid = await bcrypt.compare(workingPassword, users[0].password);
            
            if (isValid) {
                console.log('\n🎉 SUCCESS! Password verification passed!');
                console.log('\n📋 LOGIN CREDENTIALS:');
                console.log('   Email: ramya@gmail.com');
                console.log('   Password: 123456');
                console.log('\nYou can now login successfully!');
            } else {
                console.log('\n❌ Verification failed. Please run this script again.');
            }
        } else {
            console.log('User not found. Creating new user...');
            await connection.execute(
                'INSERT INTO users (name, email, password, role, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
                ['Ramya', 'ramya@gmail.com', workingHash, 'student']
            );
            console.log('✅ New user created with working password!');
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

updateWorkingPassword();