const supabase = require('../config/supabase');


// Obtener conversación con un usuario específico
const obtenerConversacion = async (req, res) => {
    try {
        const { usuario_id } = req.params;
        const boleta = req.user.boleta;

        // 1. Buscar el chat entre los dos usuarios
        const { data: chat, error: chatError } = await supabase
            .from('chat')
            .select('id')
            .or(`usuario1_id.eq.${boleta},usuario2_id.eq.${boleta}`)
            .or(`usuario1_id.eq.${usuario_id},usuario2_id.eq.${usuario_id}`)
            .maybeSingle();

        if (chatError) {
            console.error('Error al buscar chat:', chatError);
            throw chatError;
        }

        if (!chat) {
            return res.json([]); // No hay conversación
        }

        // 2. Obtener los mensajes del chat
        const { data: mensajes, error: msgError } = await supabase
            .from('mensajes_privados')
            .select(`
                *,
                emisor:usuarios!mensajes_privados_emisor_id_fkey (nombre, avatar_url)
            `)
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: true });

        if (msgError) {
            console.error('Error al obtener mensajes:', msgError);
            throw msgError;
        }

        // 3. Marcar mensajes no leídos como leídos (para el usuario actual)
        const mensajesNoLeidos = mensajes.filter(m => m.emisor_id !== boleta && !m.leido);
        if (mensajesNoLeidos.length > 0) {
            const ids = mensajesNoLeidos.map(m => m.id);
            await supabase
                .from('mensajes_privados')
                .update({ leido: true })
                .in('id', ids);
        }

        res.json(mensajes);
    } catch (error) {
        console.error('Error al obtener conversación:', error);
        res.status(500).json({ error: 'Error al obtener conversación' });
    }
};

// Enviar mensaje privado
const enviarMensaje = async (req, res) => {
    try {
        const { receptor_id, contenido } = req.body;
        const emisor_id = req.user.boleta;

        if (!receptor_id || !contenido) {
            return res.status(400).json({ error: 'Receptor y contenido son obligatorios' });
        }

        if (emisor_id === receptor_id) {
            return res.status(400).json({ error: 'No puedes enviarte un mensaje a ti mismo' });
        }

        // 1. Buscar o crear el chat entre los dos usuarios
        let { data: chat, error: chatError } = await supabase
            .from('chat')
            .select('id')
            .or(`usuario1_id.eq.${emisor_id},usuario2_id.eq.${emisor_id}`)
            .or(`usuario1_id.eq.${receptor_id},usuario2_id.eq.${receptor_id}`)
            .maybeSingle();

        if (chatError) {
            console.error('Error al buscar chat:', chatError);
            throw chatError;
        }

        if (!chat) {
            // Crear nuevo chat
            const { data: nuevoChat, error: createError } = await supabase
                .from('chat')
                .insert({
                    usuario1_id: emisor_id,
                    usuario2_id: receptor_id
                })
                .select('id')
                .single();

            if (createError) {
                console.error('Error al crear chat:', createError);
                throw createError;
            }
            chat = nuevoChat;
        }

        // 2. Insertar el mensaje en el chat
        const { data: mensaje, error } = await supabase
            .from('mensajes_privados')
            .insert({
                chat_id: chat.id,
                emisor_id: emisor_id,
                contenido: contenido
            })
            .select()
            .single();

        if (error) {
            console.error('Error al insertar mensaje:', error);
            throw error;
        }

        res.status(201).json({
            mensaje: 'Mensaje enviado correctamente',
            data: mensaje
        });
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        res.status(500).json({ error: 'Error al enviar mensaje' });
    }
};

// Marcar mensaje como leído
const marcarLeido = async (req, res) => {
    try {
        const { id } = req.params;
        const boleta = req.user.boleta;

        // Verificar que el mensaje existe y pertenece a un chat del usuario
        const { data: mensaje, error: findError } = await supabase
            .from('mensajes_privados')
            .select(`
                id,
                chat_id,
                emisor_id,
                chat:chat_id (usuario1_id, usuario2_id)
            `)
            .eq('id', id)
            .single();

        if (findError || !mensaje) {
            return res.status(404).json({ error: 'Mensaje no encontrado' });
        }

        // Verificar que el usuario es el receptor (está en el chat)
        const chat = mensaje.chat;
        if (chat.usuario1_id !== boleta && chat.usuario2_id !== boleta) {
            return res.status(403).json({ error: 'No autorizado para marcar este mensaje como leído' });
        }

        // Marcar como leído
        const { data: updated, error } = await supabase
            .from('mensajes_privados')
            .update({ leido: true })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error al marcar como leído:', error);
            throw error;
        }

        res.json({
            mensaje: 'Mensaje marcado como leído',
            data: updated
        });
    } catch (error) {
        console.error('Error al marcar mensaje como leído:', error);
        res.status(500).json({ error: 'Error al marcar mensaje como leído' });
    }
};

