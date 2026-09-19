import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Modal, Button, Form } from 'react-bootstrap';
import { ContextMenu } from '@base-ui/react/context-menu';
import { motion } from 'motion/react';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import iconMensaje from '../assets/icons/iconMensaje.png';

// Helpers
const getIniciales = (nombre) => {
  if (!nombre) return '?';
  const palabras = nombre.trim().split(' ').filter(Boolean);
  if (palabras.length === 0) return '?';
  if (palabras.length === 1) return palabras[0].charAt(0).toUpperCase();
  return (palabras[0].charAt(0) + palabras[palabras.length - 1].charAt(0)).toUpperCase();
};

const getColorAvatar = (nombre) => {
  if (!nombre) return '#b45f52';
  const colores = ['#b45f52', '#4a6fa5', '#6a8e5f', '#a5844a', '#7d5ba6', '#c06c84', '#4a8e8e', '#8e6a4a'];
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colores[Math.abs(hash) % colores.length];
};

const formatearHora = (fecha) => {
  if (!fecha) return '';
  
  let fechaISO = fecha;
  if (!fecha.endsWith('Z') && !fecha.includes('+') && !fecha.includes('-', 10)) {
    fechaISO = fecha + 'Z';
  }
  
  const date = new Date(fechaISO);
  const ahora = new Date();
  const dif = ahora - date;
  const dias = Math.floor(dif / 86400000);

  if (dias === 0) {
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Mexico_City',
    });
  }
  if (dias === 1) return 'Ayer';
  if (dias < 7) {
    return date.toLocaleDateString('es-MX', {
      weekday: 'short',
      timeZone: 'America/Mexico_City',
    });
  }
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Mexico_City',
  });
};

const formatearHoraMensaje = (fecha) => {
  if (!fecha) return '';
  
  let fechaISO = fecha;
  if (!fecha.endsWith('Z') && !fecha.includes('+') && !fecha.includes('-', 10)) {
    fechaISO = fecha + 'Z';
  }
  
  return new Date(fechaISO).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Mexico_City',
  });
};

