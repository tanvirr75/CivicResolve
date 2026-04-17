import axios from 'axios';

// Create a globally configured Axios instance
const API = axios.create({
  // Because we configured Vite Proxy in vite.config.js, 
  // we do NOT need to hardcode the http://localhost:5000 domain.
  baseURL: '/api' 
});

// Request Interceptor: Automatically inject the JWT token if it exists!
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Seamlessly log users out if their token expires
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Unauthorized API call. Attempting flush...");
      localStorage.removeItem('token');
      // Forcing a hard redirect to login page protects the frontend states
      window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);

export default API;
