import axios from 'axios';

const API_URL = 'https://online-learning-platform-99mm.onrender.com/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Don't add any interceptors that redirect
export default api;