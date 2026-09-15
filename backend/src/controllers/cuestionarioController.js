const supabase = require('../config/supabase');

// Obtener cuestionario de un video
const obtenerCuestionario = async (req, res) => {
    try {
        const { video_id } = req.params;

        const { data: cuestionario, error } = await supabase
            .from('cuestionarios')
            .select('*')
            .eq('video_id', video_id)
            .maybeSingle();

        if (error) {
            console.error('Error al obtener cuestionario:', error);
            return res.status(500).json({ error: 'Error al obtener cuestionario' });
        }

        if (!cuestionario) {
            return res.status(404).json({ error: 'Cuestionario no encontrado para este video' });
        }

        res.json(cuestionario);
    } catch (error) {
        console.error('Error en obtenerCuestionario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener el estado de intentos de un cuestionario
const obtenerEstadoIntentos = async (req, res) => {
    try {
        const { cuestionario_id } = req.params;
        const boleta = req.user.boleta;

        // Contar intentos del usuario
        const { data: intentos, error } = await supabase
            .from('alumno_contesta_cuestionario')
            .select('intento_numero, puntaje, completado_at')
            .eq('boleta', boleta)
            .eq('cuestionario_id', cuestionario_id)
            .order('intento_numero', { ascending: true });

        if (error) {
            console.error('Error al obtener intentos:', error);
            return res.status(500).json({ error: 'Error al obtener intentos' });
        }

        const MAX_INTENTOS = 3;
        const intentosUsados = intentos?.length || 0;
        const puedeResponder = intentosUsados < MAX_INTENTOS;
        const mejorPuntaje = intentos?.reduce((max, i) => Math.max(max, i.puntaje), 0) || null;

        res.json({
            puede_responder: puedeResponder,
            intentos_usados: intentosUsados,
            intentos_restantes: MAX_INTENTOS - intentosUsados,
            proximo_intento: intentosUsados + 1,
            mejor_puntaje: mejorPuntaje,
            historial: intentos
        });
    } catch (error) {
        console.error('Error en obtenerEstadoIntentos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Responder un cuestionario
const responderCuestionario = async (req, res) => {
    try {
        const { cuestionario_id, respuestas } = req.body;
        const boleta = req.user.boleta;

        if (!cuestionario_id || !respuestas) {
            return res.status(400).json({ error: 'Cuestionario y respuestas son obligatorios' });
        }

        // 1. Obtener el cuestionario (para calcular puntaje)
        const { data: cuestionario, error: quizError } = await supabase
            .from('cuestionarios')
            .select('preguntas')
            .eq('id', cuestionario_id)
            .single();

        if (quizError || !cuestionario) {
            return res.status(404).json({ error: 'Cuestionario no encontrado' });
        }

        // 2. Validar número de intentos
        const { data: intentos, error: countError } = await supabase
            .from('alumno_contesta_cuestionario')
            .select('id')
            .eq('boleta', boleta)
            .eq('cuestionario_id', cuestionario_id);

        if (countError) {
            console.error('Error al contar intentos:', countError);
            return res.status(500).json({ error: 'Error al verificar intentos' });
        }

        const MAX_INTENTOS = 3;
        const intentoActual = (intentos?.length || 0) + 1;

        if (intentoActual > MAX_INTENTOS) {
            return res.status(403).json({
                error: `Has alcanzado el límite de ${MAX_INTENTOS} intentos para este cuestionario`
            });
        }

        // 3. Calcular puntaje
        const preguntas = cuestionario.preguntas.preguntas;
        let aciertos = 0;
        preguntas.forEach((pregunta, index) => {
            if (respuestas[index] === pregunta.respuesta_correcta) {
                aciertos++;
            }
        });
        const puntaje = Math.round((aciertos / preguntas.length) * 100);

        // 4. Guardar el intento en el historial
        const { data: nuevoIntento, error } = await supabase
            .from('alumno_contesta_cuestionario')
            .insert({
                boleta,
                cuestionario_id,
                intento_numero: intentoActual,
                puntaje,
                respuestas
            })
            .select()
            .single();

        if (error) {
            console.error('Error al guardar intento:', error);
            return res.status(500).json({ error: 'Error al guardar intento' });
        }

        // 5. ACTUALIZAR O INSERTAR EN RESULTADOS (resumen)
        try {
            const { error: resError } = await supabase
                .from('resultados')
                .upsert({
                    boleta,
                    cuestionario_id,
                    mejor_puntaje: puntaje,
                    intentos_realizados: intentoActual,
                    intentos_agotados: intentoActual >= 3,
                    ultima_actualizacion: new Date()
                }, {
                    onConflict: 'boleta, cuestionario_id'
                });

            if (resError) {
                console.error('Error al actualizar resultados:', resError);
            }
        } catch (upsertError) {
            console.error('Error en upsert de resultados:', upsertError);
        }

        // 6. Obtener el mejor puntaje (desde el historial)
        const { data: mejores } = await supabase
            .from('alumno_contesta_cuestionario')
            .select('puntaje')
            .eq('boleta', boleta)
            .eq('cuestionario_id', cuestionario_id)
            .order('puntaje', { ascending: false })
            .limit(1);

        const mejorPuntaje = mejores && mejores.length > 0 ? mejores[0].puntaje : puntaje;

        res.status(201).json({
            mensaje: 'Respuesta guardada correctamente',
            resultado: nuevoIntento,
            mejor_puntaje: mejorPuntaje,
            intentos_restantes: MAX_INTENTOS - intentoActual,
            es_mejor_puntaje: puntaje >= mejorPuntaje
        });

    } catch (error) {
        console.error('Error en responderCuestionario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener historial de cuestionarios respondidos por el usuario
const obtenerHistorial = async (req, res) => {
    try {
        const boleta = req.user.boleta;

        const { data: historial, error } = await supabase
            .from('alumno_contesta_cuestionario')
            .select(`
                *,
                cuestionarios (
                    id,
                    video_id,
                    preguntas,
                    videos (titulo, thumbnail_url)
                )
            `)
            .eq('boleta', boleta)
            .order('completado_at', { ascending: false });

        if (error) {
            console.error('Error al obtener historial:', error);
            return res.status(500).json({ error: 'Error al obtener historial' });
        }

        res.json(historial);
    } catch (error) {
        console.error('Error en obtenerHistorial:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = {
    obtenerCuestionario,
    obtenerEstadoIntentos,
    responderCuestionario,
    obtenerHistorial
};