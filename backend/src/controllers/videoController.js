const supabase = require('../config/supabase');
const fs = require('fs');
const {extraerAudio, limpiarArchivo, comprimirVideo } = require('../services/videoProcessor');
const {transcribirAudio } = require('../services/whisperService');
const {generarCuestionario} = require ('../services/ollamaService');
const {moderarContenido} = require ('../services/moderacionService');
const { validarContenidoVideo} = require('../services/validacionVideoService');
const { cloudinary, eliminarArchivo } = require('../config/cloudinary');


// Obtener todos los videos del feed
const obtenerVideos = async (req, res) => {
    try {
        const { data: videos, error } = await supabase
            .from('videos')
            .select(`
                id,
                titulo,
                descripcion,
                url_video,
                thumbnail_url,
                duracion,
                vistas,
                created_at,
                usuarios!videos_boleta_fkey (boleta, nombre, avatar_url)
            `)
            .eq('es_publico', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error al obtener videos:', error);
            return res.status(500).json({ error: 'Error al cargar videos' });
        }

        res.json(videos);
    } catch (error) {
        console.error('Error en obtenerVideos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener un video por ID
const obtenerVideoPorId = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: video, error } = await supabase
            .from('videos')
            .select(`
                *,
                usuarios!videos_boleta_fkey (boleta, nombre, avatar_url)
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error al obtener video:', error);
            return res.status(404).json({ error: 'Video no encontrado' });
        }

        // Incrementar vistas (en segundo plano)
        await supabase
            .from('videos')
            .update({ vistas: video.vistas + 1 })
            .eq('id', id);

        res.json(video);
    } catch (error) {
        console.error('Error en obtenerVideoPorId:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//Función de crear video
const crearVideo = async (req, res) => {
    let videoLocalPath = null;
    let videoParaProcesar = null;
    let audioPath = null;

    try {
        const { titulo, descripcion } = req.body;
        const boleta = req.user?.boleta;

        console.log('Datos recibidos:', { titulo, descripcion });
        console.log('Usuario autenticado:', boleta);

        // Validaciones básicas
        if (!boleta) {
            return res.status(400).json({ error: 'Usuario no identificado' });
        }

        if (!titulo) {
            return res.status(400).json({ error: 'Título es obligatorio' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún video' });
        }

        videoLocalPath = req.file.path;
        console.log('Video guardado en:', videoLocalPath);

        // Comprimir video
        console.log('Comprimiendo video...');
        const nombreBase = path.parse(videoLocalPath).name;
        const directorio = path.dirname(videoLocalPath);
        const videoComprimidoPath = path.join(directorio, `${nombreBase}_comprimido.mp4`);

        let videoParaProcesar = videoLocalPath;

        try {
            await comprimirVideo(videoLocalPath, videoComprimidoPath);
            console.log('Video comprimido correctamente');
            videoParaProcesar = videoComprimidoPath;
        } catch (error) {
            console.warn('La compresión falló, usando video original');
            videoParaProcesar = videoLocalPath;
        }

        // Moderación de título y descripción
        console.log('Moderando título...');
        const moderarTitulo = await moderarContenido(titulo);
        if (!moderarTitulo.aprobado) {
            return res.status(400).json({
                error: `El título contiene lenguaje inapropiado: ${moderarTitulo.razon}`
            });
        }
        console.log('Título aprobado');

        if (descripcion) {
            console.log('Moderando descripción...');
            const moderarDescripcion = await moderarContenido(descripcion);
            if (!moderarDescripcion.aprobado) {
                return res.status(400).json({
                    error: `La descripción contiene lenguaje inapropiado: ${moderarDescripcion.razon}`
                });
            }
            console.log('Descripción aprobada');
        }

        // Extracción de audio y transcripción
        let transcripcion = null;

        try {
            console.log('Extrayendo audio del video...');
            audioPath = await extraerAudio(videoParaProcesar);
            console.log('Audio extraído en:', audioPath);

            try {
                console.log('Transcribiendo con Whisper...');
                transcripcion = await transcribirAudio(audioPath);
                console.log('Transcripción obtenida');
                console.log('Transcripción:', transcripcion.substring(0, 100) + '...');
            } catch (whisperError) {
                console.warn('Error en Whisper:', whisperError.message);
            }

            limpiarArchivo(audioPath);
            audioPath = null;

        } catch (audioError) {
            console.warn('Error al extraer audio:', audioError.message);
        }

        // Validación de contenido relacionado al temario ADS de ESCOM
        let validacion = null;

        if (transcripcion) {
            try {
                console.log('Validando contenido con el temario ADS...');
                validacion = await validarContenidoVideo(titulo, descripcion, transcripcion);
                console.log('Validación completada');
                console.log(`Relevante: ${validacion.es_relevante}`);
                console.log(`Confianza: ${validacion.confianza}%`);
                console.log(`Unidad: ${validacion.unidad_tematica_relacionada}`);
                console.log(`Temas: ${validacion.temas_detectados?.join(', ') || 'Ninguno'}`);

                // Si el video NO es relevante, rechazar
                if (!validacion.es_relevante) {
                    console.log(`Video rechazado: No es relevante para ADS`);
                    return res.status(400).json({
                        error: 'El video no está relacionado con la materia Análisis y Diseño de Sistemas.',
                        detalle: validacion.razon,
                        validacion: {
                            es_relevante: false,
                            confianza: validacion.confianza,
                            unidad: validacion.unidad_tematica_relacionada,
                            temas: validacion.temas_detectados || []
                        }
                    });
                }

                // Si la confianza es baja, mostrar advertencia pero permitir
                if (validacion.confianza < 50) {
                    console.log(`Confianza baja (${validacion.confianza}%). Se publica con advertencia.`);
                }

            } catch (error) {
                console.error('Error en validación de contenido:', error.message);
                // Si falla la validación, permitimos el video por seguridad, pero registramos el error
                console.log('Validación fallida. Video aceptado por seguridad.');
            }
        } else {
            console.log('No hay transcripción, omitiendo validación de contenido');
        }

        // Subir video a Cloudinary
        console.log('Subiendo video a Cloudinary...');
        
        const result = await cloudinary.uploader.upload(videoParaProcesar, {
            folder: 'plataforma-escom/videos',
            resource_type: 'video',
            chunk_size: 6000000,
            quality: 'auto:good',
            video_codec: 'h264',
            audio_codec: 'aac'
        });

        const urlVideo = result.secure_url;
        const publicIdVideo = result.public_id;
        const duracionVideo = Math.round(result.duration || 0);

        console.log('   Video subido a Cloudinary:');
        console.log('   URL:', urlVideo);
        console.log('   Public ID:', publicIdVideo);
        console.log('   Duración:', duracionVideo);

        // Generar thumbnail
        console.log('Generando thumbnail...');
        
        const thumbnailUrl = cloudinary.url(publicIdVideo, {
            resource_type: 'video',
            format: 'jpg',
            width: 640,
            height: 360,
            crop: 'fill',
            quality: 'auto'
        });

        console.log('Thumbnail generado:', thumbnailUrl);

        // Guardar en Supabase
        const { data: nuevoVideo, error } = await supabase
            .from('videos')
            .insert({
                boleta,
                titulo,
                descripcion: descripcion || null,
                url_video: urlVideo,
                public_id_video: publicIdVideo,
                duracion: duracionVideo,
                thumbnail_url: thumbnailUrl,
                transcripcion: transcripcion || null,
                vistas: 0,
                // Guardar datos de validación
                es_relevante: validacion?.es_relevante ?? null,
                confianza_validacion: validacion?.confianza ?? null,
                unidad_tematica: validacion?.unidad_tematica_relacionada ?? null,
                temas_detectados: validacion?.temas_detectados ?? null
            })
            .select()
            .single();

        if (error) {
            await eliminarArchivo(publicIdVideo, 'video');
            console.error('Error al guardar video:', error);
            return res.status(500).json({ error: 'Error al publicar video' });
        }

        console.log('Video guardado con ID:', nuevoVideo.id);

        // Generación del cuestionario
        let cuestionariosGenerados = null;

        if (transcripcion && validacion?.es_relevante !== false) {
            try {
                console.log('Generando 3 cuestionarios con Ollama...');
                cuestionariosGenerados = await generarCuestionario(transcripcion);
                console.log('3 cuestionarios generados correctamente');

        // Guardar cada conjunto en Supabase
        const conjuntos = [
            { numero: 1, preguntas: cuestionariosGenerados.conjunto_1 },
            { numero: 2, preguntas: cuestionariosGenerados.conjunto_2 },
            { numero: 3, preguntas: cuestionariosGenerados.conjunto_3 }
        ];

        let erroresGuardado = 0;

        for (const conjunto of conjuntos) {
            const { error: quizError } = await supabase
                .from('cuestionarios')
                .insert({
                    video_id: nuevoVideo.id,
                    conjunto_numero: conjunto.numero,
                    preguntas: conjunto.preguntas
                });

            if (quizError) {
                console.error(`Error al guardar conjunto ${conjunto.numero}:`, quizError);
                erroresGuardado++;
            } else {
                console.log(`Conjunto ${conjunto.numero} guardado en Supabase`);
            }
        }

        if (erroresGuardado === 0) {
            console.log('Todos los conjuntos guardados correctamente');
        } else {
            console.warn(`${erroresGuardado} conjunto(s) no se guardaron correctamente`);
        }

    } catch (ollamaError) {
        console.error('Error en Ollama:', ollamaError.message);
        // No se bloquea la publicación si falla la generación del cuestionario
    }
} else {
    console.log('No hay transcripción o video no relevante, omitiendo cuestionario');
}

        // Respuesta de que el video fue publicado
        const respuesta = {
            mensaje: 'Video publicado exitosamente',
            video: nuevoVideo,
            cuestionario_generado: cuestionario !== null
        };

        // Si hubo validación, incluir los resultados
        if (validacion) {
            respuesta.validacion = {
                es_relevante: validacion.es_relevante,
                confianza: validacion.confianza,
                unidad: validacion.unidad_tematica_relacionada,
                temas: validacion.temas_detectados || []
            };
        }

        res.status(201).json(respuesta);

    } catch (error) {
        console.error('Error en crearVideo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (videoLocalPath && fs.existsSync(videoLocalPath)) {
            limpiarArchivo(videoLocalPath);
            console.log('Video local eliminado');
        }
        if (videoParaProcesar && videoParaProcesar !== videoLocalPath && fs.existsSync(videoParaProcesar)){
            limpiarArchivo(videoParaProcesar);
            console.log('Video comprimido eliminado');
        }
        if (audioPath && fs.existsSync(audioPath)) {
            limpiarArchivo(audioPath);
        }
    }
};

// Actualizar un video
const actualizarVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, descripcion } = req.body;
        const boleta = req.user.boleta;

        if(titulo){
            console.log('Moderando nuevo título');
            moderarTitulo = await moderarContenido(titulo);
            if(!moderarTitulo.aprobado){
                return res.status(400).json({
                    error: `El nuevo título contiene lenguaje inapropiado: ${moderarTitulo.razon}`
                });
            }
            console.log('Nuevo título actualizado');
        }

        if(descripcion){
            console.log('Moderando nueva descripción');
            moderarDescripcion = await moderarContenido(descripcion);
            if(!moderarDescripcion.aprobado){
                return res.status(400).json({
                   error: `La nueva descripción contiene lenguaje inapropiado: ${moderarDescripcion.razon}`
                });
            }
            console.log('Nueva descripción actualizada');
        }

        const { data: video, error } = await supabase
            .from('videos')
            .update({ titulo, descripcion })
            .eq('id', id)
            .eq('boleta', boleta)
            .select()
            .single();

        if (error) {
            console.error('Error al actualizar video:', error);
            return res.status(404).json({ error: 'Video no encontrado o no autorizado' });
        }

        res.json({
            mensaje: 'Video actualizado correctamente',
            video
        });
    } catch (error) {
        console.error('Error en actualizarVideo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Eliminar un video
const eliminarVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const boleta = req.user.boleta;

        console.log(`Solicitando eliminar video ID: ${id}`);
        console.log(`Usuario: ${boleta}`);

        // Obtener el video de la base de datos mediante el public_id
        const { data: video, error: findError } = await supabase
            .from('videos')
            .select('public_id_video, boleta')
            .eq('id', id)
            .single();

        if (findError || !video) {
            console.error('Video no encontrado:', findError);
            return res.status(404).json({ error: 'Video no encontrado' });
        }

        // Verificar que el usuario es el autor del video
        if (video.boleta !== boleta) {
            console.warn(`Usuario no autorizado: ${boleta}`);
            return res.status(403).json({ 
                error: 'No tienes permiso para eliminar este video' 
            });
        }

        // Eliminar de Cloudinary
        if (video.public_id_video) {
            console.log(`Eliminando de Cloudinary: ${video.public_id_video}`);
            await eliminarArchivo(video.public_id_video, 'video');
            console.log('Eliminado de Cloudinary');
        } else {
            console.log('El video no tiene public_id en Cloudinary');
        }

        // Eliminar de Supabase
        const { error: deleteError } = await supabase
            .from('videos')
            .delete()
            .eq('id', id)
            .eq('boleta', boleta);

        if (deleteError) {
            console.error('Error al eliminar de Supabase:', deleteError);
            return res.status(500).json({ error: 'Error al eliminar video' });
        }

        console.log('Video eliminado completamente');
        res.json({ 
            mensaje: 'Video eliminado correctamente' 
        });

    } catch (error) {
        console.error('Error en eliminarVideo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener videos de un usuario específico
const obtenerVideosPorNombre = async (req, res) => {
    try {
        const { nombre } = req.params;

        console.log('Buscando usuario por nombre:', nombre);

        // 1. Buscar al usuario por su nombre
        const { data: usuarioEncontrado, error: errorUsuario } = await supabase
            .from('usuarios')
            .select('boleta, nombre, avatar_url')
            .ilike('nombre_usuario', nombre)
            .maybeSingle();

        if (errorUsuario) {
            console.error('Error al buscar usuario:', errorUsuario);
            return res.status(500).json({ error: 'Error al buscar usuario' });
        }

        if (!usuarioEncontrado) {
            console.log('Usuario no encontrado:', nombre);
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        console.log('Usuario encontrado:', usuarioEncontrado);

        // 2. Obtener los videos de ese usuario
        const { data: videos, error } = await supabase
            .from('videos')
            .select(`
                id,
                titulo,
                descripcion,
                url_video,
                thumbnail_url,
                duracion,
                vistas,
                created_at,
                usuarios!videos_boleta_fkey (boleta, nombre, avatar_url)
            `)
            .eq('boleta', usuarioEncontrado.boleta)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error al obtener videos:', error);
            return res.status(500).json({ error: 'Error al cargar videos' });
        }

        console.log(` ${videos.length} videos encontrados para ${usuarioEncontrado.nombre}`);

        res.json({
            usuario: {
                nombre: usuarioEncontrado.nombre_usuario,
                avatar_url: usuarioEncontrado.avatar_url
            },
            videos: videos
        });

    } catch (error) {
        console.error('Error en obtenerVideosPorNombre:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Buscar videos con título, descripción y nombre de usuario
const buscarVideos = async (req, res) => {
    try {
        const { q } = req.query;  // q = término de búsqueda

        console.log('Buscando:', q);

        // Si no hay término de búsqueda, devolver videos recientes
        if (!q || q.trim().length === 0) {
            const { data: videos, error } = await supabase
                .from('videos')
                .select(`
                    id,
                    titulo,
                    descripcion,
                    url_video,
                    thumbnail_url,
                    duracion,
                    vistas,
                    created_at,
                    usuarios!videos_boleta_fkey (boleta, nombre, avatar_url)
                `)
                .eq('es_publico', true)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) {
                console.error('Error al obtener videos:', error);
                return res.status(500).json({ error: 'Error al cargar videos' });
            }

            return res.json(videos);
        }

        const termino = q.trim();

        // Buscar por título o descripción
        const { data: videosPorContenido, error: errorContenido } = await supabase
            .from('videos')
            .select(`
                id,
                titulo,
                descripcion,
                url_video,
                thumbnail_url,
                duracion,
                vistas,
                created_at,
                usuarios!videos_boleta_fkey (boleta, nombre, avatar_url)
            `)
            .or(`titulo.ilike.%${termino}%,descripcion.ilike.%${termino}%`)
            .eq('es_publico', true)
            .order('created_at', { ascending: false });

        if (errorContenido) {
            console.error('Error en búsqueda por contenido:', errorContenido);
            return res.status(500).json({ error: 'Error al buscar videos' });
        }

        // Buscar por nombre de usuario

        // Primero, encontrar usuarios que coincidan con el término
        const { data: usuarios, error: errorUsuarios } = await supabase
            .from('usuarios')
            .select('boleta, nombre, avatar_url')
            .ilike('nombre_usuario', `%${termino}%`);

        if (errorUsuarios) {
            console.error('Error al buscar usuarios:', errorUsuarios);
            // Si falla la búsqueda por usuario, solo devolvemos los resultados por contenido
            return res.json(videosPorContenido);
        }

        let videosPorUsuario = [];

        // Si se encontraron usuarios, buscar sus videos
        if (usuarios && usuarios.length > 0) {
            const boletas = usuarios.map(u => u.boleta);

            const { data: videos, error: errorVideosUsuario } = await supabase
                .from('videos')
                .select(`
                    id,
                    titulo,
                    descripcion,
                    url_video,
                    thumbnail_url,
                    duracion,
                    vistas,
                    created_at,
                    usuarios!videos_boleta_fkey (boleta, nombre, avatar_url)
                `)
                .in('boleta', boletas)
                .eq('es_publico', true)
                .order('created_at', { ascending: false });

            if (!errorVideosUsuario) {
                videosPorUsuario = videos || [];
            }
        }

        // Combinar resultados sin duplicados
        const idsVistos = new Set();
        const resultados = [];

        // Primero agregar videos por contenido (más relevantes)
        for (const video of videosPorContenido) {
            if (!idsVistos.has(video.id)) {
                idsVistos.add(video.id);
                resultados.push(video);
            }
        }

        // Luego agregar videos por usuario (si no están ya)
        for (const video of videosPorUsuario) {
            if (!idsVistos.has(video.id)) {
                idsVistos.add(video.id);
                resultados.push(video);
            }
        }

        // Ordenar por fechas (del más reciente al más antiguo)
        resultados.sort((a, b) => {
            return new Date(b.created_at) - new Date(a.created_at);
        });

        console.log(`${resultados.length} resultados encontrados para "${termino}"`);
        res.json(resultados);

    } catch (error) {
        console.error('Error en buscarVideos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = {
    obtenerVideos,
    obtenerVideoPorId,
    crearVideo,
    actualizarVideo,
    eliminarVideo,
    obtenerVideosPorNombre,
    buscarVideos
};