// frontend/src/pages/RepositorioPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Modal } from 'react-bootstrap';
import AppLayout from '../components/layout/AppLayout';

import iconPdf from '../assets/icons/docs/iconPdf.png';
import iconZip from '../assets/icons/docs/iconZip.png';
import iconJs from '../assets/icons/docs/iconJs.png';
import iconJava from '../assets/icons/docs/iconJava.png';
import iconPhp from '../assets/icons/docs/iconPhp.png';
import iconHtml from '../assets/icons/docs/iconHtml.png';
import iconDoc from '../assets/icons/docs/iconDoc.png';
import iconPptx from '../assets/icons/docs/iconPptx.png';
import iconTs from '../assets/icons/docs/iconTs.png';
import iconC from '../assets/icons/docs/iconC.png';
import iconSql from '../assets/icons/docs/iconSql.png';
import iconCsv from '../assets/icons/docs/iconCsv.png';
import iconDocx from '../assets/icons/docs/iconDocx.png';
import iconXlsx from '../assets/icons/docs/iconXslx.png';
import iconTxt from '../assets/icons/docs/iconTxt.png';
import iconCpp from '../assets/icons/docs/iconCpp.png';
import iconPpt from '../assets/icons/docs/iconPpt.png';
import iconCss from '../assets/icons/docs/iconCss.png';
import iconDefault from '../assets/icons/docs/iconDefault.png';

const ICONOS_POR_TIPO = {
  pdf: iconPdf,
  zip: iconZip,
  js: iconJs,
  jsx: iconJs,
  java: iconJava,
  php: iconPhp,
  html: iconHtml,
  css: iconCss,
  doc: iconDoc,
  docx: iconDocx,
  pptx: iconPptx,
  ppt: iconPpt,
  ts: iconTs,
  tsx: iconTs,
  c: iconC,
  cpp: iconCpp,
  sql: iconSql,
  csv: iconCsv,
  xls: iconXlsx,
  xlsx: iconXlsx,
  txt: iconTxt,
  md: iconTxt,
  json: iconJs,
  xml: iconHtml,
};

const getIcono = (tipo) => {
  if (!tipo) return iconDefault;
  return ICONOS_POR_TIPO[tipo.toLowerCase()] || iconDefault;
};

