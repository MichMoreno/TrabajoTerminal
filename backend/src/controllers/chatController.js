const supabase = require('../config/supabase');

// Obtener chat completo
const procesarChat = (boleta, chat, todosMensajes) => {
  // Determinar el otro usuario
  const esUsuario1 = chat.usuario1_id === boleta;
  const otroUsuarioId = esUsuario1 ? chat.usuario2_id : chat.usuario1_id;
  const otroUsuario = esUsuario1 ? chat.usuario2 : chat.usuario1;

  // Filtrar los mensajes de este chat
  const mensajesDelChat = todosMensajes.filter(m => m.chat_id === chat.id);

  // Obtener el último mensaje
  const ultimoMensaje = mensajesDelChat[0] || null;

  // Contar mensajes no leídos del otro usuario
  const noLeidos = mensajesDelChat.filter(
    m => m.emisor_id === otroUsuarioId && !m.leido
  ).length;

  return {
    id: chat.id,
    otro_usuario: {
      boleta: otroUsuarioId,
      nombre: otroUsuario?.nombre_usuario || 'Usuario desconocido',
      avatar_url: otroUsuario?.avatar_url || null
    },
    ultimo_mensaje: ultimoMensaje?.contenido || 'Sin mensajes',
    ultima_fecha: ultimoMensaje?.created_at || chat.fecha_creacion,
    no_leidos: noLeidos
  };
};

// Obtener todos los chats (optimizado)
const obtenerChats = async (req, res) => {
  try {
    const boleta = req.user.boleta;
    const { usuario_id } = req.query; // Opcional: si viene de un perfil

    console.log(`Obteniendo chats para usuario: ${boleta}`);

    if (usuario_id === boleta) {
    return res.status(400).json({ 
      error: 'No puedes crear un chat contigo mismo' 
    });
  }

    // Si se especifica un usuario:id (chat individual)
    if (usuario_id) {
      const { data: chat, error } = await supabase
        .from('chat')
        .select(`
          id,
          usuario1_id,
          usuario2_id,
          fecha_creacion,
          usuario1:usuarios!chat_usuario1_id_fkey (nombre_usuario, avatar_url),
          usuario2:usuarios!chat_usuario2_id_fkey (nombre_usuario, avatar_url)
        `)
        .or(`usuario1_id.eq.${boleta},usuario2_id.eq.${boleta}`)
        .or(`usuario1_id.eq.${usuario_id},usuario2_id.eq.${usuario_id}`)
        .maybeSingle();

      if (error) throw error;

      let chatActual = chat;

      // Si no existe chat, crearlo
      if (!chatActual) {
        const { data: nuevoChat, error: createError } = await supabase
          .from('chat')
          .insert({
            usuario1_id: boleta,
            usuario2_id: usuario_id
          })
          .select(`
            id,
            usuario1_id,
            usuario2_id,
            fecha_creacion,
            usuario1:usuarios!chat_usuario1_id_fkey (nombre_usuario, avatar_url),
            usuario2:usuarios!chat_usuario2_id_fkey (nombre_usuario, avatar_url)
          `)
          .single();

        if (createError) throw createError;
        chatActual = nuevoChat;
      }

      // UNA SOLA consulta para los mensajes de ese chat
      const { data: mensajes, error: mensajesError } = await supabase
        .from('mensajes_privados')
        .select('chat_id, contenido, created_at, leido, emisor_id')
        .eq('chat_id', chatActual.id)
        .order('created_at', { ascending: false });

      if (mensajesError) throw mensajesError;

      const chatCompleto = procesarChat(boleta, chatActual, mensajes || []);
      return res.json({ chats: [chatCompleto] });
    }

    // Caso 2: Obtener todos los chats (optimizado)
    const { data: chats, error } = await supabase
      .from('chat')
      .select(`
        id,
        usuario1_id,
        usuario2_id,
        fecha_creacion,
        usuario1:usuarios!chat_usuario1_id_fkey (nombre_usuario, avatar_url),
        usuario2:usuarios!chat_usuario2_id_fkey (nombre_usuario, avatar_url)
      `)
      .or(`usuario1_id.eq.${boleta},usuario2_id.eq.${boleta}`)
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;

    if (!chats || chats.length === 0) {
      return res.json({
        chats: [],
        mensaje: 'No tienes conversaciones aún'
      });
    }

    const chatIds = chats.map(c => c.id);

    // UNA SOLA consulta para TODOS los mensajes de TODOS los chats
    const { data: todosMensajes, error: mensajesError } = await supabase
      .from('mensajes_privados')
      .select('chat_id, contenido, created_at, leido, emisor_id')
      .in('chat_id', chatIds)
      .order('created_at', { ascending: false });

    if (mensajesError) throw mensajesError;

    // Procesar cada chat con la información ya obtenida (en memoria)
    const chatsProcesados = chats.map(chat =>
      procesarChat(boleta, chat, todosMensajes || [])
    );

    // Ordenar por fecha del último mensaje
    chatsProcesados.sort((a, b) => {
      const fechaA = a.ultima_fecha ? new Date(a.ultima_fecha) : new Date(0);
      const fechaB = b.ultima_fecha ? new Date(b.ultima_fecha) : new Date(0);
      return fechaB - fechaA;
    });

    console.log(`${chatsProcesados.length} chats procesados`);
    res.json({ chats: chatsProcesados });

  } catch (error) {
    console.error('Error al obtener chats:', error);
    res.status(500).json({ error: 'Error al obtener chats' });
  }
};

