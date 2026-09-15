const supabase = require('../config/supabase');
const { moderarContenido } = require('../services/moderacionService');
const { cloudinary } = require('../config/cloudinary');
const { eliminarArchivo } = require('../config/cloudinary');

// Obtener todos los materiales (público)
const obtenerMateriales = async (req, res) => {
    try {
        const { data: materiales, error } = await supabase
            .from('materiales')
            .select(`
                *,
                usuarios!inner (nombre, avatar_url)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(materiales);
    } catch (error) {
        console.error('Error al obtener materiales:', error);
        res.status(500).json({ error: 'Error al cargar materiales' });
    }
};

// Obtener materiales de un usuario por nombre
const obtenerMaterialesPorNombre = async (req, res) => {
    try {
        const { nombre } = req.params;

        // Buscar usuario por nombre
        const { data: usuario, error: userError } = await supabase
            .from('usuarios')
            .select('boleta, nombre, avatar_url')
            .ilike('nombre', nombre)
            .maybeSingle();

        if (userError || !usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Obtener sus materiales
        const { data: materiales, error } = await supabase
            .from('materiales')
            .select('*')
            .eq('boleta', usuario.boleta)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            usuario: {
                nombre: usuario.nombre,
                avatar_url: usuario.avatar_url
            },
            materiales
        });
    } catch (error) {
        console.error('Error al obtener materiales del usuario:', error);
        res.status(500).json({ error: 'Error al cargar materiales' });
    }
};

// Subir un nuevo material
const subirMaterial = async (req, res) => {
    try {
        const { titulo, descripcion, video_id } = req.body;
        const boleta = req.user.boleta;

        console.log('Subiendo material:', { titulo, descripcion, video_id });

        // Validaciones
        if (!titulo) {
            return res.status(400).json({ error: 'Título es obligatorio' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }

        // Datos de Cloudinary
        const archivoUrl = req.file.path;           // URL en Cloudinary
        const publicId = req.file.filename;         // Public ID para eliminar después
        const tamañoBytes = req.file.size || 0;      // Tamaño en bytes
        const tipoArchivo = req.file.mimetype || '';

        console.log('   Documento subido a Cloudinary:');
        console.log('   URL:', archivoUrl);
        console.log('   Public ID:', publicId);
        console.log('   Tamaño:', tamañoBytes);

        // Moderación de título y descripción
        console.log('Moderando título del material...');
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

        // 4. Guardar en Supabase
        const { data: material, error } = await supabase
            .from('materiales')
            .insert({
                boleta,
                video_id: video_id || null,
                titulo,
                descripcion: descripcion || null,
                archivo_url: archivoUrl,              // URL de Cloudinary
                public_id_archivo: publicId,          // Para eliminar después
                tipo_archivo: tipoArchivo.split('/').pop(), // Tipo de archivo
                tamaño_bytes: tamañoBytes,
                descargas: 0
            })
            .select()
            .single();

        if (error) {
            // Si falla, eliminar de Cloudinary
            await eliminarArchivo(publicId, 'raw');
            console.error('Error al guardar material:', error);
            return res.status(500).json({ error: 'Error al subir material' });
        }

        console.log('Material guardado con ID:', material.id);
        res.status(201).json({
            mensaje: 'Material subido exitosamente',
            material
        });

    } catch (error) {
        console.error('Error en subirMaterial:', error);
        res.status(500).json({ error: 'Error al subir material' });
    }
};

// Editar material
const editarMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, descripcion } = req.body;
        const boleta = req.user.boleta;

        if(titulo){
            console.log('Moderando nuevo título del material');
            const moderacionTitulo = await moderarContenido(titulo);
            if(!moderacionTitulo.aprobado){
                return res.status(400).json({
                    error: `El nuevo título contiene lenguaje inapropiado: ${moderacionTitulo.razon}`
                });
            }
            console.log('Nuevo título aprobado');
        }

        if(descripcion){
            console.log('Moderando nueva descripción del material');
            const moderarDescripcion = await moderarContenido(descripcion);
            if(!moderarDescripcion.aprobado){
                return res.status(400).json({
                    error: `La nueva descripción contiene lenguaje inapropiado: ${moderarDescripcion.razon}`
                });
            }
            console.log('Nueva descripción aprobada');
        }

        const { data: material, error } = await supabase
            .from('materiales')
            .update({ titulo, descripcion })
            .eq('id', id)
            .eq('boleta', boleta)
            .select()
            .single();

        if (error) {
            return res.status(404).json({ error: 'Material no encontrado o no autorizado' });
        }


        res.json({
            mensaje: 'Material actualizado correctamente',
            material
        });
    } catch (error) {
        console.error('Error al editar material:', error);
        res.status(500).json({ error: 'Error al editar material' });
    }
};

// Eliminar material
const eliminarMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const boleta = req.user.boleta;

        console.log(`Eliminando material ID: ${id}`);
        console.log(`Usuario: ${boleta}`);

        // Obtener el material para conocer el public_id
        const { data: material, error: findError } = await supabase
            .from('materiales')
            .select('public_id_archivo, boleta')
            .eq('id', id)
            .single();

        if (findError || !material) {
            console.error('Material no encontrado:', findError);
            return res.status(404).json({ error: 'Material no encontrado' });
        }

        // Verificar que el usuario es el autor
        if (material.boleta !== boleta) {
            console.warn(`Usuario no autorizado: ${boleta}`);
            return res.status(403).json({ 
                error: 'No tienes permiso para eliminar este material' 
            });
        }

        // Eliminar de Cloudinary
        if (material.public_id_archivo) {
            console.log(`Eliminando de Cloudinary: ${material.public_id_archivo}`);
            await eliminarArchivo(material.public_id_archivo, 'raw');
            console.log('Eliminado de Cloudinary');
        }

        // Eliminar de Supabase
        const { error: deleteError } = await supabase
            .from('materiales')
            .delete()
            .eq('id', id)
            .eq('boleta', boleta);

        if (deleteError) {
            console.error('Error al eliminar de Supabase:', deleteError);
            return res.status(500).json({ error: 'Error al eliminar material' });
        }

        console.log('Material eliminado completamente');
        res.json({ 
            mensaje: 'Material eliminado correctamente' 
        });

    } catch (error) {
        console.error('Error en eliminarMaterial:', error);
        res.status(500).json({ error: 'Error al eliminar material' });
    }
};

// Incrementar contador de descargas
const descargarMaterial = async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener el material
        const { data: material, error: findError } = await supabase
            .from('materiales')
            .select('descargas, public_id_archivo, archivo_url, tipo_archivo, titulo')
            .eq('id', id)
            .single();

        if (findError || !material) {
            return res.status(404).json({ error: 'Material no encontrado' });
        }

        // Incrementar contador
        const nuevasDescargas = (material.descargas || 0) + 1;
        await supabase
            .from('materiales')
            .update({ descargas: nuevasDescargas })
            .eq('id', id);

        // Generar URL de Cloudinary (sin redirigir)
        let url = material.archivo_url;
        const tiposCompresibles = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt'];

        if (material.public_id_archivo && tiposCompresibles.includes(material.tipo_archivo)) {
            url = cloudinary.url(material.public_id_archivo, {
                resource_type: 'raw',
                quality: 'auto:good'
            });
        }

        // Descargar el archivo desde Cloudinary y enviarlo al cliente
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();

        // Configurar headers para forzar la descarga
        const extension = material.tipo_archivo || 'pdf';
        const nombreBase = material.titulo
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .substring(0, 50);
        const nombreArchivo = `${nombreBase}.${extension}`;

        res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(Buffer.from(buffer));

    } catch (error) {
        console.error('Error al descargar material:', error);
        res.status(500).json({ error: 'Error al descargar material' });
    }
};

module.exports = {
    obtenerMateriales,
    obtenerMaterialesPorNombre,
    subirMaterial,
    editarMaterial,
    eliminarMaterial,
    descargarMaterial,
};