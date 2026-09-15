const supabase = require('../config/supabase');

// Obtener resultados de un alumno (para su gráfica de aprendizaje)
const obtenerResultados = async (req, res) => {
    try {
        const boleta = req.user.boleta;

        // Obtener historial completo (desde alumno_contesta_cuestionario)
        const { data: historial, error: histError } = await supabase
            .from('alumno_contesta_cuestionario')
            .select(`
                id,
                intento_numero,
                puntaje,
                respuestas,
                completado_at,
                cuestionarios!inner (
                    id,
                    video_id,
                    preguntas,
                    video:video_id (
                    titulo,
                    thumbnail_url
                    )
                )
            `)
            .eq('boleta', boleta)
            .order('completado_at', { ascending: true });

        if (histError) {
            console.error('Error al obtener historial:', histError);
            return res.status(500).json({ error: 'Error al cargar historial' });
        }

        // Obtener resumen (desde resultados)
        const { data: resumenData, error: resError } = await supabase
            .from('resultados')
            .select('mejor_puntaje, intentos_realizados, intentos_agotados, ultima_actualizacion')
            .eq('boleta', boleta);

        if (resError) {
            console.error('Error al obtener resumen:', resError);
        }

        // Calcular mejores puntajes por cuestionario (desde historial)
        const mejoresPorCuestionario = {};
        for (const r of historial) {
            const key = r.cuestionarios.video_id;
            if (!mejoresPorCuestionario[key] || r.puntaje > mejoresPorCuestionario[key].puntaje) {
                mejoresPorCuestionario[key] = {
                    video_titulo: r.cuestionarios.video.titulo,
                    puntaje: r.puntaje,
                    intento: r.intento_numero,
                    completado_at: r.completado_at
                };
            }
        }

        // Construir respuesta
        const resumen = {
            total_intentos: historial.length,
            promedio_general: historial.reduce((sum, r) => sum + r.puntaje, 0) / historial.length || 0,
            cuestionarios_completados: Object.keys(mejoresPorCuestionario).length,
            mejores_puntajes: Object.values(mejoresPorCuestionario),
            intentos_agotados: resumenData?.[0]?.intentos_agotados || false,
            mejor_puntaje_general: resumenData?.[0]?.mejor_puntaje || null
        };

        res.json({
            historial,
            resumen
        });

    } catch (error) {
        console.error('Error en obtenerResultados:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Guardar un nuevo resultado (cuando el alumno responde un cuestionario)
const guardarResultado = async (req, res) => {
    try {
        const { cuestionario_id, respuestas } = req.body;
        const boleta = req.user.boleta;

        if (!cuestionario_id || !respuestas) {
            return res.status(400).json({ error: 'Cuestionario y respuestas son requeridos' });
        }

        // Obtener el cuestionario para calcular el puntaje
        const { data: cuestionario, error: quizError } = await supabase
            .from('cuestionarios')
            .select('preguntas')
            .eq('id', cuestionario_id)
            .single();

        if (quizError) {
            console.error('Error al obtener cuestionario:', quizError);
            return res.status(404).json({ error: 'Cuestionario no encontrado' });
        }

        // Calcular puntaje
        const preguntas = cuestionario.preguntas.preguntas;
        let aciertos = 0;
        preguntas.forEach((pregunta, index) => {
            if (respuestas[index] === pregunta.respuesta_correcta) {
                aciertos++;
            }
        });
        const puntaje = Math.round((aciertos / preguntas.length) * 100);

        // Verificar cuántos intentos tiene el alumno
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

        // Guardar el resultado en el historial
        const { data: resultado, error } = await supabase
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
            console.error('Error al guardar resultado:', error);
            return res.status(500).json({ error: 'Error al guardar resultado' });
        }

        // Actualizar o insertar resultados
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
                // Loguear error
            }
        } catch (upsertError) {
            console.error('Error en upsert de resultados:', upsertError);
            //Loguear error
        }

        // Obtener el mejor puntaje del alumno en este cuestionario
        const { data: mejores } = await supabase
            .from('alumno_contesta_cuestionario')
            .select('puntaje')
            .eq('boleta', boleta)
            .eq('cuestionario_id', cuestionario_id)
            .order('puntaje', { ascending: false })
            .limit(1);

        const mejorPuntaje = mejores && mejores.length > 0 ? mejores[0].puntaje : puntaje;

        res.status(201).json({
            mensaje: 'Resultado guardado exitosamente',
            resultado,
            mejor_puntaje: mejorPuntaje,
            intentos_restantes: MAX_INTENTOS - intentoActual,
            es_mejor_puntaje: puntaje >= mejorPuntaje
        });

    } catch (error) {
        console.error('Error en guardarResultado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener el mejor puntaje de un alumno en un cuestionario específico
const obtenerMejorPuntaje = async (req, res) => {
    try {
        const boleta = req.user.boleta;
        const { cuestionario_id } = req.params;

        // Intentar obtener desde resultados
        const { data: resultado, error: resError } = await supabase
            .from('resultados')
            .select('mejor_puntaje, intentos_realizados, intentos_agotados, ultima_actualizacion')
            .eq('boleta', boleta)
            .eq('cuestionario_id', cuestionario_id)
            .maybeSingle();

        if (resError) {
            console.error('Error al obtener mejor puntaje desde resultados:', resError);
            return res.status(500).json({ error: 'Error al obtener mejor puntaje' });
        }

        // Si no hay en resultados, buscamos en historial
        if (!resultado) {
            const { data: mejor } = await supabase
                .from('alumno_contesta_cuestionario')
                .select('puntaje, intento_numero, completado_at')
                .eq('boleta', boleta)
                .eq('cuestionario_id', cuestionario_id)
                .order('puntaje', { ascending: false })
                .limit(1);

            return res.json({
                mejor_puntaje: mejor && mejor.length > 0 ? mejor[0] : null,
                desde: 'historial'
            });
        }

        res.json({
            mejor_puntaje: {
                puntaje: resultado.mejor_puntaje,
                intentos_realizados: resultado.intentos_realizados,
                intentos_agotados: resultado.intentos_agotados,
                ultima_actualizacion: resultado.ultima_actualizacion
            },
            desde: 'resultados'
        });

    } catch (error) {
        console.error('Error en obtenerMejorPuntaje:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Función para generar la gráfica
const obtenerGrafica = async (req, res) => {
    try {
        const boleta = req.user.boleta;

        console.log(`Generando gráfica para usuario: ${boleta}`);

        // Obtener todos los intentos del usuario
        const { data: intentos, error } = await supabase
            .from('alumno_contesta_cuestionario')
            .select(`
                id,
                intento_numero,
                puntaje,
                completado_at,
                cuestionarios!inner (
                    id,
                    video_id,
                    videos!inner (
                        id,
                        titulo
                    )
                )
            `)
            .eq('boleta', boleta)
            .order('completado_at', { ascending: true });

        if (error) {
            console.error('Error al obtener intentos:', error);
            return res.status(500).json({ error: 'Error al obtener datos para la gráfica' });
        }

        if (!intentos || intentos.length === 0) {
            return res.json({
                existe: false,
                mensaje: 'No has respondido ningún cuestionario aún',
                graficas: []
            });
        }

        // Agrupar por video
        const videosMap = new Map();

        for (const intento of intentos) {
            const videoId = intento.cuestionarios.videos.id;
            const videoTitulo = intento.cuestionarios.videos.titulo;
            const cuestionarioId = intento.cuestionarios.id;

            if (!videosMap.has(videoId)) {
                videosMap.set(videoId, {
                    video_id: videoId,
                    video_titulo: videoTitulo,
                    cuestionario_id: cuestionarioId,
                    intentos: []
                });
            }

            videosMap.get(videoId).intentos.push({
                numero: intento.intento_numero,
                puntaje: intento.puntaje,
                fecha: intento.completado_at
            });
        }

        // Procesar cada video para obtener estadísticas
        const graficas = [];

        for (const [videoId, data] of videosMap) {
            // Ordenar intentos por número
            data.intentos.sort((a, b) => a.numero - b.numero);

            const puntajes = data.intentos.map(i => i.puntaje);
            const totalIntentos = puntajes.length;

            // Calcular estadísticas
            const mejorPuntaje = Math.max(...puntajes);
            const promedio = Math.round(puntajes.reduce((a, b) => a + b, 0) / totalIntentos);
            const progreso = totalIntentos > 1 ? puntajes[puntajes.length - 1] - puntajes[0] : 0;
            const intentosRestantes = 3 - totalIntentos;
            const intentosAgotados = totalIntentos >= 3;

            graficas.push({
                video_id: data.video_id,
                video_titulo: data.video_titulo,
                cuestionario_id: data.cuestionario_id,
                intentos: data.intentos,
                estadisticas: {
                    mejorPuntaje,
                    promedio,
                    progreso,
                    totalIntentos,
                    intentosRestantes,
                    intentosAgotados
                }
            });
        }

        // Ordenar por fecha del último intento (más reciente primero)
        graficas.sort((a, b) => {
            const fechaA = a.intentos[a.intentos.length - 1]?.fecha || new Date(0);
            const fechaB = b.intentos[b.intentos.length - 1]?.fecha || new Date(0);
            return new Date(fechaB) - new Date(fechaA);
        });

        console.log(`${graficas.length} gráficas generadas`);

        res.json({
            existe: true,
            total: graficas.length,
            graficas: graficas
        });

    } catch (error) {
        console.error('Error en obtenerGrafica:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = {
    obtenerResultados,
    guardarResultado,
    obtenerMejorPuntaje,
    obtenerGrafica
};