const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Importar rutas
const authRoutes = require('./src/routes/authRoutes');
const videoRoutes = require('./src/routes/videoRoutes');
const usuarioRoutes = require('./src/routes/usuarioRoutes');
const resultadoRoutes = require('./src/routes/resultadoRoutes');
const materialRoutes = require('./src/routes/materialRoutes');
const comentarioRoutes = require('./src/routes/comentarioRoutes');
const likeRoutes = require('./src/routes/likeRoutes');
const mensajeRoutes = require('./src/routes/mensajeRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const cuestionarioRoutes = require('./src/routes/cuestionarioRoutes');
const visualizacionRoutes = require('./src/routes/visualizacionRoutes');
const publicacionRoutes = require('./src/routes/publicacionRoutes');
const publicacionDocumentoRoutes = require('./src/routes/publicacionDocumentoRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Server HTTP
const server = http.createServer(app);

server.timeout = 900000; // 15 minutos
server.keepAliveTimeout = 900000;
server.headersTimeout = 900000;

app.use((req, res, next) => {
    req.setTimeout(900000);
    res.setTimeout(900000);
    next();
});

// Configuración de socket.io
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    allowUpgrades: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    allowRequest: (req, callback) => {
        callback(null, true);
    }
});

// Middleware autenticación de socket.io
io.use((socket, next) => {
    // Obtener token
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    console.log('Verificando token de autenticación...');

    if (!token) {
        console.log('No se proporcionó token');
        return next(new Error('Autenticación requerida'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        console.log(`Usuario autenticado: ${decoded.nombre} (${decoded.boleta})`);
        next();
    } catch (error) {
        console.log(`Token inválido: ${error.message}`);
        return next(new Error('Token inválido o expirado'));
    }
});

// Manejo del websocket puro
io.engine.on('connection', (socket) => {
    console.log('Conexión WebSocket pura establecida');
});

// Middlewares de express
app.use(cors({
    origin: "*",
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Hacer que `io` esté disponible en toda la app
app.set('io', io);

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/resultados', resultadoRoutes);
app.use('/api/repositorio', materialRoutes);
app.use('/api/comentarios', comentarioRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/mensajes', mensajeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/cuestionarios', cuestionarioRoutes);
app.use('/api/visualizacion', visualizacionRoutes);
app.use('/api/publicaciones', publicacionRoutes);
app.use('/api/publicaciones/documentos', publicacionDocumentoRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', mensaje: 'Servidor funcionando' });
});

// Configuración de socket.io para el chat
const usuariosConectados = new Map();

io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);
    
    // Registro automático con el usuario ya autenticado
    if (socket.user) {
        const { boleta, nombre } = socket.user;
        usuariosConectados.set(socket.id, { boleta, nombre });
        console.log(`Usuario registrado en el chat: ${nombre} (${boleta})`);
        console.log(`Usuarios conectados: ${usuariosConectados.size}`);
        
        socket.emit('connection-ack', {
            message: 'Conectado al servidor de chat',
            socketId: socket.id,
            usuario: { boleta, nombre }
        });
    } else {
        // Fallback: permitir registro manual
        socket.on('register-user', (data) => {
            console.log('Evento register-user recibido:', data);
            const { boleta, nombre } = data;
            if (boleta && nombre) {
                usuariosConectados.set(socket.id, { boleta, nombre });
                console.log(`Usuario registrado manualmente: ${nombre} (${boleta})`);
                console.log(`Usuarios conectados: ${usuariosConectados.size}`);
                socket.emit('register-ack', { success: true, boleta, nombre });
            } else {
                console.log('Datos incompletos:', data);
                socket.emit('register-ack', { success: false, error: 'Datos incompletos' });
            }
        });
    }

    // Unirse a la sala privad
    socket.on('join-private-room', (data) => {
        console.log('Evento join-private-room recibido:', data);
        const { user1Id, user2Id } = data;
        const roomId = [user1Id, user2Id].sort().join('-');
        socket.join(roomId);
        console.log(`Usuario ${socket.id} unido a sala: ${roomId}`);
        socket.emit('joined-room', { roomId });
    });

    // Enviar mensaje privado
    socket.on('send-private-message', async (data) => {
        console.log('Evento send-private-message recibido:', data);
        const { emisorId, receptorId, contenido, roomId } = data;
        
        try {
            const supabase = require('./src/config/supabase');

            // Validar límite de caracteres (500)
            if (contenido.length > 500){
                console.log(`Mensaje excede los 500 caracteres (${contenido.length})`);
                socket.emit('message-error', {
                    error: 'El mensaje no puede tener más de 500 caracteres'
                });
                return;
            }

            // Validar que no esté vacío
            if (contenido.trim().length === 0){
                console.log('El mensaje no puede estar vacío');
                socket.emit('message-error', {
                    error: 'El mensaje no puede estar vacío'
                });
                return;
            }

            // Verificar que el emisor existe
            const { data: emisorExiste, error: emisorError } = await supabase
                .from('usuarios')
                .select('boleta')
                .eq('boleta', emisorId)
                .single();

            if (emisorError || !emisorExiste) {
                console.log(`El emisor ${emisorId} no existe`);
                socket.emit('message-error', { 
                    error: `El usuario ${emisorId} no está registrado` 
                });
                return;
            }

            // Verificar que el receptor existe
            const { data: receptorExiste, error: receptorError } = await supabase
                .from('usuarios')
                .select('boleta')
                .eq('boleta', receptorId)
                .single();

            if (receptorError || !receptorExiste) {
                console.log(`El receptor ${receptorId} no existe`);
                socket.emit('message-error', { 
                    error: `El usuario ${receptorId} no está registrado` 
                });
                return;
            }

            console.log(`Ambos usuarios existen: ${emisorId} y ${receptorId}`);

            // Buscar o crear el chat
            let { data: chatExistente, error: chatError } = await supabase
                .from('chat')
                .select('id')
                .or(`usuario1_id.eq.${emisorId},usuario2_id.eq.${emisorId}`)
                .or(`usuario1_id.eq.${receptorId},usuario2_id.eq.${receptorId}`)
                .maybeSingle();

            if (chatError) {
                console.error('Error al buscar chat:', chatError);
                socket.emit('message-error', { error: 'Error al buscar conversación' });
                return;
            }

            let chatId = chatExistente?.id;

            if (!chatId) {
                const { data: nuevoChat, error: createError } = await supabase
                    .from('chat')
                    .insert({
                        usuario1_id: emisorId,
                        usuario2_id: receptorId
                    })
                    .select('id')
                    .single();

                if (createError) {
                    console.error('Error al crear chat:', createError);
                    socket.emit('message-error', { error: 'Error al crear conversación' });
                    return;
                }

                chatId = nuevoChat.id;
                console.log(`Chat creado: ${chatId} entre ${emisorId} y ${receptorId}`);
            }

            // Guardar mensaje
            const { data: nuevoMensaje, error } = await supabase
                .from('mensajes_privados')
                .insert({
                    chat_id: chatId,
                    emisor_id: emisorId,
                    contenido: contenido,
                    leido: false
                })
                .select('*')
                .single();

            if (error) {
                console.error('Error al guardar mensaje:', error);
                socket.emit('message-error', { error: 'No se pudo guardar el mensaje' });
                return;
            }

            console.log(`Mensaje de ${emisorId} para ${receptorId}: ${contenido}`);

            // Retransmitir a la sala
            io.to(roomId).emit('new-private-message', {
                mensaje: nuevoMensaje,
                emisor: { boleta: emisorId }
            });

            console.log(`Mensaje enviado a sala ${roomId}`);

            socket.emit('message-sent', { 
                success: true, 
                mensaje: nuevoMensaje 
            });

        } catch (error) {
            console.error('Error en send-private-message:', error);
            socket.emit('message-error', { error: 'Error al procesar el mensaje' });
        }
    });

    // Obtener mensajes no leídos
    socket.on('get-unread-messages', async (data) => {
        console.log('Evento get-unread-messages recibido:', data);
        const { boleta } = data;
        try {
            const supabase = require('./src/config/supabase');
            
            const { data: chats, error: chatError } = await supabase
                .from('chat')
                .select('id')
                .or(`usuario1_id.eq.${boleta},usuario2_id.eq.${boleta}`);

            if (chatError) {
                console.error('Error al obtener chats:', chatError);
                return;
            }

            const chatIds = chats.map(c => c.id);

            if (chatIds.length === 0) {
                console.log(`📭 Usuario ${boleta} no tiene conversaciones`);
                return;
            }

            const { data: mensajesNoLeidos, error } = await supabase
                .from('mensajes_privados')
                .select('*, chat!inner(usuario1_id, usuario2_id)')
                .in('chat_id', chatIds)
                .neq('emisor_id', boleta)
                .eq('leido', false)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error al obtener mensajes no leídos:', error);
                return;
            }

            if (mensajesNoLeidos && mensajesNoLeidos.length > 0) {
                const mensajesFiltrados = mensajesNoLeidos.filter(m => 
                    m.chat.usuario1_id === boleta || m.chat.usuario2_id === boleta
                );
                
                socket.emit('unread-messages', mensajesFiltrados);
                console.log(`${mensajesFiltrados.length} mensajes no leídos para ${boleta}`);
            } else {
                console.log(`No hay mensajes no leídos para ${boleta}`);
            }

        } catch (error) {
            console.error('Error en get-unread-messages:', error);
        }
    });

    // Marcar mensaje como leído
    socket.on('mark-message-read', async (data) => {
        console.log('Evento mark-message-read recibido:', data);
        const { mensajeId, receptorId } = data;
        try {
            const supabase = require('./src/config/supabase');
            
            const { data: mensaje, error: findError } = await supabase
                .from('mensajes_privados')
                .select('id, chat_id, chat!inner(usuario1_id, usuario2_id)')
                .eq('id', mensajeId)
                .single();

            if (findError || !mensaje) {
                console.error('Mensaje no encontrado:', findError);
                return;
            }

            const chat = mensaje.chat;
            if (chat.usuario1_id !== receptorId && chat.usuario2_id !== receptorId) {
                console.log(`Usuario ${receptorId} no es parte del chat ${mensaje.chat_id}`);
                return;
            }

            const { error } = await supabase
                .from('mensajes_privados')
                .update({ leido: true })
                .eq('id', mensajeId);

            if (!error) {
                console.log(`Mensaje ${mensajeId} marcado como leído`);
            }

        } catch (error) {
            console.error('Error en mark-message-read:', error);
        }
    });

    // Marcar conversación como leída
    socket.on('mark-conversation-read', async (data) => {
        console.log('Evento mark-conversation-read recibido:', data);
        const { otroUsuarioId, miBoleta } = data;
        
        if (!otroUsuarioId || !miBoleta) {
            console.log('Datos incompletos para mark-conversation-read');
            return;
        }
        
        try {
            const supabase = require('./src/config/supabase');
            
            const { data: chat, error: chatError } = await supabase
                .from('chat')
                .select('id')
                .or(`usuario1_id.eq.${miBoleta},usuario2_id.eq.${miBoleta}`)
                .or(`usuario1_id.eq.${otroUsuarioId},usuario2_id.eq.${otroUsuarioId}`)
                .maybeSingle();

            if (chatError) {
                console.error('Error al buscar chat:', chatError);
                return;
            }

            if (!chat) {
                console.log(`No se encontró chat entre ${miBoleta} y ${otroUsuarioId}`);
                return;
            }

            const { data: mensajesActualizados, error } = await supabase
                .from('mensajes_privados')
                .update({ leido: true })
                .eq('chat_id', chat.id)
                .neq('emisor_id', miBoleta)
                .eq('leido', false)
                .select();

            if (error) {
                console.error('Error al marcar mensajes como leídos:', error);
                return;
            }

            const cantidad = mensajesActualizados?.length || 0;
            console.log(`${cantidad} mensajes marcados como leídos para ${miBoleta} con ${otroUsuarioId}`);

            const roomId = [miBoleta, otroUsuarioId].sort().join('-');
            const roomSockets = await io.in(roomId).fetchSockets();
            
            if (roomSockets.length > 0) {
                io.to(roomId).emit('messages-read-update', {
                    leidoPor: miBoleta,
                    chatId: chat.id,
                    cantidad: cantidad,
                    otroUsuarioId: otroUsuarioId
                });
                console.log(`Notificación de lectura enviada a sala ${roomId}`);
            }

        } catch (error) {
            console.error('Error en mark-conversation-read:', error);
        }
    });

    // Ping pong
    socket.on('ping', (data) => {
        socket.emit('pong', { timestamp: data.timestamp });
    });

    // Desconexión
    socket.on('disconnect', () => {
        const user = usuariosConectados.get(socket.id);
        if (user) {
            console.log(`Usuario desconectado: ${user.nombre} (${user.boleta})`);
            usuariosConectados.delete(socket.id);
        } else {
            console.log(`Usuario desconectado: ${socket.id}`);
        }
        console.log(`Usuarios conectados: ${usuariosConectados.size}`);
    });
});

// Inicio del servidor
const serverInstance = server.listen(PORT, () => {
    console.log(`Servidor HTTP y Socket.io corriendo en http://localhost:${PORT}`);
    console.log(`WebSocket disponible en ws://localhost:${PORT}`);
    console.log(`Esperando conexiones...`);
});

module.exports = { app, server, io };