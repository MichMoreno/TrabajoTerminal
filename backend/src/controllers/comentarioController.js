const supabase = require('../config/supabase');
const { moderarContenido } = require('../services/moderacionService');

const LIMITE_CARACTERES_COMENTARIO = 500;

// Obtener comentarios de un video
const obtenerComentarios = async (req, res) => {
    try {
        const { video_id } = req.params;

        const { data: comentarios, error } = await supabase
            .from('comentarios')
            .select(`
                id,
                contenido,
                created_at,
                usuarios!inner (nombre, avatar_url)
            `)
            .eq('video_id', video_id)
            .order('created_at', { ascending: true });

        if (error) throw error;

        res.json(comentarios);
    } catch (error) {
        console.error('Error al obtener comentarios:', error);
        res.status(500).json({ error: 'Error al obtener comentarios' });
    }
};

// Publicar comentario
const publicarComentario = async (req, res) => {
    try {
        const { video_id, contenido } = req.body;
        const boleta = req.user.boleta;

        if (!video_id || !contenido) {
            return res.status(400).json({ error: 'Video y contenido son obligatorios' });
        }

        if (contenido.length > LIMITE_CARACTERES_COMENTARIO){
            return res.status(400).json({
                error: `El comentario no puede tener más de ${LIMITE_CARACTERES_COMENTARIO} caracteres`
            });
        } else if (contenido.trim().length === 0) {
            return res.status(400).json({
                error: 'El comentario no puede estar vacío'
            });
        }


        console.log('Moderando comentario');
        const moderacion = await moderarContenido(contenido);
        if(!moderacion.aprobado){
            return res.status(400).json({
                error: `El comentario contiene lenguaje inapropiado: ${moderacion.razon}`
            });
        }
        console.log('El comentario es aprobado');

        const { data: comentario, error } = await supabase
            .from('comentarios')
            .insert({ video_id, boleta, contenido })
            .select(`
                id,
                contenido,
                created_at,
                usuarios!inner (nombre, avatar_url)
            `)
            .single();

        if (error) throw error;

        res.status(201).json({
            mensaje: 'Comentario publicado correctamente',
            comentario
        });
    } catch (error) {
        console.error('Error al publicar comentario:', error);
        res.status(500).json({ error: 'Error al publicar comentario' });
    }
};

// Editar comentario
const editarComentario = async (req, res) => {
    try {
        const { id } = req.params;
        const { contenido } = req.body;
        const boleta = req.user.boleta;

        if (!contenido) {
            return res.status(400).json({ error: 'El contenido es obligatorio' });
        }

        console.log('Moderando comentario actualizado');
        const moderacion = await moderarContenido(contenido);
        if(!moderacion.aprobado){
            return res.status(400).json({
                error: `El comentario editado contiene lenguaje inapropiado: ${moderacion.razon}`
            });
        }
        console.log('El comentario actualizado es aprobado');

        const { data: comentario, error } = await supabase
            .from('comentarios')
            .update({ contenido })
            .eq('id', id)
            .eq('boleta', boleta)
            .select(`
                id,
                contenido,
                created_at,
                usuarios!inner (nombre, avatar_url)
            `)
            .single();

        if (error) {
            return res.status(404).json({ error: 'Comentario no encontrado o no autorizado' });
        }

        res.json({
            mensaje: 'Comentario actualizado correctamente',
            comentario
        });
    } catch (error) {
        console.error('Error al editar comentario:', error);
        res.status(500).json({ error: 'Error al editar comentario' });
    }
};

// Eliminar comentario
const eliminarComentario = async (req, res) => {
    try {
        const { id } = req.params;
        const boleta = req.user.boleta;

        const { error } = await supabase
            .from('comentarios')
            .delete()
            .eq('id', id)
            .eq('boleta', boleta);

        if (error) {
            return res.status(404).json({ error: 'Comentario no encontrado o no autorizado' });
        }

        res.json({ mensaje: 'Comentario eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar comentario:', error);
        res.status(500).json({ error: 'Error al eliminar comentario' });
    }
};

module.exports = {
    obtenerComentarios,
    publicarComentario,
    editarComentario,
    eliminarComentario
};