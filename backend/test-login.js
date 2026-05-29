const axios = require('axios');

async function testLogin() {
    try {
        const response = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@learning.com',
            password: 'admin@123'
        });
        console.log('Login Response:', JSON.stringify(response.data, null, 2));
        console.log('User Role:', response.data.user.role);
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testLogin();