// Obtener mensajes de un chat específico
const obtenerMensajesChat = async (req, res) => {
    try {
        const { chat_id } = req.params;
        const boleta = req.user.boleta;

        console.log(`Obteniendo mensajes del chat ${chat_id} para usuario ${boleta}`);

        // Verificar que el usuario pertenece al chat
        const { data: chat, error: chatError } = await supabase
            .from('chat')
            .select('*')
            .eq('id', chat_id)
            .or(`usuario1_id.eq.${boleta},usuario2_id.eq.${boleta}`)
            .single();

        if (chatError || !chat) {
            return res.status(404).json({ error: 'Chat no encontrado o no autorizado' });
        }

        // Obtener mensajes
        const { data: mensajes, error } = await supabase
            .from('mensajes_privados')
            .select('*')
            .eq('chat_id', chat_id)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Marcar mensajes no leídos como leídos
        const mensajesNoLeidos = mensajes.filter(m => m.emisor_id !== boleta && !m.leido);
        if (mensajesNoLeidos.length > 0) {
            const ids = mensajesNoLeidos.map(m => m.id);
            await supabase
                .from('mensajes_privados')
                .update({ leido: true })
                .in('id', ids);
            
            // Notificar al otro usuario que los mensajes fueron leídos
            const otroUsuarioId = chat.usuario1_id === boleta ? chat.usuario2_id : chat.usuario1_id;
            const io = req.app.get('io');
            const roomId = [boleta, otroUsuarioId].sort().join('-');
            
            // Emitir evento de lectura a través de Socket.io
            io.to(roomId).emit('messages-read-update', {
                leidoPor: boleta,
                chatId: chat.id,
                cantidad: mensajesNoLeidos.length,
                otroUsuarioId: otroUsuarioId
            });
        }

        // Obtener información del otro usuario
        const otroUsuarioId = chat.usuario1_id === boleta ? chat.usuario2_id : chat.usuario1_id;
        const { data: otroUsuario } = await supabase
            .from('usuarios')
            .select('nombre_usuario, avatar_url')
            .eq('boleta', otroUsuarioId)
            .single();

        res.json({
            chat: {
                id: chat.id,
                otro_usuario: {
                    boleta: otroUsuarioId,
                    nombre: otroUsuario?.nombre_usuario || 'Usuario desconocido',
                    avatar_url: otroUsuario?.avatar_url || null
                }
            },
            mensajes: mensajes.map(m => ({
                ...m,
                es_mio: m.emisor_id === boleta
            }))
        });

    } catch (error) {
        console.error('Error al obtener mensajes del chat:', error);
        res.status(500).json({ error: 'Error al obtener mensajes del chat' });
    }
};

// Enviar mensaje desde socket.io
const enviarMensajeSocket = async (emisorId, receptorId, contenido) => {
    try {
        // Validar contenido
        if (!contenido || contenido.trim().length === 0) {
            return { success: false, error: 'El mensaje no puede estar vacío' };
        }

        if (contenido.length > 500) {
            return { success: false, error: 'El mensaje no puede tener más de 500 caracteres' };
        }

        // Buscar o crear chat
        let { data: chat, error } = await supabase
            .from('chat')
            .select('id')
            .or(`usuario1_id.eq.${emisorId},usuario2_id.eq.${emisorId}`)
            .or(`usuario1_id.eq.${receptorId},usuario2_id.eq.${receptorId}`)
            .maybeSingle();

        if (error) throw error;

        if (!chat) {
            const { data: nuevoChat, error: createError } = await supabase
                .from('chat')
                .insert({
                    usuario1_id: emisorId,
                    usuario2_id: receptorId
                })
                .select()
                .single();

            if (createError) throw createError;
            chat = nuevoChat;
        }

        // Guardar mensaje
        const { data: mensaje, error: msgError } = await supabase
            .from('mensajes_privados')
            .insert({
                chat_id: chat.id,
                emisor_id: emisorId,
                contenido: contenido.trim(),
                leido: false
            })
            .select()
            .single();

        if (msgError) throw msgError;

        return { success: true, mensaje, chatId: chat.id };

    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        return { success: false, error: error.message };
    }
};

