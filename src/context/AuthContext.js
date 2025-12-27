import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('gearguard_token');
    if (token) {
      try {
        const response = await getMe();
        setUser(response.data);
      } catch (error) {
        localStorage.removeItem('gearguard_token');
        localStorage.removeItem('gearguard_user');
      }
    }
    setLoading(false);
  };

  const login = (token, userData) => {
    localStorage.setItem('gearguard_token', token);
    localStorage.setItem('gearguard_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('gearguard_token');
    localStorage.removeItem('gearguard_user');
    setUser(null);
  };

  const isAdmin = () => user?.role === 'admin';
  const isManager = () => user?.role === 'manager' || user?.role === 'admin';
  const isTechnician = () => user?.role === 'technician';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isManager, isTechnician, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
