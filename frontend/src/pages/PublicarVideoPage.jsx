// frontend/src/pages/PublicarVideoPage.jsx
import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Form } from 'react-bootstrap';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import cameraIcon from '../assets/icons/cameraIcon.png';
const MAX_VIDEO_SIZE = 500 * 1024 * 1024;
const DURACION_MIN = 300;
const DURACION_MAX = 900;

const formatearTamano = (bytes) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const formatearDuracion = (segundos) => {
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${min}:${String(seg).padStart(2, '0')}`;
};

const PublicarVideoPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const fileInputRef = useRef(null);

  // ===== VIDEO =====
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [videoDuracion, setVideoDuracion] = useState(0);

  // ===== DATOS =====
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');

  // ===== COLABORADORES =====
  const [colaboradores, setColaboradores] = useState([]);
  const [nuevoColaborador, setNuevoColaborador] = useState('');
  const [buscandoColaborador, setBuscandoColaborador] = useState(false);
  const [errorColaborador, setErrorColaborador] = useState('');

  // ===== ESTADOS =====
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(null);

  const token = localStorage.getItem('token');

  // =============================================
  // SELECCIONAR VIDEO
  // =============================================
  const handleVideoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    if (!file.type.startsWith('video/')) {
      setError('El archivo debe ser un video (MP4, WebM, etc.).');
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      setError(`El video pesa ${formatearTamano(file.size)}. El límite es 500 MB.`);
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));

    const videoElement = document.createElement('video');
    videoElement.preload = 'metadata';
    videoElement.onloadedmetadata = () => {
      const dur = Math.round(videoElement.duration);
      setVideoDuracion(dur);

      if (dur < DURACION_MIN) {
        setError(`El video dura ${formatearDuracion(dur)}. Debe durar al menos 5 minutos.`);
      } else if (dur > DURACION_MAX) {
        setError(`El video dura ${formatearDuracion(dur)}. Debe durar máximo 15 minutos.`);
      }
    };
    videoElement.src = URL.createObjectURL(file);

    e.target.value = '';
  };

  const handleQuitarVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
    setVideoDuracion(0);
    setError('');
  };

  // =============================================
  // COLABORADORES
  // =============================================
  const handleAgregarColaborador = async () => {
    setErrorColaborador('');

    const nombre = nuevoColaborador.trim();

    if (!nombre) {
      setErrorColaborador('Ingresa un nombre de usuario.');
      return;
    }

    const miNombre = user?.nombre_usuario || user?.nombre;
    if(miNombre && nombre.toLowerCase() === miNombre.toLowerCase()){
        setErrorColaborador('No puedes agregarte a ti mismo como colaborador');
        return;
    }

    setBuscandoColaborador(true);

    try {
      const response = await fetch(
        `/api/usuarios/buscar?q=${encodeURIComponent(nombre)}`
      );
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Error al buscar usuario');

      const encontrado = data.find(
        (u) => u.nombre_usuario.toLowerCase() === nombre.toLowerCase()
      );

      if (!encontrado) {
        setErrorColaborador('Usuario no encontrado. Verifica el nombre exacto.');
        return;
      }

      setColaboradores((prev) => [...prev, encontrado]);
      setNuevoColaborador('');
    } catch (err) {
      setErrorColaborador(err.message);
    } finally {
      setBuscandoColaborador(false);
    }
  };

  const handleQuitarColaborador = (nombre_usuario) => {
    setColaboradores((prev) => prev.filter((c) => c.nombre_usuario !== nombre_usuario));
  };

  // =============================================
  // SUBIR VIDEO
  // =============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setExito(null);

    // Validaciones
    if (!videoFile) {
      setError('Selecciona un video primero.');
      return;
    }

    if (!titulo.trim()) {
      setError('El título es obligatorio.');
      return;
    }

    if (videoDuracion < DURACION_MIN || videoDuracion > DURACION_MAX) {
      setError('La duración del video debe estar entre 5 y 15 minutos.');
      return;
    }

    setSubiendo(true);
    setProgreso(0);

    try {
      // Preparar FormData con TODO
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('titulo', titulo.trim());
      formData.append('descripcion', descripcion.trim());
      
      // Colaboradores como JSON string
      if (colaboradores.length > 0) {
        formData.append(
          'colaboradores',
          JSON.stringify(colaboradores.map((c) => c.nombre_usuario))
        );
      }

      // Subir con XMLHttpRequest para progreso
      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const porcentaje = Math.round((event.loaded / event.total) * 100);
            setProgreso(porcentaje);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error('Respuesta inválida del servidor'));
            }
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error || 'Error al subir el video'));
            } catch {
              reject(new Error('Error al subir el video'));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Error de conexión al subir el video'));
        });

        xhr.open('POST', '/api/videos');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });

      setExito(data);
      setProgreso(100);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
    }
  };

  // =============================================
  // ÉXITO
  // =============================================
  if (exito) {
    return (
      <AppLayout>
        <div className="publicar-exito">
          <div className="publicar-exito-icon"></div>
          <h1>¡Video publicado!</h1>
          <p>
            Tu video <strong>"{exito.video?.titulo}"</strong> se ha subido correctamente.
          </p>

          {exito.colaboradores_registrados > 0 && (
            <p style={{ color: '#2e7d32' }}>
              {exito.colaboradores_registrados} colaborador(es) registrado(s)
            </p>
          )}

          {exito.validacion && (
            <div className="publicar-exito-validacion">
              <p><strong>Relevante:</strong> {exito.validacion.es_relevante ? 'Sí' : 'No'}</p>
              {exito.validacion.unidad && <p><strong>Unidad:</strong> {exito.validacion.unidad}</p>}
              {exito.validacion.confianza && <p><strong>Confianza:</strong> {exito.validacion.confianza}%</p>}
            </div>
          )}

          <div className="publicar-exito-acciones">
            <Button className="hero-btn-primary" onClick={() => navigate('/mis-videos')}>
              Ver mis videos
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => {
                setExito(null);
                setVideoFile(null);
                setVideoPreview(null);
                setTitulo('');
                setDescripcion('');
                setColaboradores([]);
                setProgreso(0);
              }}
            >
              Publicar otro video
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // =============================================
  // FORMULARIO
  // =============================================
  return (
    <AppLayout>
      <div className="publicar-container">
        <div className="publicar-header">
          <Link to="/mis-videos" className="publicar-back-link">
            ← Volver a Mis videos
          </Link>
          <h1 className="publicar-title">Publicar video</h1>
          <p className="publicar-subtitle">
            Comparte tu conocimiento con la comunidad
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* PASO 1: VIDEO */}
          <div className="publicar-card">
            <div className="publicar-step-header">
              <span className="publicar-step-number">1</span>
              <h2 className="publicar-step-title">Selecciona tu video</h2>
            </div>

            {!videoFile ? (
              <div
                className="publicar-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <img
                    src={cameraIcon}
                    alt="Subir video"
                    className="publicar-dropzone-icon"
                />
                <p className="publicar-dropzone-text">
                  <strong>Haz clic para seleccionar</strong> o arrastra tu video aquí
                </p>
                <p className="publicar-dropzone-hint">
                  MP4, WebM, MOV · Máximo 500 MB · Duración: 5 a 15 minutos
                </p>
              </div>
            ) : (
              <div className="publicar-video-preview">
                <video src={videoPreview} controls className="publicar-video-player" />
                <div className="publicar-video-info">
                  <div>
                    <p className="publicar-video-name"><strong>{videoFile.name}</strong></p>
                    <p className="publicar-video-meta">
                      {formatearTamano(videoFile.size)} · {formatearDuracion(videoDuracion)}
                    </p>
                  </div>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    type="button"
                    onClick={handleQuitarVideo}
                    disabled={subiendo}
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            )}

            <input
              type="file"
              accept="video/*"
              ref={fileInputRef}
              onChange={handleVideoChange}
              style={{ display: 'none' }}
              disabled={subiendo}
            />
          </div>

          {/* PASO 2: DATOS */}
          <div className="publicar-card">
            <div className="publicar-step-header">
              <span className="publicar-step-number">2</span>
              <h2 className="publicar-step-title">Detalles del video</h2>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Título *</Form.Label>
              <Form.Control
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={300}
                placeholder="Ej: Introducción a los casos de uso"
                disabled={subiendo}
              />
              <small className="publicar-hint">{titulo.length}/300</small>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Descripción</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                maxLength={300}
                placeholder="Describe el contenido del video..."
                disabled={subiendo}
              />
              <small className="publicar-hint">{descripcion.length}/300</small>
            </Form.Group>
          </div>

          {/* PASO 3: COLABORADORES */}
          <div className="publicar-card">
            <div className="publicar-step-header">
              <span className="publicar-step-number">3</span>
              <h2 className="publicar-step-title">Colaboradores (opcional)</h2>
            </div>
            <p className="publicar-hint mb-3">
              Agrega a los usuarios que participaron en el video. Aparecerán como coautores.
            </p>

            {colaboradores.length > 0 && (
              <div className="publicar-colaboradores-lista">
                {colaboradores.map((colab) => (
                  <div key={colab.boleta} className="publicar-colaborador-chip">
                    <span>{colab.nombre_usuario}</span>
                    <button
                      type="button"
                      onClick={() => handleQuitarColaborador(colab.nombre_usuario)}
                      disabled={subiendo}
                      className="publicar-colaborador-quitar"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="publicar-colaborador-input">
              <Form.Control
                type="text"
                value={nuevoColaborador}
                onChange={(e) => setNuevoColaborador(e.target.value)}
                placeholder="Nombre de usuario"
                disabled={subiendo || buscandoColaborador}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAgregarColaborador();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline-primary"
                onClick={handleAgregarColaborador}
                disabled={subiendo || buscandoColaborador}
              >
                {buscandoColaborador ? 'Buscando...' : 'Agregar'}
              </Button>
            </div>

            {errorColaborador && <p className="publicar-error-inline">{errorColaborador}</p>}
          </div>

          {/* MENSAJES */}
          {error && (
            <div className="publicar-error">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* PROGRESO */}
          {subiendo && (
            <div className="publicar-progreso">
              <div className="publicar-progreso-header">
                <span>
                  {progreso >= 100
                    ? 'Procesando video (transcripción, validación, cuestionarios)...'
                    : `Subiendo video... ${progreso}%`}
                </span>
              </div>
              <div className="publicar-progreso-bar">
                <div className="publicar-progreso-fill" style={{ width: `${Math.min(progreso, 100)}%` }} />
              </div>
              <p className="publicar-progreso-hint">
                {progreso >= 100
                  ? 'Esto puede tomar varios minutos. No cierres esta ventana.'
                  : 'No cierres esta ventana mientras se sube el video.'}
              </p>
            </div>
          )}

          {/* BOTONES */}
          <div className="publicar-acciones">
            <Button
              variant="outline-secondary"
              type="button"
              onClick={() => navigate('/mis-videos')}
              disabled={subiendo}
            >
              Cancelar
            </Button>
            <Button
              className="hero-btn-primary"
              type="submit"
              disabled={subiendo || !videoFile || !titulo.trim()}
            >
              {subiendo ? 'Subiendo...' : 'Publicar video'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default PublicarVideoPage;