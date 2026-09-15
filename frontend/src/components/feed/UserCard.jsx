import { Link } from 'react-router-dom';

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

const UserCard = ({ usuario }) => {
  const tieneAvatar = usuario.avatar_url;

  return (
    <Link to={`/perfil/${usuario.nombre_usuario}`} className="user-card">
      {tieneAvatar ? (
        <img
          src={usuario.avatar_url}
          alt={usuario.nombre_usuario}
          className="user-card-avatar"
        />
      ) : (
        <div
          className="user-card-avatar user-card-avatar-initials"
          style={{ backgroundColor: getColorAvatar(usuario.nombre_usuario) }}
        >
          {getIniciales(usuario.nombre_usuario)}
        </div>
      )}
      <div className="user-card-info">
        <h4 className="user-card-name">{usuario.nombre_usuario}</h4>
        <p className="user-card-stats">
          {usuario.total_videos} {usuario.total_videos === 1 ? 'video' : 'videos'}
        </p>
        {usuario.bio && (
          <p className="user-card-bio">{usuario.bio}</p>
        )}
      </div>
      <button className="user-card-btn">Ver perfil</button>
    </Link>
  );
};

export default UserCard;