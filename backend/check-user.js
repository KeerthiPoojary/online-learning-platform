const mysql = require('mysql2/promise');

async function checkUser() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '', // Your MySQL password (leave empty if no password)
        database: 'learning_platform'
    });
    
    try {
        console.log('Checking users in database...\n');
        
        // Get all users
        const [users] = await connection.execute('SELECT id, name, email, role, password FROM users');
        
        if (users.length === 0) {
            console.log('❌ No users found in database!');
            console.log('You need to create a user first.\n');
        } else {
            console.log(`Found ${users.length} user(s):\n`);
            users.forEach(user => {
                console.log(`ID: ${user.id}`);
                console.log(`Name: ${user.name}`);
                console.log(`Email: ${user.email}`);
                console.log(`Role: ${user.role}`);
                console.log(`Password hash: ${user.password.substring(0, 30)}...`);
                console.log('---');
            });
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await connection.end();
    }
}

checkUser();