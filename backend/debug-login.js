const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function debugLogin() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '', // Your MySQL password - change if you have one
        database: 'learning_platform'
    });
    
    try {
        console.log('=== DATABASE DEBUG ===\n');
        
        // Check all users
        const [users] = await connection.execute('SELECT id, name, email, role, password FROM users');
        
        if (users.length === 0) {
            console.log('❌ NO USERS FOUND IN DATABASE!');
            console.log('Creating a test user...\n');
            
            // Create a test user with a simple password
            const testPassword = 'test123';
            const hashedPassword = await bcrypt.hash(testPassword, 10);
            
            await connection.execute(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                ['Test User', 'test@example.com', hashedPassword, 'student']
            );
            
            console.log('✅ Test user created!');
            console.log('Email: test@example.com');
            console.log('Password: test123\n');
            
            const [newUser] = await connection.execute('SELECT * FROM users WHERE email = ?', ['test@example.com']);
            const user = newUser[0];
            console.log('Verifying password for test user...');
            const isValid = await bcrypt.compare(testPassword, user.password);
            console.log(`Password works: ${isValid ? 'YES ✓' : 'NO ✗'}\n`);
        } else {
            console.log(`Found ${users.length} user(s):\n`);
            
            for (const user of users) {
                console.log(`User: ${user.email} (${user.role})`);
                console.log(`Password hash: ${user.password.substring(0, 30)}...`);
                
                // Try to verify with common passwords
                const passwordsToTry = ['Ramya@123', 'password123', 'test123', '123456'];
                let foundValid = false;
                
                for (const testPass of passwordsToTry) {
                    const isValid = await bcrypt.compare(testPass, user.password);
                    if (isValid) {
                        console.log(`✓ Password works with: ${testPass}`);
                        foundValid = true;
                        break;
                    }
                }
                
                if (!foundValid) {
                    console.log(`✗ Unknown password. Need to reset this user.`);
                    // Reset password for this user
                    const newPassword = 'password123';
                    const newHash = await bcrypt.hash(newPassword, 10);
                    await connection.execute('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id]);
                    console.log(`  Password reset to: ${newPassword}`);
                }
                console.log('---');
            }
        }
        
        console.log('\n=== FINAL USER LIST ===');
        const [finalUsers] = await connection.execute('SELECT email, role FROM users');
        finalUsers.forEach(user => {
            console.log(`- ${user.email} (${user.role})`);
        });
        
        console.log('\n📝 Try logging in with:');
        console.log('Email: test@example.com');
        console.log('Password: test123');
        
        if (users.length > 0) {
            console.log('\nOr with your existing users using password: password123');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await connection.end();
    }
}

debugLogin();