// =============================================
// COMPONENTE
// =============================================
const ChatsPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();

  const [chats, setChats] = useState([]);
  const [chatActivo, setChatActivo] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMensajes, setLoadingMensajes] = useState(false);
  const [error, setError] = useState('');
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [usuarioEscribiendo, setUsuarioEscribiendo] = useState(false);

  // Modales
  const [showEliminarChatModal, setShowEliminarChatModal] = useState(false);
  const [chatEliminar, setChatEliminar] = useState(null);
  const [eliminarChatLoading, setEliminarChatLoading] = useState(false);

  const [showEditarMensajeModal, setShowEditarMensajeModal] = useState(false);
  const [mensajeEditar, setMensajeEditar] = useState(null);
  const [contenidoEditar, setContenidoEditar] = useState('');
  const [editarMensajeLoading, setEditarMensajeLoading] = useState(false);
  const [editarMensajeError, setEditarMensajeError] = useState('');

  const [showEliminarMensajeModal, setShowEliminarMensajeModal] = useState(false);
  const [mensajeEliminar, setMensajeEliminar] = useState(null);
  const [eliminarMensajeLoading, setEliminarMensajeLoading] = useState(false);

  const mensajesEndRef = useRef(null);
  const token = localStorage.getItem('token');

  // =============================================
  // CARGAR CHATS
  // =============================================
  useEffect(() => {
    const cargarChats = async () => {
      setLoadingChats(true);
      try {
        const response = await fetch('/api/chat', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error al cargar chats');
        setChats(data.chats || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingChats(false);
      }
    };
    cargarChats();
  }, [token]);

  // =============================================
  // ABRIR CHAT DESDE QUERY PARAM
  // =============================================
  useEffect(() => {
    const usuarioId = searchParams.get('usuario');
    if (!usuarioId || !user) return;

    const abrirChatConUsuario = async () => {
      try {
        const response = await fetch(`/api/chat?usuario_id=${usuarioId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error al abrir chat');

        if (data.chats && data.chats.length > 0) {
          const chat = data.chats[0];
          setChatActivo(chat);
          setChats((prev) => {
            const existe = prev.some((c) => c.id === chat.id);
            if (existe) return prev;
            return [chat, ...prev];
          });
          setSearchParams({});
        }
      } catch (err) {
        setError(err.message);
      }
    };
    abrirChatConUsuario();
  }, [searchParams, user, token, setSearchParams]);

  // =============================================
  // CARGAR MENSAJES
  // =============================================
  useEffect(() => {
    if (!chatActivo || !socket) return;

    const cargarMensajes = async () => {
      setLoadingMensajes(true);
      try {
        socket.emit('join-private-room', {
          user1Id: user.boleta,
          user2Id: chatActivo.otro_usuario.boleta,
        });

        const response = await fetch(`/api/chat/${chatActivo.id}/mensajes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error al cargar mensajes');

        setMensajes(data.mensajes || []);

        socket.emit('mark-conversation-read', {
          miBoleta: user.boleta,
          otroUsuarioId: chatActivo.otro_usuario.boleta,
        });

        setChats((prev) =>
          prev.map((c) =>
            c.id === chatActivo.id ? { ...c, no_leidos: 0 } : c
          )
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingMensajes(false);
      }
    };
    cargarMensajes();
  }, [chatActivo, socket, user, token]);

  // =============================================
  // SCROLL AUTOMÁTICO
  // =============================================
  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  // =============================================
  // SOCKET LISTENERS
  // =============================================
  useEffect(() => {
    if (!socket) return;

    const handleNuevoMensaje = (data) => {
      const { mensaje } = data;
      if (chatActivo && mensaje.chat_id === chatActivo.id) {
        setMensajes((prev) => [...prev, mensaje]);
        socket.emit('mark-conversation-read', {
          miBoleta: user.boleta,
          otroUsuarioId: chatActivo.otro_usuario.boleta,
        });
      }
      setChats((prev) =>
        prev.map((c) =>
          c.id === mensaje.chat_id
            ? {
                ...c,
                ultimo_mensaje: mensaje.contenido,
                ultima_fecha: mensaje.created_at,
                no_leidos:
                  chatActivo?.id === mensaje.chat_id
                    ? 0
                    : (c.no_leidos || 0) + 1,
              }
            : c
        )
      );
      setUsuarioEscribiendo(false);
    };

    const handleMessageSent = (data) => {
      if (data.success && data.mensaje) {
        const mensaje = data.mensaje;
        if (chatActivo && mensaje.chat_id === chatActivo.id) {
          setMensajes((prev) => {
            if (prev.some((m) => m.id === mensaje.id)) return prev;
            return [...prev, mensaje];
          });
        }
      }
    };

    const handleMessagesRead = (data) => {
      const { chatId } = data;
      if (chatActivo && chatId === chatActivo.id) {
        setMensajes((prev) => prev.map((m) => ({ ...m, leido: true })));
      }
    };

    const handleMessageError = (data) => {
      setError(data.error);
    };

    socket.on('new-private-message', handleNuevoMensaje);
    socket.on('message-sent', handleMessageSent);
    socket.on('messages-read-update', handleMessagesRead);
    socket.on('message-error', handleMessageError);

    return () => {
      socket.off('new-private-message', handleNuevoMensaje);
      socket.off('message-sent', handleMessageSent);
      socket.off('messages-read-update', handleMessagesRead);
      socket.off('message-error', handleMessageError);
    };
  }, [socket, chatActivo, user]);

  // =============================================
  // ENVIAR MENSAJE
  // =============================================
  const handleEnviarMensaje = (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim() || !chatActivo || !socket) return;

    const roomId = [user.boleta, chatActivo.otro_usuario.boleta].sort().join('-');
    socket.emit('send-private-message', {
      emisorId: user.boleta,
      receptorId: chatActivo.otro_usuario.boleta,
      contenido: nuevoMensaje.trim(),
      roomId,
    });
    setNuevoMensaje('');
  };

  // =============================================
  // ELIMINAR CHAT
  // =============================================
  const handleEliminarChat = async () => {
    if (!chatEliminar) return;
    setEliminarChatLoading(true);
    try {
      const response = await fetch(`/api/chat/${chatEliminar.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al eliminar chat');

      setChats((prev) => prev.filter((c) => c.id !== chatEliminar.id));
      if (chatActivo?.id === chatEliminar.id) {
        setChatActivo(null);
        setMensajes([]);
      }
      setShowEliminarChatModal(false);
      setChatEliminar(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setEliminarChatLoading(false);
    }
  };

  // =============================================
  // EDITAR MENSAJE
  // =============================================
  const handleEditarMensaje = async () => {
    if (!contenidoEditar || contenidoEditar.trim().length === 0) {
      setEditarMensajeError('El mensaje no puede estar vacío.');
      return;
    }

    // Si no cambió, cerrar sin error
    if (contenidoEditar.trim() === mensajeEditar.contenido.trim()) {
      setShowEditarMensajeModal(false);
      setMensajeEditar(null);
      setContenidoEditar('');
      setEditarMensajeError('');
      return;
    }

    setEditarMensajeLoading(true);
    setEditarMensajeError('');

    try {
      const response = await fetch(`/api/chat/mensajes/${mensajeEditar.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contenido: contenidoEditar.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al editar mensaje');

      setMensajes((prev) =>
        prev.map((m) =>
          m.id === mensajeEditar.id
            ? { ...m, contenido: contenidoEditar.trim(), editado: true }
            : m
        )
      );
      setShowEditarMensajeModal(false);
      setMensajeEditar(null);
      setContenidoEditar('');
    } catch (err) {
      setEditarMensajeError(err.message);
    } finally {
      setEditarMensajeLoading(false);
    }
  };

  // =============================================
  // ELIMINAR MENSAJE
  // =============================================
  const handleEliminarMensaje = async () => {
    if (!mensajeEliminar) return;
    setEliminarMensajeLoading(true);
    try {
      const response = await fetch(`/api/chat/mensajes/${mensajeEliminar.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al eliminar mensaje');

      setMensajes((prev) => prev.filter((m) => m.id !== mensajeEliminar.id));
      setShowEliminarMensajeModal(false);
      setMensajeEliminar(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setEliminarMensajeLoading(false);
    }
  };

  // =============================================
  // RENDER
  // =============================================
  return (
    <AppLayout>
      <div className="chats-container">
        {error && (
          <div className="chats-error-banner">
            <span>⚠️ {error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Cerrar">×</button>
          </div>
        )}

        {/* ============================================= */}
        {/* LISTA DE CHATS */}
        {/* ============================================= */}
        <aside className="chats-lista">
          <div className="chats-lista-header">
            <h2>Chats</h2>
          </div>

          {loadingChats && (
            <div className="chats-loading">
              <div className="spinner"></div>
            </div>
          )}

          {!loadingChats && chats.length === 0 && (
            <div className="chats-vacio">
              <p>No tienes conversaciones aún.</p>
              <p className="chats-vacio-hint">
                Busca un usuario y envíale un mensaje para empezar.
              </p>
            </div>
          )}

          {!loadingChats && chats.length > 0 && (
            <div className="chats-lista-items">
              {chats.map((chat) => (
                <ContextMenu.Root key={chat.id}>
                  <ContextMenu.Trigger
                    render={(props) => (
                      <button
                        {...props}
                        className={`chat-item ${chatActivo?.id === chat.id ? 'activo' : ''}`}
                        onClick={() => {
                          setChatActivo(chat);
                          setUsuarioEscribiendo(false);
                        }}
                      >
                        <div className="chat-item-avatar-wrapper">
                          {chat.otro_usuario.avatar_url ? (
                            <img
                              src={chat.otro_usuario.avatar_url}
                              alt={chat.otro_usuario.nombre}
                              className="chat-item-avatar"
                            />
                          ) : (
                            <div
                              className="chat-item-avatar chat-item-avatar-initials"
                              style={{ backgroundColor: getColorAvatar(chat.otro_usuario.nombre) }}
                            >
                              {getIniciales(chat.otro_usuario.nombre)}
                            </div>
                          )}
                          {chat.no_leidos > 0 && (
                            <span className="chat-item-badge">{chat.no_leidos}</span>
                          )}
                        </div>

                        <div className="chat-item-info">
                          <div className="chat-item-top">
                            <h3 className="chat-item-nombre">{chat.otro_usuario.nombre}</h3>
                            <span className="chat-item-hora">{formatearHora(chat.ultima_fecha)}</span>
                          </div>
                          <p className="chat-item-ultimo">{chat.ultimo_mensaje}</p>
                        </div>
                      </button>
                    )}
                  />

                  <ContextMenu.Portal>
                    <ContextMenu.Positioner>
                      <ContextMenu.Popup
                        render={(props) => (
                          <motion.div
                            {...props}
                            className="context-menu-popup"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                          >
                            <ContextMenu.Item
                              className="context-menu-item context-menu-item-danger"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setChatEliminar(chat);
                                setShowEliminarChatModal(true);
                              }}
                            >
                              Eliminar chat
                            </ContextMenu.Item>
                          </motion.div>
                        )}
                      />
                    </ContextMenu.Positioner>
                  </ContextMenu.Portal>
                </ContextMenu.Root>
              ))}
            </div>
          )}
        </aside>

        {/* ============================================= */}
        {/* CONVERSACIÓN */}
        {/* ============================================= */}
        <section className="chats-conversacion">
          {!chatActivo ? (
            <div className="chats-sin-seleccion">
              <motion.img
                src={iconMensaje}
                alt="Chat"
                className="chats-sin-seleccion-icon"
                animate={{
                  y: [0, -12, 0],
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <h2>Selecciona una conversación</h2>
              <p>Elige un chat de la lista para empezar a conversar.</p>
            </div>
          ) : (
            <>
              <header className="chats-conversacion-header">
                {chatActivo.otro_usuario.avatar_url ? (
                  <img
                    src={chatActivo.otro_usuario.avatar_url}
                    alt={chatActivo.otro_usuario.nombre}
                    className="chats-conversacion-avatar"
                  />
                ) : (
                  <div
                    className="chats-conversacion-avatar chats-conversacion-avatar-initials"
                    style={{ backgroundColor: getColorAvatar(chatActivo.otro_usuario.nombre) }}
                  >
                    {getIniciales(chatActivo.otro_usuario.nombre)}
                  </div>
                )}
                <div className="chats-conversacion-info">
                  <h3>{chatActivo.otro_usuario.nombre}</h3>
                  {usuarioEscribiendo && (
                    <span className="chats-escribiendo">Escribiendo...</span>
                  )}
                </div>
              </header>

              <div className="chats-mensajes">
                {loadingMensajes ? (
                  <div className="chats-loading">
                    <div className="spinner"></div>
                  </div>
                ) : mensajes.length === 0 ? (
                  <div className="chats-mensajes-vacio">
                    <p>No hay mensajes aún. ¡Envía el primero!</p>
                  </div>
                ) : (
                  mensajes.map((msg) => {
                    const esMio = msg.emisor_id === user.boleta;
                    return (
                      <div
                        key={msg.id}
                        className={`chat-mensaje ${
                          esMio ? 'chat-mensaje-propio' : 'chat-mensaje-otro'
                        }`}
                      >
                        {esMio ? (
                          <ContextMenu.Root>
                            <ContextMenu.Trigger
                              render={(props) => (
                                <div {...props} className="chat-mensaje-burbuja">
                                  <p className="chat-mensaje-texto">{msg.contenido}</p>
                                  <span className="chat-mensaje-hora">
                                    {msg.editado && (
                                      <span className="chat-mensaje-editado">editado</span>
                                    )}
                                    {formatearHoraMensaje(msg.created_at)}
                                    <span className="chat-mensaje-check">
                                      {msg.leido ? '✓✓' : '✓'}
                                    </span>
                                  </span>
                                </div>
                              )}
                            />

                            <ContextMenu.Portal>
                              <ContextMenu.Positioner>
                                <ContextMenu.Popup
                                  render={(props) => (
                                    <motion.div
                                      {...props}
                                      className="context-menu-popup"
                                      initial={{ opacity: 0, scale: 0.95 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.95 }}
                                      transition={{ duration: 0.15, ease: 'easeOut' }}
                                    >
                                      <ContextMenu.Item
                                        className="context-menu-item"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setMensajeEditar(msg);
                                          setContenidoEditar(msg.contenido);
                                          setEditarMensajeError('');
                                          setShowEditarMensajeModal(true);
                                        }}
                                      >
                                        Editar
                                      </ContextMenu.Item>
                                      <ContextMenu.Item
                                        className="context-menu-item context-menu-item-danger"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setMensajeEliminar(msg);
                                          setShowEliminarMensajeModal(true);
                                        }}
                                      >
                                        Eliminar
                                      </ContextMenu.Item>
                                    </motion.div>
                                  )}
                                />
                              </ContextMenu.Positioner>
                            </ContextMenu.Portal>
                          </ContextMenu.Root>
                        ) : (
                          <div className="chat-mensaje-burbuja">
                            <p className="chat-mensaje-texto">{msg.contenido}</p>
                            <span className="chat-mensaje-hora">
                              {formatearHoraMensaje(msg.created_at)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={mensajesEndRef} />
              </div>

              <form className="chats-input" onSubmit={handleEnviarMensaje}>
                <input
                  type="text"
                  placeholder="Escribe un mensaje..."
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  autoComplete="off"
                />
                <button type="submit" disabled={!nuevoMensaje.trim()} aria-label="Enviar mensaje">
                  ➤
                </button>
              </form>
            </>
          )}
        </section>
      </div>

      {/* ============================================= */}
      {/* MODAL ELIMINAR CHAT */}
      {/* ============================================= */}
      <Modal
        show={showEliminarChatModal}
        onHide={() => {
          setShowEliminarChatModal(false);
          setChatEliminar(null);
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ color: '#c0392b' }}>¿Eliminar esta conversación?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Se eliminará la conversación con <strong>{chatEliminar?.otro_usuario?.nombre}</strong>.</p>
          <p>Todos los mensajes serán eliminados permanentemente. <strong>Esta acción no se puede deshacer.</strong></p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setShowEliminarChatModal(false);
              setChatEliminar(null);
            }}
            disabled={eliminarChatLoading}
          >
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleEliminarChat} disabled={eliminarChatLoading}>
            {eliminarChatLoading ? 'Eliminando...' : 'Eliminar chat'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ============================================= */}
      {/* MODAL EDITAR MENSAJE */}
      {/* ============================================= */}
      <Modal
        show={showEditarMensajeModal}
        onHide={() => {
          setShowEditarMensajeModal(false);
          setMensajeEditar(null);
          setContenidoEditar('');
          setEditarMensajeError('');
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ color: '#1a237e' }}>Editar mensaje</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Control
              as="textarea"
              rows={3}
              value={contenidoEditar}
              onChange={(e) => setContenidoEditar(e.target.value)}
              maxLength={500}
              disabled={editarMensajeLoading}
            />
            <small className="config-hint">{contenidoEditar.length}/500</small>
          </Form.Group>
          {editarMensajeError && <p className="config-error mt-2">{editarMensajeError}</p>}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setShowEditarMensajeModal(false);
              setMensajeEditar(null);
              setContenidoEditar('');
            }}
            disabled={editarMensajeLoading}
          >
            Cancelar
          </Button>
          <Button
            className="hero-btn-primary"
            onClick={handleEditarMensaje}
            disabled={editarMensajeLoading || !contenidoEditar.trim()}
          >
            {editarMensajeLoading ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ============================================= */}
      {/* MODAL ELIMINAR MENSAJE */}
      {/* ============================================= */}
      <Modal
        show={showEliminarMensajeModal}
        onHide={() => {
          setShowEliminarMensajeModal(false);
          setMensajeEliminar(null);
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ color: '#c0392b' }}>¿Eliminar este mensaje?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Se eliminará el mensaje:</p>
          <p style={{ fontWeight: 600, color: '#1a237e' }}>
            "{mensajeEliminar?.contenido}"
          </p>
          <p><strong>Esta acción no se puede deshacer.</strong></p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setShowEliminarMensajeModal(false);
              setMensajeEliminar(null);
            }}
            disabled={eliminarMensajeLoading}
          >
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleEliminarMensaje} disabled={eliminarMensajeLoading}>
            {eliminarMensajeLoading ? 'Eliminando...' : 'Eliminar mensaje'}
          </Button>
        </Modal.Footer>
      </Modal>
    </AppLayout>
  );
};

export default ChatsPage;