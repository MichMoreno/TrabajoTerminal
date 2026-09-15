const supabase = require('../config/supabase');

// Obtener todos los autores de un video
const obtenerAutoresVideo = async (req, res) => {
    try {
        const { video_id } = req.params;

        const { data: autores, error } = await supabase
            .from('alumno_publica_video')
            .select(`
                boleta,
                es_autor_principal,
                fecha_publicacion,
                usuarios (nombre, avatar_url)
            `)
            .eq('video_id', video_id)
            .order('es_autor_principal', { ascending: false });

        if (error) {
            console.error('Error al obtener autores:', error);
            return res.status(500).json({ error: 'Error al obtener autores' });
        }

        res.json(autores);
    } catch (error) {
        console.error('Error en obtenerAutoresVideo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener todos los videos publicados por un alumno
const obtenerVideosPublicados = async (req, res) => {
    try {
        const { boleta } = req.params;

        const { data: publicaciones, error } = await supabase
            .from('alumno_publica_video')
            .select(`
                video_id,
                es_autor_principal,
                fecha_publicacion,
                videos (id, titulo, thumbnail_url, vistas, duracion)
            `)
            .eq('boleta', boleta)
            .order('fecha_publicacion', { ascending: false });

        if (error) {
            console.error('Error al obtener publicaciones:', error);
            return res.status(500).json({ error: 'Error al obtener publicaciones' });
        }

        res.json(publicaciones);
    } catch (error) {
        console.error('Error en obtenerVideosPublicados:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Registrar una publicación (cuando un alumno sube un video)
const registrarPublicacion = async (req, res) => {
    try {
        const { video_id, es_autor_principal } = req.body;
        const boleta = req.user.boleta;

        if (!video_id) {
            return res.status(400).json({ error: 'Video ID es obligatorio' });
        }

        // Verificar si ya existe
        const { data: existe, error: checkError } = await supabase
            .from('alumno_publica_video')
            .select('id')
            .eq('boleta', boleta)
            .eq('video_id', video_id)
            .maybeSingle();

        if (checkError) {
            console.error('Error al verificar existencia:', checkError);
            return res.status(500).json({ error: 'Error al verificar existencia' });
        }

        if (existe) {
            return res.status(400).json({ error: 'Ya has publicado este video' });
        }

        const { data: publicacion, error } = await supabase
            .from('alumno_publica_video')
            .insert({
                boleta,
                video_id,
                es_autor_principal: es_autor_principal !== undefined ? es_autor_principal : true
            })
            .select()
            .single();

        if (error) {
            console.error('Error al registrar publicación:', error);
            return res.status(500).json({ error: 'Error al registrar publicación' });
        }

        res.status(201).json({
            mensaje: 'Publicación registrada correctamente',
            publicacion
        });
    } catch (error) {
        console.error('Error en registrarPublicacion:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Eliminar una publicación (cuando un alumno elimina un video)
const eliminarPublicacion = async (req, res) => {
    try {
        const { video_id } = req.params;
        const boleta = req.user.boleta;

        const { error } = await supabase
            .from('alumno_publica_video')
            .delete()
            .eq('boleta', boleta)
            .eq('video_id', video_id);

        if (error) {
            console.error('Error al eliminar publicación:', error);
            return res.status(500).json({ error: 'Error al eliminar publicación' });
        }

        res.json({ mensaje: 'Publicación eliminada correctamente' });
    } catch (error) {
        console.error('Error en eliminarPublicacion:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = {
    obtenerAutoresVideo,
    obtenerVideosPublicados,
    registrarPublicacion,
    eliminarPublicacion
};