// frontend/src/components/layout/Sidebar.jsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSidebar } from '../../hooks/useSidebar';
import cameraIcon from '../../assets/icons/cameraIcon.png';
import videoIcon from '../../assets/icons/videoIcon.png';
import chatIcon from '../../assets/icons/chatIcon.png';
import docsIcon from '../../assets/icons/docsIcon.png';
import graficaIcon from '../../assets/icons/graficaIcon.png';
import configIcon from '../../assets/icons/configIcon.png';
import logoutIcon from '../../assets/icons/logoutIcon.png';

const getIniciales = (nombre) => {
  if (!nombre) return '?';
  const palabras = nombre.trim().split(' ').filter(Boolean);
  if (palabras.length === 0) return '?';
  if (palabras.length === 1) return palabras[0].charAt(0).toUpperCase();
  return (palabras[0].charAt(0) + palabras[palabras.length - 1].charAt(0)).toUpperCase();
};

const getColorAvatar = (nombre) => {
  if (!nombre) return '#b45f52';
  const colores = [
    '#b45f52', '#4a6fa5', '#6a8e5f', '#a5844a',
    '#7d5ba6', '#c06c84', '#4a8e8e', '#8e6a4a'
  ];
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colores[Math.abs(hash) % colores.length];
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { isOpen, toggleSidebar, closeSidebar } = useSidebar();  // ← Context
  const navigate = useNavigate();
  const location = useLocation();
  const [imgError, setImgError] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { path: '/feed', icon: cameraIcon, label: 'Mi feed' },
    { path: '/mis-videos', icon: videoIcon, label: 'Mis videos' },
    { path: '/chats', icon: chatIcon, label: 'Chats' },
    { path: '/repositorio', icon: docsIcon, label: 'Mi repositorio' },
    { path: '/progreso', icon: graficaIcon, label: 'Mi progreso' },
    { path: '/configuracion', icon: configIcon, label: 'Configuración' },
  ];

  const isActive = (path) => location.pathname === path;
  const tieneAvatar = user?.avatar_url && !imgError;

  return (
    <>
      {/* Botón para abrir/cerrar el menú */}
      <button
        className={`sidebar-toggle ${isOpen ? 'sidebar-toggle-open' : ''}`}
        onClick={toggleSidebar}
        aria-label="Abrir menú"
      >
        ☰
      </button>

      {/* Overlay (solo en móvil) */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Perfil del usuario */}
        <div className="sidebar-profile">
          {tieneAvatar ? (
            <img
              src={user.avatar_url}
              alt={user.nombre_usuario || user.nombre}
              className="sidebar-avatar"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="sidebar-avatar sidebar-avatar-initials"
              style={{ backgroundColor: getColorAvatar(user?.nombre_usuario || user?.nombre) }}
            >
              {getIniciales(user?.nombre_usuario || user?.nombre)}
            </div>
          )}
          <div className="sidebar-user-info">
            <p className="sidebar-username">
              {user?.nombre_usuario || user?.nombre || 'Usuario'}
            </p>
          </div>
        </div>

        {/* Menú de navegación */}
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={closeSidebar}  // ← Cierra el sidebar al hacer clic
            >
              <img src={item.icon} alt={item.label} className="sidebar-icon" />
              <span>{item.label}</span>
            </Link>
          ))}

          <button
            className="sidebar-link sidebar-logout"
            onClick={handleLogout}
          >
            <img src={logoutIcon} alt="Cerrar sesión" className="sidebar-icon" />
            <span>Cerrar sesión</span>
          </button>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;