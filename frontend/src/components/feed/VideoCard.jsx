// frontend/src/components/feed/VideoCard.jsx
import { Link } from 'react-router-dom';

const VideoCard = ({ video }) => {
  const formatearDuracion = (segundos) => {
    if (!segundos) return '0:00';
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return `${min}:${String(seg).padStart(2, '0')}`;
  };

  const formatearFecha = (fecha) => {
    const date = new Date(fecha);
    const ahora = new Date();
    const diffMs = ahora - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Hace un momento';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHoras < 24) return `Hace ${diffHoras} h`;
    if (diffDias < 7) return `Hace ${diffDias} días`;
    return date.toLocaleDateString();
  };

  return (
    <Link to={`/video/${video.id}`} className="video-card">
      <div className="video-thumbnail-container">
        <img
          src={video.thumbnail_url || 'https://via.placeholder.com/320x180'}
          alt={video.titulo}
          className="video-thumbnail"
        />
        <span className="video-duration">
          {formatearDuracion(video.duracion)}
        </span>
      </div>

      <div className="video-info">
        <img
          src={video.usuarios?.avatar_url || 'https://via.placeholder.com/40'}
          alt={video.usuarios?.nombre_usuario || 'Usuario'}
          className="video-avatar"
        />
        <div className="video-details">
          <h3 className="video-title">{video.titulo}</h3>
          <p className="video-author">{video.usuarios?.nombre_usuario || 'Usuario'}</p>
          <p className="video-stats">
            {video.vistas || 0} vistas · {formatearFecha(video.created_at)}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default VideoCard;