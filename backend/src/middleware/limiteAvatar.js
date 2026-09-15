const supabase = require('../config/supabase');

const LIMITE_CAMBIOS_AVATAR_MES = 1;

const verificarLimiteAvatar = async (req, res, next) => {
    try {
        const boleta = req.user?.boleta;

        if (!boleta) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        // Obtener el mes actual (YYYY-MM)
        const mes = new Date().toISOString().slice(0, 7);
        console.log('Mes actual:', mes);

        // Consultar registros del mes actual
        const { count, error } = await supabase
            .from('limites_avatar')
            .select('*', { count: 'exact', head: true })
            .eq('boleta', boleta)
            .eq('mes', mes);

        if (error) {
            console.error('Error al contar registros:', error);
            return res.status(500).json({ 
                error: 'Error al verificar límite',
                detalle: error.message 
            });
        }

        if (count >= LIMITE_CAMBIOS_AVATAR_MES) {
            console.log('Límite mensual alcanzado:', count);
            return res.status(429).json({
                error: `Límite de cambios de avatar mensual alcanzado (${LIMITE_CAMBIOS_AVATAR_MES} vez al mes)`,
                mensaje: 'Has cambiado tu foto de perfil este mes. Vuelve el próximo mes.'
            });
        }

        // Registrar cambio con mes
        console.log('Registrando cambio de avatar...');
        const { data: insertData, error: insertError } = await supabase
            .from('limites_avatar')
            .insert({
                boleta,
                mes: mes
            })
            .select();

        if (insertError) {
            console.error('Error al insertar registro:', insertError);
            return res.status(500).json({ 
                error: 'Error al registrar cambio de avatar',
                detalle: insertError.message 
            });
        }

        console.log('Cambio de avatar registrado correctamente');
        next();

    } catch (error) {
        console.error('Excepción en verificarLimiteAvatar:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            detalle: error.message 
        });
    }
};

module.exports = { verificarLimiteAvatar };