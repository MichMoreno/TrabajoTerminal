const supabase = require('../config/supabase');

const LIMITE_PUBLICACIONES_VIDEOS_MES = 2;
const LIMITE_PUBLICACIONES_DOCUMENTOS_MES = 2;

const verificarLimitePublicaciones = (tipo) => {
    return async (req, res, next) => {
        try {
            const boleta = req.user?.boleta;

            if (!boleta) {
                return res.status(401).json({ error: 'Usuario no autenticado' });
            }

            const mes = new Date().toISOString().slice(0, 7);
            const tabla = tipo === 'video' ? 'limite_publicaciones_videos' : 'limite_publicaciones_documentos';
            const limite = tipo === 'video' ? LIMITE_PUBLICACIONES_VIDEOS_MES : LIMITE_PUBLICACIONES_DOCUMENTOS_MES;

            const { count, error } = await supabase
                .from(tabla)
                .select('*', { count: 'exact', head: true })
                .eq('boleta', boleta)
                .eq('mes', mes);

            if (error) {
                console.error('Error al verificar límite:', error);
                return res.status(500).json({ error: 'Error al verificar límite' });
            }

            if (count >= limite) {
                return res.status(429).json({
                    error: `Límite de publicaciones de ${tipo === 'video' ? 'videos' : 'documentos'} alcanzado (${limite} por mes)`,
                    mensaje: 'Has alcanzado el límite de publicaciones de este mes.'
                });
            }

            // Registrar publicación
            await supabase
                .from(tabla)
                .insert({ boleta, mes });

            next();
        } catch (error) {
            console.error('Error en verificarLimitePublicaciones:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    };
};

module.exports = { 
    verificarLimitePublicaciones,
    LIMITE_PUBLICACIONES_VIDEOS_MES,
    LIMITE_PUBLICACIONES_DOCUMENTOS_MES
};