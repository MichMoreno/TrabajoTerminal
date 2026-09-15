// frontend/src/components/feed/Feed.jsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import VideoCard from './VideoCard';
import UserCard from './UserCard';

const Feed = () => {
  const [videos, setVideos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');

      try {
        if (query) {
          // Buscar usuarios y videos en paralelo
          const [resUsuarios, resVideos] = await Promise.all([
            fetch(`/api/usuarios/buscar?q=${encodeURIComponent(query)}`),
            fetch(`/api/videos/buscar?q=${encodeURIComponent(query)}`),
          ]);

          const dataUsuarios = await resUsuarios.json();
          const dataVideos = await resVideos.json();

          if (!resUsuarios.ok) throw new Error(dataUsuarios.error || 'Error al buscar usuarios');
          if (!resVideos.ok) throw new Error(dataVideos.error || 'Error al buscar videos');

          setUsuarios(dataUsuarios || []);
          setVideos(dataVideos || []);
        } else {
          // Feed general: solo videos
          const response = await fetch('/api/videos');
          const data = await response.json();

          if (!response.ok) throw new Error(data.error || 'Error al cargar videos');

          setVideos(data);
          setUsuarios([]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [query]);

  if (loading) {
    return (
      <div className="feed-loading">
        <div className="spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feed-error">
        <p>{error}</p>
      </div>
    );
  }

  const sinResultados = videos.length === 0 && usuarios.length === 0;
  if (sinResultados) {
    return (
      <div className="feed-empty">
        <p>
          {query
            ? `No se encontraron resultados para "${query}"`
            : 'No hay videos publicados aún'}
        </p>
      </div>
    );
  }

  return (
    <div className="feed-container">
      {/* ===== SECCIÓN DE USUARIOS ===== */}
      {query && usuarios.length > 0 && (
        <section className="feed-section">
          <h2 className="feed-section-title">
            Usuarios ({usuarios.length})
          </h2>
          <div className="users-grid">
            {usuarios.map((usuario) => (
              <UserCard key={usuario.boleta} usuario={usuario} />
            ))}
          </div>
        </section>
      )}

      {/* ===== SECCIÓN DE VIDEOS ===== */}
      {videos.length > 0 && (
        <section className="feed-section">
          <h2 className="feed-section-title">
            {query ? `Videos (${videos.length})` : 'Videos'}
          </h2>
          <div className="feed-grid">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </section>
      )}

      {/* Si hay búsqueda pero solo hay usuarios */}
      {query && videos.length === 0 && usuarios.length > 0 && (
        <div className="feed-empty-inline">
          <p>No hay videos que coincidan con "{query}"</p>
        </div>
      )}
    </div>
  );
};

export default Feed;