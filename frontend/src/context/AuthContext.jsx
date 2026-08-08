import { createContext, useContext, useState } from 'react';
import api from '../api';

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.requires2FA) return { requires2FA: true, userId: data.userId };
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return { success: true };
  };

  const verify2FA = async (userId, token) => {
    const { data } = await api.post('/auth/verify-2fa', { userId, token });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return { success: true };
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, verify2FA, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
