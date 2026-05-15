import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext';
import axios from 'axios';
import DeleteConfirmationProvider from './components/global/DeleteConfirmationProvider.jsx';

const redirectToLogin = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');

  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
};

// Add a request interceptor
axios.interceptors.request.use(
  config => {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    const token = storedUser?.token || localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status;

    if (status === 401) {
      redirectToLogin();
    }

    return Promise.reject(error);
  }
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DeleteConfirmationProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </DeleteConfirmationProvider>
  </StrictMode>,
)
