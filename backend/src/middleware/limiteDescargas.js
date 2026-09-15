const supabase = require('../config/supabase');

const LIMITE_DESCARGAS_MES = 2;

const verificarLimiteDescargas = async (req, res, next) => {
    try {
        const { id: materialId } = req.params;
        const boleta = req.user?.boleta;

        if (!boleta) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const hoy = new Date().toISOString().split('T')[0];

        const { count, error } = await supabase
            .from('limites_descargas')
            .select('*', { count: 'exact', head: true })
            .eq('boleta', boleta)
            .eq('material_id', materialId)
            .eq('mes', mes);

        if (error) {
            console.error('Error al verificar límite:', error);
            return res.status(500).json({ error: 'Error al verificar límite' });
        }

        if (count >= LIMITE_DESCARGAS_MES) {
            return res.status(429).json({
                error: `Límite de descargas diarias alcanzado (${LIMITE_DESCARGAS_MES})`,
                mensaje: 'Vuelve mañana para descargar más documentos.'
            });
        }

        // Registrar descarga
        await supabase
            .from('limites_descargas')
            .insert({
                boleta,
                material_id: materialId,
                mes: mes
            });

        next();
    } catch (error) {
        console.error('Error en verificarLimiteDescargas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = { verificarLimiteDescargas };