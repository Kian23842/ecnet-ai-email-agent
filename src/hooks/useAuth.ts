import { useState, useEffect } from 'react';
import { getMe } from '../api/client';

interface User {
  id: string;
  email: string;
  display_name: string;
  organization_id: string;
  role: 'admin' | 'user';
  status: 'active' | 'disabled';
  signature?: string;
  business_context?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAdmin: boolean;
}

export function useAuth(): AuthState & { setAuth: (token: string, user: User) => void; clearAuth: () => void } {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('auth_token'),
    loading: true,
    isAdmin: false,
  });

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) { setState(s => ({ ...s, loading: false })); return; }
    getMe()
      .then(res => {
        const user: User = res.data.data;
        setState({ user, token, loading: false, isAdmin: user.role === 'admin' });
      })
      .catch(() => {
        localStorage.removeItem('auth_token');
        setState({ user: null, token: null, loading: false, isAdmin: false });
      });
  }, []);

  const setAuth = (token: string, user: User) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    setState({ user, token, loading: false, isAdmin: user.role === 'admin' });
  };

  const clearAuth = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setState({ user: null, token: null, loading: false, isAdmin: false });
  };

  return { ...state, setAuth, clearAuth };
}
