import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { motion } from 'motion/react';
import iconMensaje from '../assets/icons/iconMensaje.png';

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

const formatearHora = (fecha) => {
  if (!fecha) return '';
  const date = new Date(fecha);
  const ahora = new Date();
  const dif = ahora - date;
  const dias = Math.floor(dif / 86400000);

  if (dias === 0) {
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }
  if (dias === 1) return 'Ayer';
  if (dias < 7) return date.toLocaleDateString('es-MX', { weekday: 'short' });
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
};

const formatearHoraMensaje = (fecha) => {
  if (!fecha) return '';
  return new Date(fecha).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

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
  // CARGAR MENSAJES DEL CHAT ACTIVO
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
  // SCROLL AL FINAL
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
      console.error('Error al enviar mensaje:', data.error);
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

    const roomId = [user.boleta, chatActivo.otro_usuario.boleta]
      .sort()
      .join('-');

    socket.emit('send-private-message', {
      emisorId: user.boleta,
      receptorId: chatActivo.otro_usuario.boleta,
      contenido: nuevoMensaje.trim(),
      roomId,
    });

    setNuevoMensaje('');
  };

  // =============================================
  // SELECCIONAR CHAT
  // =============================================
  const handleSeleccionarChat = (chat) => {
    setChatActivo(chat);
    setUsuarioEscribiendo(false);
  };

  // =============================================
  // RENDER
  // =============================================
  return (
    <AppLayout>
      <div className="chats-container">

        {/* ✅ Banner de error */}
        {error && (
          <div className="chats-error-banner">
            <span>⚠️ {error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        )}

        {/* LISTA */}
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
                <button
                  key={chat.id}
                  className={`chat-item ${
                    chatActivo?.id === chat.id ? 'activo' : ''
                  }`}
                  onClick={() => handleSeleccionarChat(chat)}
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
                        style={{
                          backgroundColor: getColorAvatar(
                            chat.otro_usuario.nombre
                          ),
                        }}
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
                      <h3 className="chat-item-nombre">
                        {chat.otro_usuario.nombre}
                      </h3>
                      <span className="chat-item-hora">
                        {formatearHora(chat.ultima_fecha)}
                      </span>
                    </div>
                    <p className="chat-item-ultimo">{chat.ultimo_mensaje}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* CONVERSACIÓN */}
        <section className="chats-conversacion">
          {!chatActivo ? (
            <div className="chats-sin-seleccion">
              <motion.img
              src={iconMensaje}
              alt="Chat"
              className="Chats-sin-seleccion-icon"
              animate={{
                y:[0,-10,0],
                scale:[1,1.05,1],
              }}
              transition={{
                duration: 2.5,
                repetat: Infinity,
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
                    style={{
                      backgroundColor: getColorAvatar(
                        chatActivo.otro_usuario.nombre
                      ),
                    }}
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
                        <div className="chat-mensaje-burbuja">
                          <p className="chat-mensaje-texto">{msg.contenido}</p>
                          <span className="chat-mensaje-hora">
                            {formatearHoraMensaje(msg.created_at)}
                            {esMio && (
                              <span className="chat-mensaje-check">
                                {msg.leido ? '✓✓' : '✓'}
                              </span>
                            )}
                          </span>
                        </div>
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
                <button
                  type="submit"
                  disabled={!nuevoMensaje.trim()}
                  aria-label="Enviar mensaje"
                >
                  ➤
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </AppLayout>
  );
};

export default ChatsPage;