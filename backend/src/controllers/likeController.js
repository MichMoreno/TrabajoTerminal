const supabase = require('../config/supabase');

// Obtener número de likes de un video
const obtenerLikes = async (req, res) => {
    try {
        const { video_id } = req.params;

        const { count, error } = await supabase
            .from('alumno_da_like_video')
            .select('*', { count: 'exact', head: true })
            .eq('video_id', video_id);

        if (error) throw error;

        res.json({ likes: count });
    } catch (error) {
        console.error('Error al obtener likes:', error);
        res.status(500).json({ error: 'Error al obtener likes' });
    }
};

// Verificar si el usuario ya dio like a un video
const verificarLike = async (req, res) => {
    try {
        const { video_id } = req.params;
        const boleta = req.user.boleta;

        const { data, error } = await supabase
            .from('alumno_da_like_video')
            .select('id')
            .eq('boleta', boleta)
            .eq('video_id', video_id)
            .maybeSingle();

        if (error) throw error;

        res.json({ ya_dio_like: !!data });
    } catch (error) {
        console.error('Error al verificar like:', error);
        res.status(500).json({ error: 'Error al verificar like' });
    }
};

// Dar like a un video
const darLike = async (req, res) => {
    try {
        const { video_id } = req.params;
        const boleta = req.user.boleta;

        // Verificar si ya dio like
        const { data: existe, error: checkError } = await supabase
            .from('alumno_da_like_video')
            .select('id')
            .eq('boleta', boleta)
            .eq('video_id', video_id)
            .maybeSingle();

        if (checkError) throw checkError;

        if (existe) {
            return res.status(400).json({ error: 'Ya has dado like a este video' });
        }

        const { data, error } = await supabase
            .from('alumno_da_like_video')
            .insert({ boleta, video_id })
            .select()
            .single();

        if (error) throw error;

        // Obtener el nuevo total de likes
        const { count } = await supabase
            .from('alumno_da_like_video')
            .select('*', { count: 'exact', head: true })
            .eq('video_id', video_id);

        res.status(201).json({
            mensaje: 'Like agregado correctamente',
            like: data,
            total_likes: count
        });
    } catch (error) {
        console.error('Error al dar like:', error);
        res.status(500).json({ error: 'Error al dar like' });
    }
};

// Quitar like de un video
const quitarLike = async (req, res) => {
    try {
        const { video_id } = req.params;
        const boleta = req.user?.boleta;

        console.log('boleta desde token:', boleta);

        if (!boleta) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        // 1. Buscar el like existente
        const { data: like, error: findError } = await supabase
            .from('alumno_da_like_video')
            .select('id')
            .eq('boleta', boleta)
            .eq('video_id', video_id)
            .maybeSingle();

        if (findError) {
            console.error('Error al buscar like:', findError);
            return res.status(500).json({ error: 'Error al buscar like' });
        }

        console.log('Like encontrado:', like);

        if (!like) {
            return res.status(404).json({ error: 'No has dado like a este video' });
        }

        // 2. Eliminar el like por ID (con logs detallados)
        console.log(`Intentando eliminar like con ID: ${like.id}`);

        const { data, error: deleteError } = await supabase
            .from('alumno_da_like_video')
            .delete()
            .eq('id', like.id)
            .select();  // ← .select() para ver qué se eliminó

        console.log('Datos eliminados:', data);
        console.log('Error en DELETE:', deleteError);

        if (deleteError) {
            console.error('Error al eliminar like:', deleteError);
            return res.status(500).json({ 
                error: 'Error al eliminar like',
                detalle: deleteError.message 
            });
        }

        console.log('Like eliminado correctamente');

        // 3. Contar likes restantes
        const { count } = await supabase
            .from('alumno_da_like_video')
            .select('*', { count: 'exact', head: true })
            .eq('video_id', video_id);

        res.json({
            mensaje: 'Like eliminado correctamente',
            total_likes: count
        });

    } catch (error) {
        console.error('Error al quitar like:', error);
        res.status(500).json({ error: 'Error al quitar like' });
    }
};
module.exports = {
    obtenerLikes,
    verificarLike,
    darLike,
    quitarLike
};