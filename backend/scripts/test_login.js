const axios = require('axios');

async function testLogin() {
  try {
    const res = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@hamburgueriateste.com',
      password: 'admin123' // password is 'admin123' based on seed.js
    });
    console.log('Login successful:', JSON.stringify(res.data, null, 2));
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
  }
}

testLogin();