// Eliminar chat
const eliminarChat = async (req, res) => {
    try {
        const { chat_id } = req.params;
        const boleta = req.user.boleta;

        const {data: chat, error: chatError} = await supabase
          .from('chat')
          .select('usuario1_id, usuario2_id')
          .eq('id',chat_id)
          .single();
        
        if(chatError || !chat){
          return res.status(404).json({error: 'Chat no encontrado'});
        }

        if(chat.usuario1_id !== boleta && chat.usuario2_id !== boleta){
          return res.status(403).json({error: 'No tienes permiso'});
        }

        await supabase.from('mensajes_privados').delete().eq('chat_id', chat_id);

        console.log(`Eliminando chat ${chat_id} para usuario ${boleta}`);

        const { error } = await supabase
            .from('chat')
            .delete()
            .eq('id', chat_id)
            .or(`usuario1_id.eq.${boleta},usuario2_id.eq.${boleta}`);

        if (error) throw error;

        if (error) {
            return res.status(404).json({ error: 'Chat no encontrado o no autorizado' });
        }

        res.json({ mensaje: 'Chat eliminado correctamente' });

    } catch (error) {
        console.error('Error al eliminar chat:', error);
        res.status(500).json({ error: 'Error al eliminar chat' });
    }
};

const editarMensaje = async (req, res) => {
  try {
    const { mensaje_id } = req.params;
    const { contenido } = req.body;
    const boleta = req.user.boleta;

    console.log('=== editarMensaje ===');
    console.log('mensaje_id:', mensaje_id);
    console.log('contenido:', contenido);
    console.log('boleta:', boleta);

    // ✅ Validación correcta
    if (!contenido || contenido.trim().length === 0) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
    }

    if (contenido.length > 500) {
      return res.status(400).json({ error: 'El mensaje no puede exceder 500 caracteres' });
    }

    // ✅ Verificar que el mensaje existe y pertenece al usuario
    const { data: mensaje, error: findError } = await supabase
      .from('mensajes_privados')  // ✅ Tabla correcta
      .select('emisor_id, contenido')  // ✅ Columnas correctas
      .eq('id', mensaje_id)
      .single();

    if (findError || !mensaje) {
      console.log('Mensaje no encontrado:', findError);
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    if (mensaje.emisor_id !== boleta) {
      console.log('Emisor no coincide:', mensaje.emisor_id, '!==', boleta);
      return res.status(403).json({ error: 'No puedes editar este mensaje' });
    }

    // ✅ Actualizar el mensaje
    const { data: mensajeActualizado, error } = await supabase
      .from('mensajes_privados')  // ✅ Tabla correcta
      .update({
        contenido: contenido.trim(),
        editado: true,
        fecha_edicion: new Date().toISOString(),  // ✅ Con paréntesis
      })
      .eq('id', mensaje_id)
      .select()
      .single();

    if (error) throw error;

    console.log('Mensaje editado correctamente');

    res.json({
      mensaje: 'Mensaje editado correctamente',
      mensajeActualizado,
    });
  } catch (error) {
    console.error('Error en editarMensaje:', error);
    res.status(500).json({ error: 'Error al editar mensaje' });
  }
};

// Eliminar mensaje
const eliminarMensaje = async (req, res) => {
  try {
    const { mensaje_id } = req.params;
    const boleta = req.user.boleta;

    console.log('=== eliminarMensaje ===');
    console.log('mensaje_id:', mensaje_id);

    // ✅ Verificar que el mensaje existe y pertenece al usuario
    const { data: mensaje, error: findError } = await supabase
      .from('mensajes_privados')  // ✅ Tabla correcta
      .select('emisor_id')
      .eq('id', mensaje_id)
      .single();

    if (findError || !mensaje) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    if (mensaje.emisor_id !== boleta) {
      return res.status(403).json({ error: 'No puedes eliminar este mensaje' });
    }

    const { error } = await supabase
      .from('mensajes_privados')  // ✅ Tabla correcta
      .delete()
      .eq('id', mensaje_id);

    if (error) throw error;

    res.json({ mensaje: 'Mensaje eliminado correctamente' });
  } catch (error) {
    console.error('Error en eliminarMensaje:', error);
    res.status(500).json({ error: 'Error al eliminar mensaje' });
  }
};

module.exports = {
    obtenerChats,
    obtenerMensajesChat,
    eliminarChat,
    editarMensaje,
    eliminarMensaje,
    enviarMensajeSocket  // Para usar en Socket.io
};