// Eliminar mensaje
const eliminarMensaje = async (req, res) => {
    try {
        const { id } = req.params;
        const boleta = req.user.boleta;

        // Verificar que el mensaje existe y pertenece a un chat del usuario
        const { data: mensaje, error: findError } = await supabase
            .from('mensajes_privados')
            .select(`
                id,
                chat_id,
                chat:chat_id (usuario1_id, usuario2_id)
            `)
            .eq('id', id)
            .single();

        if (findError || !mensaje) {
            return res.status(404).json({ error: 'Mensaje no encontrado' });
        }

        // Verificar que el usuario es parte del chat
        const chat = mensaje.chat;
        if (chat.usuario1_id !== boleta && chat.usuario2_id !== boleta) {
            return res.status(403).json({ error: 'No autorizado para eliminar este mensaje' });
        }

        // Eliminar el mensaje
        const { error } = await supabase
            .from('mensajes_privados')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error al eliminar mensaje:', error);
            throw error;
        }

        res.json({ mensaje: 'Mensaje eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar mensaje:', error);
        res.status(500).json({ error: 'Error al eliminar mensaje' });
    }
};

// Obtener lista de conversaciones (chats activos)
const obtenerChats = async (req, res) => {
    try {
        const boleta = req.user.boleta;

        // 1. Obtener todos los chats del usuario
        const { data: chats, error: chatsError } = await supabase
            .from('chat')
            .select(`
                id,
                usuario1_id,
                usuario2_id,
                fecha_creacion,
                usuario1:usuarios!chat_usuario1_id_fkey (nombre, avatar_url),
                usuario2:usuarios!chat_usuario2_id_fkey (nombre, avatar_url)
            `)
            .or(`usuario1_id.eq.${boleta},usuario2_id.eq.${boleta}`)
            .order('fecha_creacion', { ascending: false });

        if (chatsError) {
            console.error('Error al obtener chats:', chatsError);
            throw chatsError;
        }

        // 2. Para cada chat, obtener el último mensaje
        const chatsConMensajes = await Promise.all(
            chats.map(async (chat) => {
                // Obtener el último mensaje del chat
                const { data: ultimoMensaje, error: msgError } = await supabase
                    .from('mensajes_privados')
                    .select('contenido, created_at, leido, emisor_id')
                    .eq('chat_id', chat.id)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (msgError) {
                    console.error('Error al obtener último mensaje:', msgError);
                }

                // Contar mensajes no leídos (donde el usuario actual es el receptor)
                const otroUsuarioId = chat.usuario1_id === boleta ? chat.usuario2_id : chat.usuario1_id;
                const { count: noLeidos, error: countError } = await supabase
                    .from('mensajes_privados')
                    .select('*', { count: 'exact', head: true })
                    .eq('chat_id', chat.id)
                    .eq('emisor_id', otroUsuarioId)
                    .eq('leido', false);

                if (countError) {
                    console.error('Error al contar no leídos:', countError);
                }

                // Determinar el otro usuario
                const otroUsuario = chat.usuario1_id === boleta ? chat.usuario2 : chat.usuario1;

                return {
                    chat_id: chat.id,
                    otro_usuario: {
                        boleta: chat.usuario1_id === boleta ? chat.usuario2_id : chat.usuario1_id,
                        nombre: otroUsuario?.nombre || 'Usuario desconocido',
                        avatar_url: otroUsuario?.avatar_url || null
                    },
                    ultimo_mensaje: ultimoMensaje?.[0]?.contenido || '',
                    ultima_fecha: ultimoMensaje?.[0]?.created_at || chat.fecha_creacion,
                    no_leidos: noLeidos || 0
                };
            })
        );

        res.json(chatsConMensajes);
    } catch (error) {
        console.error('Error al obtener chats:', error);
        res.status(500).json({ error: 'Error al obtener chats' });
    }
};

module.exports = {
    obtenerConversacion,
    enviarMensaje,
    marcarLeido,
    eliminarMensaje,
    obtenerChats
};