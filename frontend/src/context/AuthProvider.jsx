// frontend/src/context/AuthProvider.jsx
import { useState } from 'react';
import { AuthContext } from './AuthContext';

const cargarUsuarioInicial = () => {
  try {
    const usuarioGuardado = localStorage.getItem('usuario');
    const token = localStorage.getItem('token');

    if ((usuarioGuardado && !token) || (!usuarioGuardado && token)) {
      localStorage.removeItem('usuario');
      localStorage.removeItem('token');
      return null;
    }

    if (usuarioGuardado && token) {
      return JSON.parse(usuarioGuardado);
    }
    return null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(cargarUsuarioInicial);

  const login = (usuario, token) => {
    localStorage.setItem('usuario', JSON.stringify(usuario));
    localStorage.setItem('token', token);
    setUser(usuario);
  };

  const logout = () => {
    localStorage.removeItem('usuario');
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};