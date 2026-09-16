// frontend/src/pages/MisVideosPage.jsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Form, Modal } from 'react-bootstrap';
import AppLayout from '../components/layout/AppLayout';

const formatearFecha = (fecha) => {
  if (!fecha) return '';
  const date = new Date(fecha);
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatearDuracion = (segundos) => {
  if (!segundos) return '0:00';
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${min}:${String(seg).padStart(2, '0')}`;
};

const MisVideosPage = () => {
  const navigate = useNavigate();

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ===== EDITAR =====
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [videoEditar, setVideoEditar] = useState(null);
  const [tituloEditar, setTituloEditar] = useState('');
  const [descripcionEditar, setDescripcionEditar] = useState('');
  const [editarLoading, setEditarLoading] = useState(false);
  const [editarError, setEditarError] = useState('');

  // ===== ELIMINAR =====
  const [showEliminarModal, setShowEliminarModal] = useState(false);
  const [videoEliminar, setVideoEliminar] = useState(null);
  const [eliminarLoading, setEliminarLoading] = useState(false);
  const [eliminarError, setEliminarError] = useState('');

  const token = localStorage.getItem('token');

  // =============================================
  // CARGAR VIDEOS
  // =============================================
  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch('/api/videos/mis-videos', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error al cargar tus videos');
        }

        setVideos(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [token]);

  // =============================================
  // EDITAR
  // =============================================
  const abrirEditar = (video) => {
    setVideoEditar(video);
    setTituloEditar(video.titulo);
    setDescripcionEditar(video.descripcion || '');
    setEditarError('');
    setShowEditarModal(true);
  };

  const handleGuardarEdicion = async () => {
    if (!tituloEditar.trim()) {
      setEditarError('El título no puede estar vacío.');
      return;
    }

    setEditarLoading(true);
    setEditarError('');

    try {
      const response = await fetch(`/api/videos/${videoEditar.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          titulo: tituloEditar.trim(),
          descripcion: descripcionEditar.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar el video');
      }

      // Actualizar la lista local
      setVideos((prev) =>
        prev.map((v) =>
          v.id === videoEditar.id
            ? { ...v, titulo: tituloEditar.trim(), descripcion: descripcionEditar.trim() }
            : v
        )
      );

      setShowEditarModal(false);
      setVideoEditar(null);
    } catch (err) {
      setEditarError(err.message);
    } finally {
      setEditarLoading(false);
    }
  };

  // =============================================
  // ELIMINAR
  // =============================================
  const abrirEliminar = (video) => {
    setVideoEliminar(video);
    setEliminarError('');
    setShowEliminarModal(true);
  };

  const handleEliminarVideo = async () => {
    setEliminarLoading(true);
    setEliminarError('');

    try {
      const response = await fetch(`/api/videos/${videoEliminar.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar el video');
      }

      setVideos((prev) => prev.filter((v) => v.id !== videoEliminar.id));
      setShowEliminarModal(false);
      setVideoEliminar(null);
    } catch (err) {
      setEliminarError(err.message);
    } finally {
      setEliminarLoading(false);
    }
  };

  // =============================================
  // RENDER
  // =============================================
  return (
    <AppLayout>
      {/* CABECERA */}
      <div className="misvideos-header">
        <div>
          <h1 className="misvideos-title">Mis videos</h1>
          <p className="misvideos-subtitle">
            Administra los videos que has publicado
            {videos.length > 0 && (
              <> · <strong>{videos.length}</strong> {videos.length === 1 ? 'video' : 'videos'}</>
            )}
          </p>
        </div>

        <Button
          className="hero-btn-primary misvideos-btn-publicar"
          onClick={() => navigate('/mis-videos/publicar')}
        >
          <span className="misvideos-btn-icon">+</span>
          Publicar video
        </Button>
      </div>

      {/* ESTADOS */}
      {loading && (
        <div className="feed-loading">
          <div className="spinner"></div>
          <p>Cargando tus videos...</p>
        </div>
      )}

      {error && (
        <div className="feed-error">
          <p>{error}</p>
        </div>
      )}

      {/* SIN VIDEOS */}
      {!loading && !error && videos.length === 0 && (
        <div className="misvideos-vacio">
          <div className="misvideos-vacio-icon"></div>
          <h2>Aún no has publicado videos</h2>
          <p>
            Comparte tu primer video.
          </p>
          <Button
            className="hero-btn-primary"
            onClick={() => navigate('/mis-videos/publicar')}
          >
            Publicar mi primer video
          </Button>
        </div>
      )}

      {/* GRID DE VIDEOS */}
      {!loading && !error && videos.length > 0 && (
        <div className="misvideos-grid">
          {videos.map((video) => (
            <div key={video.id} className="misvideo-card">
              {/* Thumbnail */}
              <div className="misvideo-thumbnail-container">
                <img
                  src={video.thumbnail_url || 'https://via.placeholder.com/320x180'}
                  alt={video.titulo}
                  className="misvideo-thumbnail"
                />
                <span className="misvideo-duration">
                  {formatearDuracion(video.duracion)}
                </span>
                {!video.es_publico && (
                  <span className="misvideo-badge-privado">Privado</span>
                )}
              </div>

              {/* Info */}
              <div className="misvideo-info">
                <h3 className="misvideo-titulo">{video.titulo}</h3>
                <p className="misvideo-stats">
                  {video.vistas || 0} vistas · {formatearFecha(video.created_at)}
                </p>
                {video.descripcion && (
                  <p className="misvideo-descripcion">{video.descripcion}</p>
                )}
              </div>

              {/* Acciones */}
              <div className="misvideo-acciones">
                <Link
                  to={`/video/${video.id}`}
                  className="misvideo-btn misvideo-btn-ver"
                >
                  Ver
                </Link>
                <button
                  className="misvideo-btn misvideo-btn-editar"
                  onClick={() => abrirEditar(video)}
                >
                  Editar
                </button>
                <button
                  className="misvideo-btn misvideo-btn-eliminar"
                  onClick={() => abrirEliminar(video)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL EDITAR */}
      <Modal
        show={showEditarModal}
        onHide={() => {
          setShowEditarModal(false);
          setVideoEditar(null);
          setEditarError('');
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ color: '#1a237e' }}>
            Editar video
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Título</Form.Label>
            <Form.Control
              type="text"
              value={tituloEditar}
              onChange={(e) => setTituloEditar(e.target.value)}
              maxLength={100}
              disabled={editarLoading}
              placeholder="Título del video"
            />
            <small className="config-hint">{tituloEditar.length}/100</small>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Descripción</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={descripcionEditar}
              onChange={(e) => setDescripcionEditar(e.target.value)}
              maxLength={500}
              disabled={editarLoading}
              placeholder="Descripción del video"
            />
            <small className="config-hint">{descripcionEditar.length}/500</small>
          </Form.Group>

          {editarError && <p className="config-error">{editarError}</p>}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setShowEditarModal(false);
              setVideoEditar(null);
              setEditarError('');
            }}
            disabled={editarLoading}
          >
            Cancelar
          </Button>
          <Button
            className="hero-btn-primary"
            onClick={handleGuardarEdicion}
            disabled={editarLoading}
          >
            {editarLoading ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL ELIMINAR */}
      <Modal
        show={showEliminarModal}
        onHide={() => {
          setShowEliminarModal(false);
          setVideoEliminar(null);
          setEliminarError('');
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ color: '#c0392b' }}>
            ¿Eliminar este video?
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Estás a punto de eliminar:</p>
          <p style={{ fontWeight: 600, color: '#1a237e' }}>
            "{videoEliminar?.titulo}"
          </p>
          <p>
            Esta acción <strong>no se puede deshacer</strong>. El video y su
            miniatura serán eliminados permanentemente.
          </p>
          {eliminarError && <p className="config-error">{eliminarError}</p>}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setShowEliminarModal(false);
              setVideoEliminar(null);
              setEliminarError('');
            }}
            disabled={eliminarLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleEliminarVideo}
            disabled={eliminarLoading}
          >
            {eliminarLoading ? 'Eliminando...' : 'Eliminar video'}
          </Button>
        </Modal.Footer>
      </Modal>
    </AppLayout>
  );
};

export default MisVideosPage;