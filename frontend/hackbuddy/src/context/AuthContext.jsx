import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { getSubscriptionStatus } from '../services/subscriptionService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshSubscription = async () => {
    try {
      const response = await getSubscriptionStatus();
      if (response.success) {
        setSubscription(response.subscription);
        setLimits(response.limits);
      }
    } catch (error) {
      console.error('Failed to load subscription status:', error);
    }
  };

  // Load user profile on startup if token exists
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/user/profile');
        setUser(response.data);
        // Also fetch subscription status
        await refreshSubscription();
      } catch (error) {
        console.error('Session verification failed:', error);
        localStorage.removeItem('token');
        setUser(null);
        setSubscription(null);
        setLimits(null);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []);

  // Register user
  const registerUser = async (name, email, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register', { name, email, password });
      const { token, user: userData } = response.data;
      localStorage.setItem('token', token);
      setUser(userData);
      await refreshSubscription();
      return { success: true };
    } catch (error) {
      console.error('Registration failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const loginUser = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user: userData } = response.data;
      localStorage.setItem('token', token);
      setUser(userData);
      await refreshSubscription();
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Login
  const googleLoginUser = async (credential) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/google', { credential });
      const { token, user: userData } = response.data;
      localStorage.setItem('token', token);
      setUser(userData);
      await refreshSubscription();
      return { success: true };
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Google authentication failed'
      };
    } finally {
      setLoading(false);
    }
  };

  // GitHub OAuth Login
  const githubLoginUser = async (code, redirectUri) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/github', { code, redirectUri });
      const { token, user: userData } = response.data;
      localStorage.setItem('token', token);
      setUser(userData);
      await refreshSubscription();
      return { success: true };
    } catch (error) {
      console.error('GitHub Sign-In failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'GitHub authentication failed'
      };
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logoutUser = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        limits,
        loading,
        register: registerUser,
        login: loginUser,
        googleLogin: googleLoginUser,
        githubLogin: githubLoginUser,
        logout: logoutUser,
        refreshSubscription
      }}
    >
      {children}
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
