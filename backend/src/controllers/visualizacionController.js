const supabase = require('../config/supabase');

// Guardar o actualizar progreso de un video
const guardarProgreso = async (req, res) => {
    try {
        const { video_id, progreso } = req.body;
        const boleta = req.user.boleta;

        if (!video_id || progreso === undefined) {
            return res.status(400).json({ error: 'Video ID y progreso son obligatorios' });
        }

        // Validar que el video existe
        const { data: video, error: videoError } = await supabase
            .from('videos')
            .select('id, duracion')
            .eq('id', video_id)
            .single();

        if (videoError || !video) {
            return res.status(404).json({ error: 'Video no encontrado' });
        }

        // Validar progreso (0-100)
        const progresoFinal = Math.min(Math.max(progreso, 0), 100);
        const completado = progresoFinal >= 100;

        // Usar UPSERT (insertar o actualizar)
        const { data, error } = await supabase
            .from('visualizar_video')
            .upsert({
                boleta,
                video_id,
                progreso: progresoFinal,
                completado,
                ultima_visualizacion: new Date()
            }, {
                onConflict: 'boleta, video_id'
            })
            .select()
            .single();

        if (error) {
            console.error('Error al guardar progreso:', error);
            return res.status(500).json({ error: 'Error al guardar progreso' });
        }

        res.json({
            mensaje: 'Progreso guardado correctamente',
            progreso: data
        });
    } catch (error) {
        console.error('Error en guardarProgreso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener progreso de un video específico
const obtenerProgreso = async (req, res) => {
    try {
        const { video_id } = req.params;
        const boleta = req.user.boleta;

        const { data, error } = await supabase
            .from('visualizar_video')
            .select('*')
            .eq('boleta', boleta)
            .eq('video_id', video_id)
            .maybeSingle();

        if (error) {
            console.error('Error al obtener progreso:', error);
            return res.status(500).json({ error: 'Error al obtener progreso' });
        }

        res.json({
            visto: !!data,
            progreso: data?.progreso || 0,
            completado: data?.completado || false,
            ultima_visualizacion: data?.ultima_visualizacion || null
        });
    } catch (error) {
        console.error('Error en obtenerProgreso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener todos los videos en progreso del usuario
const obtenerVideosEnProgreso = async (req, res) => {
    try {
        const boleta = req.user.boleta;

        const { data, error } = await supabase
            .from('visualizar_video')
            .select(`
                *,
                videos (id, titulo, thumbnail_url, duracion)
            `)
            .eq('boleta', boleta)
            .eq('completado', false)
            .gt('progreso', 0)
            .order('ultima_visualizacion', { ascending: false });

        if (error) {
            console.error('Error al obtener videos en progreso:', error);
            return res.status(500).json({ error: 'Error al obtener videos en progreso' });
        }

        res.json(data);
    } catch (error) {
        console.error('Error en obtenerVideosEnProgreso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener videos completados por el usuario
const obtenerVideosCompletados = async (req, res) => {
    try {
        const boleta = req.user.boleta;

        const { data, error } = await supabase
            .from('visualizar_video')
            .select(`
                *,
                videos (id, titulo, thumbnail_url, duracion)
            `)
            .eq('boleta', boleta)
            .eq('completado', true)
            .order('ultima_visualizacion', { ascending: false });

        if (error) {
            console.error('Error al obtener videos completados:', error);
            return res.status(500).json({ error: 'Error al obtener videos completados' });
        }

        res.json(data);
    } catch (error) {
        console.error('Error en obtenerVideosCompletados:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = {
    guardarProgreso,
    obtenerProgreso,
    obtenerVideosEnProgreso,
    obtenerVideosCompletados
};