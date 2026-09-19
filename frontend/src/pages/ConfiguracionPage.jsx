// frontend/src/pages/ConfiguracionPage.jsx
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Modal } from 'react-bootstrap';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import AnimatedTabs from '../components/common/AnimatedTabs';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

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

const ConfiguracionPage = () => {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('perfil'); // perfil | password | cuenta

  // ===== ESTADOS DE AVATAR =====
  const fileInputRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarExito, setAvatarExito] = useState('');

  // ===== ESTADOS DE BIO =====
  const [bio, setBio] = useState(user?.bio || '');
  const [bioLoading, setBioLoading] = useState(false);
  const [bioError, setBioError] = useState('');
  const [bioExito, setBioExito] = useState('');

  // ===== ESTADOS DE CONTRASEÑA =====
  const [password_actual, setPasswordActual] = useState('');
  const [nueva_password, setPasswordNueva] = useState('');
  const [confirm_password, setPasswordConfirm] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordExito, setPasswordExito] = useState('');

  // ===== ESTADOS DE ELIMINAR CUENTA =====
  const [showEliminarModal, setShowEliminarModal] = useState(false);
  const [confirmacionTexto, setConfirmacionTexto] = useState('');
  const [eliminarLoading, setEliminarLoading] = useState(false);
  const [eliminarError, setEliminarError] = useState('');

  const token = localStorage.getItem('token');

  // =============================================
  // AVATAR
  // =============================================

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError('');
    setAvatarExito('');

    if (!file.type.startsWith('image/')) {
      setAvatarError('El archivo debe ser una imagen (JPG, PNG, etc.).');
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError(`La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. El límite es 5 MB.`);
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleSubirAvatar = async () => {
    if (!avatarFile) {
      setAvatarError('Selecciona una imagen primero.');
      return;
    }

    setAvatarLoading(true);
    setAvatarError('');
    setAvatarExito('');

    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      const response = await fetch('/api/usuarios/perfil/avatar', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al subir el avatar');
      }

      // Actualizar el usuario en el contexto
      const usuarioActualizado = { ...user, avatar_url: data.avatar_url };
      login(usuarioActualizado, token);

      setAvatarExito('¡Avatar actualizado correctamente!');
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (err) {
      setAvatarError(err.message);
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleCancelarAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarError('');
    setAvatarExito('');
  };

  // =============================================
  // BIOGRAFÍA
  // =============================================

  const handleGuardarBio = async (e) => {
    e.preventDefault();
    setBioLoading(true);
    setBioError('');
    setBioExito('');

    try {
      const response = await fetch('/api/usuarios/perfil/bio', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bio }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar la biografía');
      }

      const usuarioActualizado = { ...user, bio };
      login(usuarioActualizado, token);

      setBioExito('Biografía actualizada correctamente.');
    } catch (err) {
      setBioError(err.message);
    } finally {
      setBioLoading(false);
    }
  };

  // =============================================
  // CONTRASEÑA
  // =============================================

  const handleCambiarPassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordExito('');

    if (!password_actual || !nueva_password || !confirm_password) {
      setPasswordError('Completa todos los campos.');
      return;
    }

    if (!PASSWORD_REGEX.test(nueva_password)) {
      setPasswordError('La nueva contraseña debe tener mínimo 8 caracteres, con mayúsculas, minúsculas, números y un carácter especial.');
      return;
    }

    if (nueva_password !== confirm_password) {
      setPasswordError('Las contraseñas nuevas no coinciden.');
      return;
    }

    if (password_actual === nueva_password) {
      setPasswordError('La nueva contraseña debe ser diferente a la actual.');
      return;
    }

    setPasswordLoading(true);

    try {
      const response = await fetch('/api/usuarios/perfil/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          password_actual,
          nueva_password,
          confirm_password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cambiar la contraseña');
      }

      setPasswordExito('Contraseña actualizada correctamente.');
      setPasswordActual('');
      setPasswordNueva('');
      setPasswordConfirm('');
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  // =============================================
  // ELIMINAR CUENTA
  // =============================================

  const handleEliminarCuenta = async () => {
    if (confirmacionTexto !== 'ELIMINAR') {
      setEliminarError('Escribe exactamente "ELIMINAR" para confirmar.');
      return;
    }

    setEliminarLoading(true);
    setEliminarError('');

    try {
      const response = await fetch('/api/usuarios/cuenta', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar la cuenta');
      }

      // Cerrar sesión y redirigir
      logout();
      navigate('/');
    } catch (err) {
      setEliminarError(err.message);
      setEliminarLoading(false);
    }
  };

  // =============================================
  // RENDER
  // =============================================

  const tieneAvatar = user?.avatar_url;

  const tabs = [
    { value: 'perfil', label: 'Perfil' },
    { value: 'password', label: 'Contraseña' },
    { value: 'cuenta', label: 'Cuenta' },
  ];

  return (
    <AppLayout>
      <div className="config-container">
        <h1 className="config-title">Configuración</h1>
        <p className="config-subtitle">Administra tu cuenta y preferencias</p>

        {/* ===== TABS ANIMADOS ===== */}
        <AnimatedTabs
          tabs={tabs}
          activeTab={tab}
          onTabChange={setTab}
        >
          {/* ===== TAB: PERFIL ===== */}
          {tab === 'perfil' && (
            <div className="config-section">
              {/* Avatar */}
              <div className="config-card">
                <h2 className="config-card-title">Foto de perfil</h2>
                <p className="config-card-desc">
                  Esta imagen será visible para otros usuarios.
                </p>

                <div className="config-avatar-row">
                  <div className="config-avatar-preview">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Vista previa"
                        className="config-avatar-img"
                      />
                    ) : tieneAvatar ? (
                      <img
                        src={user.avatar_url}
                        alt={user.nombre_usuario || user.nombre}
                        className="config-avatar-img"
                      />
                    ) : (
                      <div
                        className="config-avatar-img config-avatar-initials"
                        style={{ backgroundColor: getColorAvatar(user?.nombre_usuario || user?.nombre) }}
                      >
                        {getIniciales(user?.nombre_usuario || user?.nombre)}
                      </div>
                    )}
                  </div>

                  <div className="config-avatar-actions">
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleAvatarChange}
                      style={{ display: 'none' }}
                    />
                    <Button
                      variant="outline-primary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarLoading}
                    >
                      Seleccionar imagen
                    </Button>

                    {avatarFile && (
                      <>
                        <Button
                          className="hero-btn-primary"
                          onClick={handleSubirAvatar}
                          disabled={avatarLoading}
                        >
                          {avatarLoading ? 'Subiendo...' : 'Guardar avatar'}
                        </Button>
                        <Button
                          variant="outline-secondary"
                          onClick={handleCancelarAvatar}
                          disabled={avatarLoading}
                        >
                          Cancelar
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <small className="config-hint">
                  Formatos: JPG, PNG. Tamaño máximo: 5 MB.
                </small>

                {avatarError && <p className="config-error">{avatarError}</p>}
                {avatarExito && <p className="config-exito">{avatarExito}</p>}
              </div>

              {/* Biografía */}
              <div className="config-card">
                <h2 className="config-card-title">Biografía</h2>
                <p className="config-card-desc">
                  Cuéntale a otros usuarios sobre ti. Máximo 200 caracteres.
                </p>

                <Form onSubmit={handleGuardarBio}>
                  <Form.Group className="mb-3">
                    <Form.Control
                      as="textarea"
                      rows={4}
                      maxLength={200}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Ej: Estudiante de ESCOM de ISC, apasionado por el desarrollo web..."
                      disabled={bioLoading}
                    />
                    <small className="config-hint">
                      {bio.length}/200 caracteres
                    </small>
                  </Form.Group>

                  {bioError && <p className="config-error">{bioError}</p>}
                  {bioExito && <p className="config-exito">{bioExito}</p>}

                  <Button
                    type="submit"
                    className="hero-btn-primary"
                    disabled={bioLoading || bio === (user?.bio || '')}
                  >
                    {bioLoading ? 'Guardando...' : 'Guardar biografía'}
                  </Button>
                </Form>
              </div>
            </div>
          )}

          {/* ===== TAB: CONTRASEÑA ===== */}
          {tab === 'password' && (
            <div className="config-section">
              <div className="config-card">
                <h2 className="config-card-title">Cambiar contraseña</h2>
                <p className="config-card-desc">
                  Por seguridad, te recomendamos cambiar tu contraseña periódicamente.
                </p>

                <Form onSubmit={handleCambiarPassword}>
                  <Form.Group className="mb-3">
                    <Form.Label>Contraseña actual</Form.Label>
                    <Form.Control
                      type="password"
                      value={password_actual}
                      onChange={(e) => setPasswordActual(e.target.value)}
                      disabled={passwordLoading}
                      placeholder="Ingresa tu contraseña actual"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Nueva contraseña</Form.Label>
                    <Form.Control
                      type="password"
                      value={nueva_password}
                      onChange={(e) => setPasswordNueva(e.target.value)}
                      disabled={passwordLoading}
                      placeholder="Mínimo 8 caracteres"
                    />
                    <small className="config-hint">
                      Mínimo 8 caracteres, con mayúsculas, minúsculas, números y un carácter especial.
                    </small>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Confirmar nueva contraseña</Form.Label>
                    <Form.Control
                      type="password"
                      value={confirm_password}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      disabled={passwordLoading}
                      placeholder="Repite tu nueva contraseña"
                    />
                  </Form.Group>

                  {passwordError && <p className="config-error">{passwordError}</p>}
                  {passwordExito && <p className="config-exito">{passwordExito}</p>}

                  <Button
                    type="submit"
                    className="hero-btn-primary"
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? 'Cambiando...' : 'Cambiar contraseña'}
                  </Button>
                </Form>
              </div>
            </div>
          )}

          {/* ===== TAB: CUENTA ===== */}
          {tab === 'cuenta' && (
            <div className="config-section">
              <div className="config-card config-card-danger">
                <h2 className="config-card-title">Eliminar cuenta</h2>
                <p className="config-card-desc">
                  Esta acción es <strong>permanente</strong>. Se eliminarán todos tus datos:
                  videos, materiales, comentarios, mensajes y tu perfil.
                </p>

                <Button
                  variant="danger"
                  onClick={() => setShowEliminarModal(true)}
                >
                  Eliminar mi cuenta
                </Button>
              </div>
            </div>
          )}
        </AnimatedTabs>
      </div>

      {/* ===== MODAL DE CONFIRMACIÓN ===== */}
      <Modal
        show={showEliminarModal}
        onHide={() => {
          setShowEliminarModal(false);
          setConfirmacionTexto('');
          setEliminarError('');
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ color: '#c0392b' }}>
            ¿Eliminar tu cuenta?
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Esta acción <strong>no se puede deshacer</strong>. Todos tus datos
            serán eliminados permanentemente.
          </p>
          <p>
            Escribe <strong>ELIMINAR</strong> para confirmar:
          </p>
          <Form.Control
            type="text"
            value={confirmacionTexto}
            onChange={(e) => setConfirmacionTexto(e.target.value)}
            placeholder="ELIMINAR"
            disabled={eliminarLoading}
          />
          {eliminarError && <p className="config-error mt-2">{eliminarError}</p>}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setShowEliminarModal(false);
              setConfirmacionTexto('');
              setEliminarError('');
            }}
            disabled={eliminarLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleEliminarCuenta}
            disabled={eliminarLoading || confirmacionTexto !== 'ELIMINAR'}
          >
            {eliminarLoading ? 'Eliminando...' : 'Eliminar cuenta'}
          </Button>
        </Modal.Footer>
      </Modal>
    </AppLayout>
  );
};

export default ConfiguracionPage;