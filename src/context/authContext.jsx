// client/src/context/authContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/axios';

const AuthContext = createContext(null);

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Initialize user from localStorage if available
    const savedUser = localStorage.getItem(USER_KEY);
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Clear auth data helper
  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setError(null);
  }, []);

  // Initialize auth state
  const initializeAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setLoading(false);
        return;
      }

      api.defaults.headers.common['Authorization'] = token;
      
      const response = await api.get('/auth/me');
      
      if (response.data.status === 'success') {
        const userData = response.data.data.user;
        setUser(userData);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
      } else {
        clearAuth();
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      clearAuth();
    } finally {
      setLoading(false);
    }
  }, [clearAuth]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = async (credentials) => {
    try {
      setError(null);
      const response = await api.post('/auth/login', credentials);
      
      if (response.data.status === 'success') {
        const { token, user: userData } = response.data.data;
        const tokenWithBearer = `Bearer ${token}`;
        
        // Store auth data
        localStorage.setItem(TOKEN_KEY, tokenWithBearer);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        
        // Update application state
        api.defaults.headers.common['Authorization'] = tokenWithBearer;
        setUser(userData);
        
        return { success: true };
      }
      
      const error = response.data.message || 'Login failed';
      setError(error);
      return { success: false, error };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'An error occurred during login';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = useCallback(async () => {
    try {
      // Attempt to call logout endpoint if it exists
      await api.post('/auth/logout').catch(() => {});
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const updateUser = useCallback(async (userData) => {
    try {
      const response = await api.put('/auth/me', userData);
      if (response.data.status === 'success') {
        const updatedUser = response.data.data.user;
        setUser(updatedUser);
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
        return { success: true };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      console.error('Update user failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to update user'
      };
    }
  }, []);

  const authenticatedRequest = useCallback(async (method, url, data = null) => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await api({
        method,
        url,
        ...(data && { data }),
        headers: {
          'Authorization': token
        }
      });

      // Handle token refresh if provided in response
      const newToken = response.headers['x-new-token'];
      if (newToken) {
        localStorage.setItem(TOKEN_KEY, newToken);
        api.defaults.headers.common['Authorization'] = newToken;
      }

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        clearAuth();
        throw new Error('Session expired. Please login again.');
      }
      throw error;
    }
  }, [clearAuth]);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser,
    authenticatedRequest,
    refreshAuth: initializeAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};