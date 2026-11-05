import { createContext, useState, useEffect, useContext } from 'react';
import api, { cerrarSesion } from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return localStorage.getItem('access_token') ? JSON.parse(localStorage.getItem('user') || 'null') : null;
    } catch { return null; }
  });
  const loading = false;

  useEffect(() => {
    const actualizarSesion = () => setUser(null);
    const sincronizar = event => {
      if ((event.key === 'access_token' || event.key === null) && !localStorage.getItem('access_token')) setUser(null);
    };
    window.addEventListener('autogest:sesion-cerrada', actualizarSesion);
    window.addEventListener('storage', sincronizar);
    return () => {
      window.removeEventListener('autogest:sesion-cerrada', actualizarSesion);
      window.removeEventListener('storage', sincronizar);
    };
  }, []);

  const login = async (identifier, password) => {
    const response = await api.post('auth/login/', { username: identifier, password });
    const { access, refresh, ...userData } = response.data;

    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user', JSON.stringify(userData));

    setUser(userData);
  };

  const logout = () => {
    cerrarSesion();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// El hook y su proveedor comparten este contexto de autenticación.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
