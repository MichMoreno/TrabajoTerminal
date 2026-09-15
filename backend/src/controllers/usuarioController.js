const supabase = require('../config/supabase');
const bcrypt = require('bcrypt');
const {moderarContenido} = require('../services/moderacionService');
const {eliminarArchivo} = require('../config/cloudinary');
const { encrypt } = require('../services/encryptionService');
const { validarContraseña } = require('../services/passwordValidator');

const LIMITE_CARACTERES_BIO = 200;


// Obtener perfil del usuario autenticado
const obtenerPerfil = async (req, res) => {
    try {
        const boleta = req.user.boleta;

        const { data: usuario, error } = await supabase
            .from('usuarios')
            .select('boleta, nombre, correo, avatar_url, bio, fecha_registro')
            .eq('boleta', boleta)
            .single();

        if (error) {
            console.error('Error al obtener perfil:', error);
            return res.status(500).json({ error: 'Error al obtener perfil' });
        }

        res.json(usuario);
    } catch (error) {
        console.error('Error en obtenerPerfil:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Buscar perfiles
const buscarUsuarios = async (req, res) => {
    try {
        const {q: termino} = req.query;

        console.log('Buscando usuarios:', termino);

        // Si no hay término, devolver array vacío
        if(!termino || termino.trim() === ''){
            return res.json([]);
        }

        const {data: usuarios, error} = await supabase
            .from('usuarios')
            .select('boleta, nombre_usuario, avatar_url, bio')
            .ilike('nombre_usuario', `%${termino}%`)
            .limit(10);
        
        if(error) throw error;

        // Contar videos públicos de cada usuario
        const usuariosConVideos = await Promise.all(
            (usuarios || []).map(async (usuario) => {
                const {count, error: countError} = await supabase
                    .from('videos')
                    .select('*', {count: 'exact', head: true})
                    .eq('boleta', usuario.boleta)
                    .eq('es_publico', true);

                return {
                    ...usuario,
                    total_videos: countError ? 0 : count || 0,
                };
            })
        );

        console.log(`Usuarios encontrados: ${usuariosConVideos.length}`);
        res.json(usuariosConVideos);
    } catch (error) {
        console.log('Error en buscarUsuarios', error);
        res.status(500).json({ error: 'Error en el servidor '});
    }
};

// Obtener el perfil del usuario por nombre
const obtenerUsuarioPorNombre = async (req, res) => {
  try {
    const { nombre_usuario } = req.params;

    console.log('--- DEBUG obtenerUsuarioPorNombre ---');
    console.log('nombre_usuario:', JSON.stringify(nombre_usuario));

    // Consulta 1: Buscar usuario
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('boleta, nombre_usuario, avatar_url, bio')
      .eq('nombre_usuario', nombre_usuario)
      .single();

    console.log('→ Resultado de Supabase:');
    console.log('  data:', JSON.stringify(usuario, null, 2));
    console.log('  error:', JSON.stringify(error, null, 2));

    if (error || !usuario) {
      console.log('→ Usuario no encontrado, devolviendo 404');
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log('→ Usuario encontrado, buscando videos...');

    // Consulta 2: Buscar videos del usuario
    const { data: videos, error: videosError } = await supabase
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
        usuarios!videos_boleta_fkey (boleta, nombre_usuario, avatar_url)
      `)
      .eq('boleta', usuario.boleta)
      .eq('es_publico', true)
      .order('created_at', { ascending: false });

    console.log('→ Videos encontrados:', videos?.length || 0);
    console.log('  videosError:', JSON.stringify(videosError, null, 2));

    if (videosError) throw videosError;

    res.json({
      usuario: {
        ...usuario,
        total_videos: videos?.length || 0,
      },
      videos: videos || [],
    });
  } catch (error) {
    console.error('Error en obtenerUsuarioPorNombre:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

// Actualizar biografía
const actualizarBio = async (req, res) => {
    try {
        const boleta = req.user.boleta;
        const { bio } = req.body;

        if (bio === undefined) {
            return res.status(400).json({ error: 'La biografía es requerida' });
        }

        if (bio.length > LIMITE_CARACTERES_BIO){
            return res.status(400).json({
                error: `La biografía no puede tener más de ${LIMITE_CARACTERES_BIO} caracteres`
            });
        }
        
        console.log('Moderando la biografía');
        const moderarBiografia = await moderarContenido(bio);
        if(!moderarBiografia.aprobado){
            return res.status(400).json({
                error: `La biografía contiene lenguaje inapropiado: ${moderarBiografia.razon}`
            });
        }
        console.log('Biografía apropiada');

        const { data: usuario, error } = await supabase
            .from('usuarios')
            .update({ bio })
            .eq('boleta', boleta)
            .select('boleta, nombre, correo, avatar_url, bio')
            .single();

        if (error) {
            console.error('Error al actualizar biografía:', error);
            return res.status(500).json({ error: 'Error al actualizar biografía' });
        }
        res.json({
            mensaje: 'Biografía actualizada correctamente',
            usuario
        });
    } catch (error) {
        console.error('Error en actualizarBio:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Cambiar contraseña
const cambiarPassword = async (req, res) => {
    try {
        const boleta = req.user.boleta;
        const { password_actual, nueva_password, confirm_password } = req.body;

        // Validar que todos los campos estén presentes
        if (!password_actual || !nueva_password || !confirm_password) {
            return res.status(400).json({ 
                error: 'Contraseña actual, nueva contraseña y confirmación son requeridas' 
            });
        }

        // Validar que la nueva contraseña y la confirmación coincidan
        if (nueva_password !== confirm_password) {
            return res.status(400).json({ 
                error: 'La nueva contraseña y la confirmación no coinciden' 
            });
        }

        // Validar requisitos de la nueva contraseña
        const validacion = validarContraseña(nueva_password);
        if (!validacion.valido) {
            return res.status(400).json({ 
                error: validacion.error 
            });
        }

        // Obtener hash actual
        const { data: usuario, error } = await supabase
            .from('usuarios')
            .select('password_hash')
            .eq('boleta', boleta)
            .single();

        if (error) {
            console.error('Error al obtener usuario:', error);
            return res.status(500).json({ error: 'Error al cambiar contraseña' });
        }

        // Verificar contraseña actual
        const passwordValida = await bcrypt.compare(password_actual, usuario.password_hash);
        if (!passwordValida) {
            return res.status(401).json({ error: 'Contraseña actual incorrecta' });
        }

        // Encriptar nueva contraseña
        const saltRounds = 10;
        const nuevoHash = await bcrypt.hash(nueva_password, saltRounds);

        // Actualizar en Supabase
        const { error: updateError } = await supabase
            .from('usuarios')
            .update({ password_hash: nuevoHash })
            .eq('boleta', boleta);

        if (updateError) {
            console.error('Error al actualizar contraseña:', updateError);
            return res.status(500).json({ error: 'Error al cambiar contraseña' });
        }

        res.json({ 
            mensaje: 'Contraseña actualizada correctamente' 
        });

    } catch (error) {
        console.error('Error en cambiarPassword:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Eliminar cuenta
const eliminarCuenta = async (req, res) => {
    try {
        const boleta = req.user.boleta;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ error: 'Contraseña requerida para eliminar cuenta' });
        }

        // 1. Verificar contraseña
        const { data: usuario, error: userError } = await supabase
            .from('usuarios')
            .select('password_hash')
            .eq('boleta', boleta)
            .single();

        if (userError || !usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const passwordValida = await bcrypt.compare(password, usuario.password_hash);
        if (!passwordValida) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        // Obtener los public_id del usuario
        console.log(`Eliminando archivos de Cloudinary para usuario: ${boleta}`);

        // Obtener videos
        const { data: videos } = await supabase
            .from('videos')
            .select('public_id_video')
            .eq('boleta', boleta);

        // Obtener avatar
        const { data: usuarioData } = await supabase
            .from('usuarios')
            .select('public_id_avatar')
            .eq('boleta', boleta)
            .single();

        // Obtener documentos
        const { data: documentos } = await supabase
            .from('materiales')
            .select('public_id_archivo')
            .eq('boleta', boleta);

        // Eliminar archivos de Cloudinary

        // Eliminar videos
        if (videos && videos.length > 0) {
            for (const video of videos) {
                if (video.public_id_video) {
                    console.log(`Eliminando video: ${video.public_id_video}`);
                    await eliminarArchivo(video.public_id_video, 'video');
                }
            }
        }

        // Eliminar avatar
        if (usuarioData?.public_id_avatar) {
            console.log(`Eliminando avatar: ${usuarioData.public_id_avatar}`);
            await eliminarArchivo(usuarioData.public_id_avatar, 'image');
        }

        // Eliminar documentos
        if (documentos && documentos.length > 0) {
            for (const doc of documentos) {
                if (doc.public_id_archivo) {
                    console.log(`Eliminando documento: ${doc.public_id_archivo}`);
                    await eliminarArchivo(doc.public_id_archivo, 'raw');
                }
            }
        }

        // Eliminar usuario de Supabase
        console.log(`Eliminando usuario de Supabase: ${boleta}`);
        const { error: deleteError } = await supabase
            .from('usuarios')
            .delete()
            .eq('boleta', boleta);

        if (deleteError) {
            console.error('Error al eliminar cuenta:', deleteError);
            return res.status(500).json({ error: 'Error al eliminar cuenta' });
        }

        console.log('Cuenta eliminada completamente');
        res.json({ 
            mensaje: 'Cuenta eliminada correctamente.'
        });

    } catch (error) {
        console.error('Error en eliminarCuenta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Foto de perfil
const actualizarAvatar = async (req, res) => {
    try {
        const boleta = req.user.boleta;

        console.log(`Actualizando avatar para usuario: ${boleta}`);

        // Verificar que se subió una imagen
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ninguna imagen' });
        }

        // Datos de Cloudinary que lo sube de manera automática
        const urlAvatar = req.file.path;        // URL en Cloudinary
        const publicId = req.file.filename;     // Public ID para eliminar después

        console.log('   Avatar subido a Cloudinary:');
        console.log('   URL:', urlAvatar);
        console.log('   Public ID:', publicId);

        // Obtener avatar anterior para eliminarlo de Cloudinary
        const { data: usuario, error: findError } = await supabase
            .from('usuarios')
            .select('public_id_avatar')
            .eq('boleta', boleta)
            .single();

        if (findError && findError.code !== 'PGRST116') {
            console.error('Error al buscar usuario:', findError);
        }

        // Eliminar avatar anterior de Cloudinary si es que existe
        if (usuario?.public_id_avatar) {
            console.log(`Eliminando avatar anterior: ${usuario.public_id_avatar}`);
            await eliminarArchivo(usuario.public_id_avatar, 'image');
            console.log('Avatar anterior eliminado');
        }

        // Actualiza en Supabase
        const { data: usuarioActualizado, error } = await supabase
            .from('usuarios')
            .update({
                avatar_url: urlAvatar,
                public_id_avatar: publicId
            })
            .eq('boleta', boleta)
            .select('boleta, nombre, nombre_usuario, correo, avatar_url, bio')
            .single();

        if (error) {
            console.error('Error al actualizar avatar:', error);
            // Si falla, eliminar el avatar subido de Cloudinary
            await eliminarArchivo(publicId, 'image');
            return res.status(500).json({ error: 'Error al actualizar avatar' });
        }

        console.log('Avatar actualizado exitosamente');
        res.json({
            mensaje: 'Foto de perfil actualizada correctamente',
            usuario: usuarioActualizado
        });

    } catch (error) {
        console.error('Error en actualizarAvatar:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = {
    obtenerPerfil,
    buscarUsuarios,
    obtenerUsuarioPorNombre,
    actualizarBio,
    cambiarPassword,
    eliminarCuenta,
    actualizarAvatar
};