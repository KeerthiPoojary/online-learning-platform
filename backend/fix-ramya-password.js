const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function fixRamyaPassword() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '', // Your MySQL password - update if you have one
        database: 'learning_platform'
    });
    
    try {
        // Hash the password
        const plainPassword = 'Ramya@123';
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        
        console.log('Original password:', plainPassword);
        console.log('Hashed password:', hashedPassword);
        
        // Update Ramya's password
        const [result] = await connection.execute(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedPassword, 'ramya@gmail.com']
        );
        
        if (result.affectedRows > 0) {
            console.log('\n✅ Password updated successfully for ramya@gmail.com!');
            console.log('You can now login with:');
            console.log('Email: ramya@gmail.com');
            console.log('Password: Ramya@123');
        } else {
            console.log('\n❌ User not found. Creating new user...');
            
            // Create user if doesn't exist
            await connection.execute(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                ['Ramya', 'ramya@gmail.com', hashedPassword, 'student']
            );
            console.log('✅ User created successfully!');
            console.log('Email: ramya@gmail.com');
            console.log('Password: Ramya@123');
        }
        
        // Verify the update
        const [users] = await connection.execute('SELECT email, password FROM users WHERE email = ?', ['ramya@gmail.com']);
        if (users.length > 0) {
            console.log('\n✓ Verification: User exists in database');
            console.log('✓ Password is now hashed and ready for login');
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

fixRamyaPassword();