import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const applySession = (data) => {
    setUser(data.user);
    setCompany(data.company);
    setPermissions(data.permissions || []);
  };

  const refresh = useCallback(async () => {
    const token = localStorage.getItem('hrms_token');
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await api.get('/auth/me');
      applySession(data);
    } catch {
      localStorage.removeItem('hrms_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('hrms_token', data.token);
    applySession(data);
  };

  const registerCompany = async (form) => {
    const { data } = await api.post('/auth/register-company', form);
    localStorage.setItem('hrms_token', data.token);
    applySession(data);
  };

  const logout = () => {
    localStorage.removeItem('hrms_token');
    setUser(null);
    setCompany(null);
    setPermissions([]);
  };

  return (
    <AuthContext.Provider value={{ user, company, permissions, loading, login, registerCompany, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
