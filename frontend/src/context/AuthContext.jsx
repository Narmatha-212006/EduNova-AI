import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  // Set API base URL globally
  axios.defaults.baseURL = 'http://localhost:8000';

  useEffect(() => {
    // Apply theme
    const rootClass = document.documentElement.classList;
    if (theme === 'light') {
      rootClass.add('light-theme');
    } else {
      rootClass.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const bootstrapAuth = async () => {
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          const res = await axios.get('/api/auth/profile');
          setUser(res.data);
        } catch (err) {
          console.error("Token bootstrap failed:", err);
          logout();
        }
      } else {
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
      }
      setLoading(false);
    };
    bootstrapAuth();
  }, [token]);

  const login = async (email, password, rememberMe) => {
    try {
      const res = await axios.post('/api/auth/login', { email, password, remember_me: rememberMe });
      const { access_token, role, name, email: userEmail } = res.data;
      
      setToken(access_token);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setUser({ name, email: userEmail, role });
      return { success: true, role };
    } catch (err) {
      console.error("Login failed:", err);
      const errMsg = err.response?.data?.detail || "Invalid credentials. Please try again.";
      return { success: false, error: errMsg };
    }
  };

  const signup = async (name, email, password, role) => {
    try {
      await axios.post('/api/auth/signup', { name, email, password, role });
      return { success: true };
    } catch (err) {
      console.error("Signup failed:", err);
      const errMsg = err.response?.data?.detail || "Registration failed. Try again later.";
      return { success: false, error: errMsg };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const updateProfile = async (name, email) => {
    try {
      const res = await axios.put('/api/auth/profile', { name, email });
      setUser((prev) => ({ ...prev, name: res.data.name, email: res.data.email }));
      return { success: true };
    } catch (err) {
      const errMsg = err.response?.data?.detail || "Update failed.";
      return { success: false, error: errMsg };
    }
  };

  const resetPassword = async (oldPassword, newPassword) => {
    try {
      await axios.post('/api/auth/reset-password', { old_password: oldPassword, new_password: newPassword });
      return { success: true };
    } catch (err) {
      const errMsg = err.response?.data?.detail || "Password reset failed.";
      return { success: false, error: errMsg };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, theme, login, signup, logout, toggleTheme, updateProfile, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
