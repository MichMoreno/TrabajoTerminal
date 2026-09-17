// frontend/src/pages/SubirDocumentoPage.jsx
import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Form } from 'react-bootstrap';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import docsIcon from '../assets/icons/docsIcon.png';

// Limites para los archivos
const LIMITES_POR_TIPO = {
  pdf: 10,
  doc: 5, docx: 5,
  ppt: 10, pptx: 10,
  xls: 5, xlsx: 5,
  txt: 1, md: 1, csv: 5,
  zip: 20, rar: 20, '7z': 20,
  js: 1, jsx: 1, ts: 1, tsx: 1,
  py: 1, java: 1, c: 1, cpp: 1, h: 1, cs: 1,
  php: 1, rb: 1, go: 1, rs: 1, swift: 1, kt: 1,
  sql: 1, sh: 1, html: 1, css: 1, json: 1, xml: 1,
};

const LIMITE_DEFAULT = 10;

const TIPOS_PERMITIDOS = Object.keys(LIMITES_POR_TIPO);
const ACCEPT_STRING = TIPOS_PERMITIDOS.map((ext) => `.${ext}`).join(',');

// =============================================
// HELPERS
// =============================================
const formatearTamaño = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const validarTamaño = (file) => {
  const extension = file.name.split('.').pop().toLowerCase();
  const limiteMB = LIMITES_POR_TIPO[extension] || LIMITE_DEFAULT;
  const limiteBytes = limiteMB * 1024 * 1024;

  if (file.size > limiteBytes) {
    return {
      valido: false,
      error: `El archivo pesa ${formatearTamaño(file.size)}. Para archivos .${extension} el límite es ${limiteMB} MB.`,
      limiteMB,
    };
  }

  return { valido: true, limiteMB };
};