// =============================================
// HELPERS
// =============================================
const formatearFecha = (fecha) => {
  if (!fecha) return '';
  return new Date(fecha).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatearTamaño = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

// =============================================
// COMPONENTE
// =============================================
const RepositorioPage = () => {
  const navigate = useNavigate();

  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Editar
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [docEditar, setDocEditar] = useState(null);
  const [tituloEditar, setTituloEditar] = useState('');
  const [descripcionEditar, setDescripcionEditar] = useState('');
  const [editarLoading, setEditarLoading] = useState(false);
  const [editarError, setEditarError] = useState('');

  // Eliminar
  const [showEliminarModal, setShowEliminarModal] = useState(false);
  const [docEliminar, setDocEliminar] = useState(null);
  const [eliminarLoading, setEliminarLoading] = useState(false);
  const [eliminarError, setEliminarError] = useState('');

  const token = localStorage.getItem('token');

  // Cargar documentos
  useEffect(() => {
    const fetchDocumentos = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch('/api/repositorio/mis-documentos', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error al cargar tus documentos');
        }

        setDocumentos(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentos();
  }, [token]);

  // Editar
  const abrirEditar = (doc) => {
    setDocEditar(doc);
    setTituloEditar(doc.titulo);
    setDescripcionEditar(doc.descripcion || '');
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
      const response = await fetch(`/api/repositorio/${docEditar.id}`, {
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
        throw new Error(data.error || 'Error al actualizar el documento');
      }

      setDocumentos((prev) =>
        prev.map((d) =>
          d.id === docEditar.id
            ? {
                ...d,
                titulo: tituloEditar.trim(),
                descripcion: descripcionEditar.trim(),
              }
            : d
        )
      );

      setShowEditarModal(false);
      setDocEditar(null);
    } catch (err) {
      setEditarError(err.message);
    } finally {
      setEditarLoading(false);
    }
  };

  // Eliminar
  const abrirEliminar = (doc) => {
    setDocEliminar(doc);
    setEliminarError('');
    setShowEliminarModal(true);
  };

  const handleEliminarDocumento = async () => {
    setEliminarLoading(true);
    setEliminarError('');

    try {
      const response = await fetch(`/api/repositorio/${docEliminar.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar el documento');
      }

      setDocumentos((prev) => prev.filter((d) => d.id !== docEliminar.id));
      setShowEliminarModal(false);
      setDocEliminar(null);
    } catch (err) {
      setEliminarError(err.message);
    } finally {
      setEliminarLoading(false);
    }
  };

  // Descargar
  const handleDescargar = async (doc) => {
    try {
      const response = await fetch(`/api/repositorio/${doc.id}/descargar`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al descargar');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.titulo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setDocumentos((prev) =>
        prev.map((d) =>
          d.id === doc.id ? { ...d, descargas: (d.descargas || 0) + 1 } : d
        )
      );
    } catch (err) {
      setError(err.message);
    }
  };

  // =============================================
  // RENDER
  // =============================================
  return (
    <AppLayout>
      {/* CABECERA */}
      <div className="repositorio-header">
        <div>
          <h1 className="repositorio-title">Mi repositorio</h1>
          <p className="repositorio-subtitle">
            Administra los documentos que has subido
            {documentos.length > 0 && (
              <>
                {' · '}
                <strong>{documentos.length}</strong>{' '}
                {documentos.length === 1 ? 'documento' : 'documentos'}
              </>
            )}
          </p>
        </div>

        <Button
          className="hero-btn-primary repositorio-btn-publicar"
          onClick={() => navigate('/repositorio/subir')}
        >
          <span className="repositorio-btn-icon">+</span>
          Subir archivo
        </Button>
      </div>

      {/* ESTADOS */}
      {loading && (
        <div className="feed-loading">
          <div className="spinner"></div>
          <p>Cargando tus documentos...</p>
        </div>
      )}

      {error && (
        <div className="feed-error">
          <p>{error}</p>
        </div>
      )}

      {/* SIN DOCUMENTOS */}
      {!loading && !error && documentos.length === 0 && (
        <div className="repositorio-vacio">
          <div className="repositorio-vacio-icon"></div>
          <h2>Aún no has subido documentos</h2>
          <p>
            Comparte apuntes, presentaciones y material de estudio con la comunidad.
          </p>
          <Button
            className="hero-btn-primary"
            onClick={() => navigate('/repositorio/subir')}
          >
            Subir mi primer archivo
          </Button>
        </div>
      )}

      {/* GRID DE DOCUMENTOS */}
      {!loading && !error && documentos.length > 0 && (
        <div className="docs-grid">
          {documentos.map((doc) => (
            <div key={doc.id} className="doc-card">
              <div className="doc-icon-wrapper">
                <img
                  src={getIcono(doc.tipo_archivo)}
                  alt={doc.tipo_archivo}
                  className="doc-icon-img"
                />
              </div>

              <div className="doc-info">
                <h3 className="doc-titulo">{doc.titulo}</h3>
                {doc.descripcion && (
                  <p className="doc-descripcion">{doc.descripcion}</p>
                )}
                <p className="doc-stats">
                  {formatearTamaño(doc.tamaño_bytes)} · {doc.descargas || 0} descargas ·{' '}
                  {formatearFecha(doc.created_at)}
                </p>
              </div>

              <div className="doc-acciones">
                <button
                  className="doc-btn doc-btn-descargar"
                  onClick={() => handleDescargar(doc)}
                >
                  Descargar
                </button>
                <button
                  className="doc-btn doc-btn-editar"
                  onClick={() => abrirEditar(doc)}
                >
                  Editar
                </button>
                <button
                  className="doc-btn doc-btn-eliminar"
                  onClick={() => abrirEliminar(doc)}
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
          setDocEditar(null);
          setEditarError('');
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ color: '#1a237e' }}>Editar documento</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Título</Form.Label>
            <Form.Control
              type="text"
              value={tituloEditar}
              onChange={(e) => setTituloEditar(e.target.value)}
              maxLength={200}
              disabled={editarLoading}
            />
            <small className="config-hint">{tituloEditar.length}/200</small>
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
              setDocEditar(null);
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
          setDocEliminar(null);
          setEliminarError('');
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ color: '#c0392b' }}>
            ¿Eliminar este documento?
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Estás a punto de eliminar:</p>
          <p style={{ fontWeight: 600, color: '#1a237e' }}>
            "{docEliminar?.titulo}"
          </p>
          <p>
            Esta acción <strong>no se puede deshacer</strong>. El documento será
            eliminado permanentemente.
          </p>
          {eliminarError && <p className="config-error">{eliminarError}</p>}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setShowEliminarModal(false);
              setDocEliminar(null);
            }}
            disabled={eliminarLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleEliminarDocumento}
            disabled={eliminarLoading}
          >
            {eliminarLoading ? 'Eliminando...' : 'Eliminar documento'}
          </Button>
        </Modal.Footer>
      </Modal>
    </AppLayout>
  );
};

export default RepositorioPage;