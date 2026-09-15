const supabase = require('../config/supabase');

// Obtener todos los autores de un documento
const obtenerAutoresDocumento = async (req, res) => {
    try {
        const { documento_id } = req.params;

        const { data: autores, error } = await supabase
            .from('alumno_publica_documento')
            .select(`
                boleta,
                es_autor_principal,
                fecha_publicacion,
                usuarios (nombre, avatar_url)
            `)
            .eq('documento_id', documento_id)
            .order('es_autor_principal', { ascending: false });

        if (error) {
            console.error('Error al obtener autores:', error);
            return res.status(500).json({ error: 'Error al obtener autores' });
        }

        res.json(autores);
    } catch (error) {
        console.error('Error en obtenerAutoresDocumento:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener todos los documentos publicados por un alumno
const obtenerDocumentosPublicados = async (req, res) => {
    try {
        const { boleta } = req.params;

        const { data: publicaciones, error } = await supabase
            .from('alumno_publica_documento')
            .select(`
                documento_id,
                es_autor_principal,
                fecha_publicacion,
                materiales!inner (id, titulo, tipo_archivo, descargas)
            `)
            .eq('boleta', boleta)
            .order('fecha_publicacion', { ascending: false });

        if (error) {
            console.error('Error al obtener publicaciones:', error);
            return res.status(500).json({ error: 'Error al obtener publicaciones' });
        }

        res.json(publicaciones);
    } catch (error) {
        console.error('Error en obtenerDocumentosPublicados:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Registrar publicación de documento
const registrarPublicacionDocumento = async (req, res) => {
    try {
        const { documento_id, es_autor_principal } = req.body;
        const boleta = req.user.boleta;

        if (!documento_id) {
            return res.status(400).json({ error: 'Documento ID es obligatorio' });
        }

        // Verificar si ya existe
        const { data: existe, error: checkError } = await supabase
            .from('alumno_publica_documento')
            .select('id')
            .eq('boleta', boleta)
            .eq('documento_id', documento_id)
            .maybeSingle();

        if (checkError) {
            console.error('Error al verificar existencia:', checkError);
            return res.status(500).json({ error: 'Error al verificar existencia' });
        }

        if (existe) {
            return res.status(400).json({ error: 'Ya has publicado este documento' });
        }

        const { data: publicacion, error } = await supabase
            .from('alumno_publica_documento')
            .insert({
                boleta,
                documento_id,
                es_autor_principal: es_autor_principal !== undefined ? es_autor_principal : true
            })
            .select()
            .single();

        if (error) {
            console.error('Error al registrar publicación:', error);
            return res.status(500).json({ error: 'Error al registrar publicación' });
        }

        res.status(201).json({
            mensaje: 'Publicación de documento registrada correctamente',
            publicacion
        });
    } catch (error) {
        console.error('Error en registrarPublicacionDocumento:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Eliminar publicación de documento
const eliminarPublicacionDocumento = async (req, res) => {
    try {
        const { documento_id } = req.params;
        const boleta = req.user.boleta;

        const { error } = await supabase
            .from('alumno_publica_documento')
            .delete()
            .eq('boleta', boleta)
            .eq('documento_id', documento_id);

        if (error) {
            console.error('Error al eliminar publicación:', error);
            return res.status(500).json({ error: 'Error al eliminar publicación' });
        }

        res.json({ mensaje: 'Publicación de documento eliminada correctamente' });
    } catch (error) {
        console.error('Error en eliminarPublicacionDocumento:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = {
    obtenerAutoresDocumento,
    obtenerDocumentosPublicados,
    registrarPublicacionDocumento,
    eliminarPublicacionDocumento
};