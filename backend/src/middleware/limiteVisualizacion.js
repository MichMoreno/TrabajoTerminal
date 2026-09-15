const supabase = require('../config/supabase');

const LIMITE_MINUTOS_SEMANAL = 20; // 20 minutos semanales

const verificarLimiteVisualizacion = async (req, res, next) => {
    try {
        const { id: videoId } = req.params;
        const boleta = req.user?.boleta;

        if (!boleta) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        // Obtener la duración del video
        const {data: video, error: videoError} = await supabase
            .from('videos')
            .select('duracion')
            .eq('id', videoId)
            .single();

        if (videoError || !video){
            return res.status(404).json({error: 'Video no encontrado'});
        }

        const duracionMinutos = Math.ceil(video.duracion/60); // Convertir segundos a minutos
        console.log(`Video ID ${videoId} dura ${duracionMinutos}`);

        // Calcular semana actual
        const ahora = new Date();
        const año = ahora.getFullYear();
        const diaDelAño = Math.floor((ahora - new Date(año, 0, 0)) / (1000 * 60 * 60 * 24));
        const semana = Math.ceil((diaDelAño + new Date(año, 0, 1).getDay()) / 7);
        const semanaKey = `${año}-W${semana.toString().padStart(2, '0')}`;

        console.log(`Semana actual: ${semanaKey}`);

        // Obtener todas las visualizaciones de la semana
        const {data: visualizaciones, error: visError} = await supabase
            .from('limites_visualizacion')
            .select('video_id')
            .eq('boleta', boleta)
            .eq('semana', semanaKey);
        
        if(visError){
            console.error('Error al obtener las visualizaciones:', visError);
            return res.status(500).json({error: 'Error al verificar límite'});
        }

        // Sumar minutos vistos en la semana
        let minutosVistos = 0;

        if(visualizaciones && visualizaciones.length > 0){
            for(const vis of visualizaciones){
                const{data: v, error: vError} = await supabase
                    .from('videos')
                    .select('duracion')
                    .eq('id', vis.video_id)
                    .single();
                if(!vError & v){
                    minutosVistos += Math.ceil(v.duracion/60);
                }
            }
        }
        console.log(`Minutos vistos esta semana: ${minutosVistos} / ${LIMITE_MINUTOS_SEMANAL}`);

        // Verificar si excede el límite
        if(minutosVistos + duracionMinutos > LIMITE_MINUTOS_SEMANAL){
            return res.status(429).json({
                error: `Límite de visualización semanal alcanzado (${LIMITE_MINUTOS_SEMANAL} minutos)`,
                mensaje: `Has visto ${minutosVistos} minutos esta semana. Este video dura ${duracionMinutos} minutos y excedería el límite.`
            });
        }

        // Registrar la visualización
        await supabase
            .from('limites_visualizacion')
            .insert({
                boleta,
                video_id: videoId,
                semana:semanaKey
            });
        
        console.log(`Visualización registrada. Total esta semana: ${minutosVistos + duracionMinutos} minutos`);
        next();

    } catch (error) {
        console.error('Error en verificarLimiteVisualizacion:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = { verificarLimiteVisualizacion };