// =============================================
// COMPONENTE
// =============================================
const SubirDocumentoPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [archivo, setArchivo] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const [colaboradores, setColaboradores] = useState([]);
  const [nuevoColaborador, setNuevoColaborador] = useState('');
  const [buscandoColaborador, setBuscandoColaborador] = useState(false);
  const [errorColaborador, setErrorColaborador] = useState('');

  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(null);

  const token = localStorage.getItem('token');

  // =============================================
  // SELECCIONAR ARCHIVO
  // =============================================
  const handleArchivoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    const extension = file.name.split('.').pop().toLowerCase();

    if (!TIPOS_PERMITIDOS.includes(extension)) {
      setError(
        `Tipo de archivo no permitido. Permitidos: ${TIPOS_PERMITIDOS.join(', ')}`
      );
      return;
    }

    const resultado = validarTamaño(file);

    if (!resultado.valido) {
      setError(resultado.error);
      return;
    }

    setArchivo(file);

    if (!titulo) {
      setTitulo(file.name.replace(/\.[^/.]+$/, ''));
    }

    e.target.value = '';
  };

  const handleQuitarArchivo = () => {
    setArchivo(null);
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
    if (miNombre && nombre.toLowerCase() === miNombre.toLowerCase()) {
      setErrorColaborador('No puedes agregarte a ti mismo como colaborador.');
      return;
    }

    if (
      colaboradores.some(
        (c) => c.nombre_usuario.toLowerCase() === nombre.toLowerCase()
      )
    ) {
      setErrorColaborador('Este usuario ya está en la lista.');
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

      if (encontrado.boleta === user?.boleta) {
        setErrorColaborador('No puedes agregarte a ti mismo como colaborador.');
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
    setColaboradores((prev) =>
      prev.filter((c) => c.nombre_usuario !== nombre_usuario)
    );
  };

  // =============================================
  // SUBIR
  // =============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setExito(null);

    if (!archivo) {
      setError('Selecciona un archivo primero.');
      return;
    }

    if (!titulo.trim()) {
      setError('El título es obligatorio.');
      return;
    }

    setSubiendo(true);
    setProgreso(0);

    try {
      const formData = new FormData();
      formData.append('archivo', archivo);
      formData.append('titulo', titulo.trim());
      formData.append('descripcion', descripcion.trim());

      if (colaboradores.length > 0) {
        formData.append(
          'colaboradores',
          JSON.stringify(colaboradores.map((c) => c.nombre_usuario))
        );
      }

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
              reject(new Error(err.error || 'Error al subir el archivo'));
            } catch {
              reject(new Error('Error al subir el archivo'));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Error de conexión al subir el archivo'));
        });

        xhr.open('POST', '/api/repositorio');
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
          <h1>¡Documento subido!</h1>
          <p>
            Tu archivo <strong>"{exito.material?.titulo}"</strong> se ha subido
            correctamente.
          </p>

          {exito.colaboradores_registrados > 0 && (
            <p style={{ color: '#2e7d32' }}>
              ✅ {exito.colaboradores_registrados} colaborador(es) registrado(s)
            </p>
          )}

          <div className="publicar-exito-acciones">
            <Button
              className="hero-btn-primary"
              onClick={() => navigate('/repositorio')}
            >
              Ver mi repositorio
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => {
                setExito(null);
                setArchivo(null);
                setTitulo('');
                setDescripcion('');
                setColaboradores([]);
                setProgreso(0);
              }}
            >
              Subir otro archivo
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
          <Link to="/repositorio" className="publicar-back-link">
            ← Volver a Mi repositorio
          </Link>
          <h1 className="publicar-title">Subir archivo</h1>
          <p className="publicar-subtitle">
            Comparte material de estudio con la comunidad
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* PASO 1: ARCHIVO */}
          <div className="publicar-card">
            <div className="publicar-step-header">
              <span className="publicar-step-number">1</span>
              <h2 className="publicar-step-title">Selecciona tu archivo</h2>
            </div>

            {!archivo ? (
              <div
                className="publicar-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <img
                    src={docsIcon}
                    alt="Subir archivo"
                    className="publicar-dropzone-icon"
                />
                <p className="publicar-dropzone-text">
                  <strong>Haz clic para seleccionar</strong> o arrastra tu archivo aquí
                </p>
                <p className="publicar-dropzone-hint">
                  PDF, ZIP, DOC, PPT, XLS, código (.js, .py, .java, etc.) · Máximo
                  según el tipo · Hasta 20 MB
                </p>
              </div>
            ) : (
              <div className="publicar-video-preview">
                <div className="publicar-video-info">
                  <div>
                    <p className="publicar-video-name">
                      <strong>{archivo.name}</strong>
                    </p>
                    <p className="publicar-video-meta">
                      {formatearTamaño(archivo.size)}
                    </p>
                  </div>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    type="button"
                    onClick={handleQuitarArchivo}
                    disabled={subiendo}
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleArchivoChange}
              accept={ACCEPT_STRING}
              style={{ display: 'none' }}
              disabled={subiendo}
            />
          </div>

          {/* PASO 2: DATOS */}
          <div className="publicar-card">
            <div className="publicar-step-header">
              <span className="publicar-step-number">2</span>
              <h2 className="publicar-step-title">Detalles del documento</h2>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Título *</Form.Label>
              <Form.Control
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={200}
                placeholder="Ej: Apuntes de casos de uso"
                disabled={subiendo}
              />
              <small className="publicar-hint">{titulo.length}/200 caracteres</small>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Descripción</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                maxLength={200}
                placeholder="Describe el contenido del documento..."
                disabled={subiendo}
              />
              <small className="publicar-hint">
                {descripcion.length}/200 caracteres
              </small>
            </Form.Group>
          </div>

          {/* PASO 3: COLABORADORES */}
          <div className="publicar-card">
            <div className="publicar-step-header">
              <span className="publicar-step-number">3</span>
              <h2 className="publicar-step-title">Colaboradores (opcional)</h2>
            </div>
            <p className="publicar-hint mb-3">
              Agrega a los usuarios que participaron en el documento. Aparecerán
              como coautores.
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

            {errorColaborador && (
              <p className="publicar-error-inline">{errorColaborador}</p>
            )}
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
                    ? 'Procesando archivo...'
                    : `Subiendo archivo... ${progreso}%`}
                </span>
              </div>
              <div className="publicar-progreso-bar">
                <div
                  className="publicar-progreso-fill"
                  style={{ width: `${Math.min(progreso, 100)}%` }}
                />
              </div>
              <p className="publicar-progreso-hint">
                {progreso >= 100
                  ? 'Esto puede tomar unos segundos. No cierres esta ventana.'
                  : 'No cierres esta ventana mientras se sube el archivo.'}
              </p>
            </div>
          )}

          {/* BOTONES */}
          <div className="publicar-acciones">
            <Button
              variant="outline-secondary"
              type="button"
              onClick={() => navigate('/repositorio')}
              disabled={subiendo}
            >
              Cancelar
            </Button>
            <Button
              className="hero-btn-primary"
              type="submit"
              disabled={subiendo || !archivo || !titulo.trim()}
            >
              {subiendo ? 'Subiendo...' : 'Subir archivo'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default SubirDocumentoPage;