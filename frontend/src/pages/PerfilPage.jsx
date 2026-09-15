import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import VideoCard from '../components/feed/VideoCard';
import { useAuth } from '../hooks/useAuth';
import chatIcon from '../assets/icons/chatIcon.png';
import docsIcon from '../assets/icons/docsIcon.png';

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

const PerfilPage = () => {
  const { nombre_usuario } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [perfil, setPerfil] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPerfil = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/usuarios/perfil/${nombre_usuario}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Usuario no encontrado');
        }

        setPerfil(data.usuario);
        setVideos(data.videos || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPerfil();
  }, [nombre_usuario]);

  // Verificar si es mi propio perfil
  const esMiPerfil = user?.nombre_usuario === nombre_usuario;

  const handleEnviarMensaje = () => {
    // Navegar al chat con este usuario
    // Por ahora, redirigimos a /chats con un query param
    navigate(`/chats?usuario=${perfil.nombre_usuario}`);
  };

  const handleVerRepositorio = () => {
    navigate(`/repositorio/${perfil.nombre_usuario}`);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="feed-loading">
          <div className="spinner"></div>
          <p>Cargando perfil...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !perfil) {
    return (
      <AppLayout>
        <div className="feed-error">
          <p>{error || 'Usuario no encontrado'}</p>
          <Link to="/feed" className="btn btn-primary mt-3">
            Volver al feed
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* ===== CABECERA DEL PERFIL ===== */}
      <div className="perfil-header">
        <div className="perfil-avatar-wrapper">
          {perfil.avatar_url ? (
            <img
              src={perfil.avatar_url}
              alt={perfil.nombre_usuario}
              className="perfil-avatar"
            />
          ) : (
            <div
              className="perfil-avatar perfil-avatar-initials"
              style={{ backgroundColor: getColorAvatar(perfil.nombre_usuario) }}
            >
              {getIniciales(perfil.nombre_usuario)}
            </div>
          )}
        </div>

        <div className="perfil-info">
          <h1 className="perfil-nombre">{perfil.nombre_usuario}</h1>

          <p className="perfil-meta">
            {perfil.total_videos} {perfil.total_videos === 1 ? 'video' : 'videos'}
          </p>

          {perfil.bio ? (
            <p className="perfil-bio">{perfil.bio}</p>
          ) : (
            <p className="perfil-bio perfil-bio-vacia">
              {esMiPerfil
                ? 'Aún no has agregado una biografía.'
                : 'Este usuario aún no ha agregado una biografía.'}
            </p>
          )}

          {/* ===== BOTONES DE ACCIÓN ===== */}
          {!esMiPerfil && (
            <div className="perfil-acciones">
              <button
                className="perfil-btn perfil-btn-primary"
                onClick={handleEnviarMensaje}
              >
                <img src={chatIcon} alt="Chat" className="perfil-btn-icon" />
                <span>Enviar mensaje</span>
              </button>

              <button
                className="perfil-btn perfil-btn-secondary"
                onClick={handleVerRepositorio}
              >
                <img src={docsIcon} alt="Repositorio" className="perfil-btn-icon" />
                <span>Ver repositorio</span>
              </button>
            </div>
          )}

          {/* Si es mi propio perfil, mostrar botón de configuración */}
          {esMiPerfil && (
            <div className="perfil-acciones">
              <Link
                to="/configuracion"
                className="perfil-btn perfil-btn-secondary"
              >
                <span>Editar perfil</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ===== VIDEOS DEL USUARIO ===== */}
      <section className="perfil-videos">
        <h2 className="feed-section-title">
          {videos.length > 0
            ? `Videos (${videos.length})`
            : 'Videos'}
        </h2>

        {videos.length > 0 ? (
          <div className="feed-grid">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <div className="perfil-vacio">
            <p>
              {esMiPerfil
                ? 'Aún no has publicado ningún video.'
                : 'Este usuario aún no ha publicado videos.'}
            </p>
            {esMiPerfil && (
              <Link to="/mis-videos" className="btn btn-primary mt-3">
                Publicar mi primer video
              </Link>
            )}
          </div>
        )}
      </section>
    </AppLayout>
  );
};

export default PerfilPage;