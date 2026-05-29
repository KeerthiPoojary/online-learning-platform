const mysql = require('mysql2/promise');

async function simpleTest() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'learning_platform'
        });
        
        // Check users
        const [users] = await connection.execute('SELECT id, name, email, role, password FROM users');
        console.log('Users in database:');
        users.forEach(user => {
            console.log(`- ${user.email} (${user.role})`);
            console.log(`  Password stored: ${user.password}`);
        });
        
        await connection.end();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

simpleTest();