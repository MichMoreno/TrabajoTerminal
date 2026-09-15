const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { validarCredencialConDatos } = require('../services/scrappingService');
const { moderarContenido } = require('../services/moderacionService');
const { encrypt } = require('../services/encryptionService');
const { validarContraseña} = require('../services/passwordValidator');
const { enviarCorreoVerificacion, enviarCorreoRecuperacion } = require('../services/emailService');

// Verificación de identidad
const verificarIdentidad = async (req, res) => {
    try {
        const { boleta, nombreCompleto } = req.body;

        console.log('Verificando identidad:', { boleta, nombreCompleto });

        if (!boleta || !nombreCompleto) {
            return res.status(400).json({
                error: 'La boleta y el nombre completo son obligatorios'
            });
        }

        if (!/^\d{10}$/.test(boleta)) {
            return res.status(400).json({
                error: 'La boleta debe tener 10 dígitos'
            });
        }

        // Verificar que la boleta no esté registrada
        const { data: usuarioExistente, error: checkError } = await supabase
            .from('usuarios')
            .select('boleta')
            .eq('boleta', boleta)
            .maybeSingle();

        if (checkError) {
            console.error('Error al verificar boleta:', checkError);
            return res.status(500).json({ error: 'Error al verificar la boleta' });
        }

        if (usuarioExistente) {
            return res.status(409).json({
                error: 'Ya existe un usuario con esta boleta'
            });
        }

        // Generar token temporal (expira en 15 minutos)
        const tokenVerificacion = jwt.sign(
            { boleta, nombreCompleto, paso: 'identidad_verificada' },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.json({
            mensaje: 'Identidad verificada. Ahora escanea el QR de tu credencial.',
            tokenVerificacion,
            boleta,
            nombreCompleto
        });

    } catch (error) {
        console.error('Error en verificarIdentidad:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Validación QR de la credencial
const validarCredencialQR = async (req, res) => {
    try {
        const { url, tokenVerificacion } = req.body;

        console.log('Validando QR...');

        if (!url || !tokenVerificacion) {
            return res.status(400).json({
                error: 'La URL de la credencial y el token de verificación son obligatorios'
            });
        }

        // Verificar el token
        let datosToken;
        try {
            datosToken = jwt.verify(tokenVerificacion, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(401).json({
                error: 'Token inválido o expirado. Debes verificar tu identidad nuevamente.'
            });
        }

        if (datosToken.paso !== 'identidad_verificada') {
            return res.status(400).json({
                error: 'Token inválido para este paso'
            });
        }

        const { boleta, nombreCompleto } = datosToken;

        // Validar la credencial con los datos
        const resultado = await validarCredencialConDatos(url, boleta, nombreCompleto);

        if (!resultado.valido) {
            return res.status(400).json({
                error: resultado.error
            });
        }

        // Generar nuevo token con verificación completa
        const tokenRegistro = jwt.sign(
            { 
                boleta, 
                nombreCompleto,
                carrera: resultado.datos.carrera,
                escuela: resultado.datos.escuela,
                paso: 'credencial_validada'
            },
            process.env.JWT_SECRET,
            { expiresIn: '30m' }
        );

        res.json({
            mensaje: 'Credencial validada exitosamente. Ahora completa tu registro.',
            tokenRegistro,
            datosCredencial: {
                nombre: resultado.datos.nombre,
                boleta: resultado.datos.boleta,
                carrera: resultado.datos.carrera,
                escuela: resultado.datos.escuela
            }
        });

    } catch (error) {
        console.error('Error en validarCredencialQR:', error);
        res.status(500).json({ error: 'Error interno al procesar la credencial' });
    }
};

// Terminar registro
const registrarUsuarioCompleto = async (req, res) => {
    try {
        const { tokenRegistro, nombreUsuario, correo, password, confirmPassword } = req.body;

        console.log('Completando registro:', { nombreUsuario, correo });

        if (!tokenRegistro || !nombreUsuario || !correo || !password) {
            return res.status(400).json({
                error: 'Token de registro, nombre de usuario, correo y contraseña son obligatorios'
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                error: 'Las contraseñas no coinciden'
            });
        }

        const validacionPassword = validarContraseña(password);
        if(!validacionPassword.valido){
            return res.status(400).json({
                error: validacionPassword.error
            });
        }

        // Verificar token
        let datosToken;
        try {
            datosToken = jwt.verify(tokenRegistro, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(401).json({
                error: 'Token inválido o expirado. Debes reiniciar el proceso de registro.'
            });
        }

        if (datosToken.paso !== 'credencial_validada') {
            return res.status(400).json({
                error: 'El token no corresponde a una credencial validada'
            });
        }

        const { boleta, nombreCompleto, carrera, escuela } = datosToken;

        // Encriptación del nombre
        console.log('Nombre completo original:', nombreCompleto);
        const nombreEncriptado = encrypt(nombreCompleto);

        if (!nombreEncriptado || !nombreEncriptado.includes(':')) {
            console.error('Error al encriptar el nombre');
            return res.status(500).json({ 
                error: 'Error al procesar el nombre. Intenta nuevamente.' 
            });
        }
        console.log('Nombre encriptado correctamente');

        // Validación del correo institucional
        if (!correo.endsWith('@alumno.ipn.mx') && !correo.endsWith('@ipn.mx')) {
            return res.status(400).json({ 
                error: 'Solo correos @alumno.ipn.mx' 
            });
        }

        // Moderación del nombre del usuario
        console.log('Moderando nombre de usuario...');
        const moderacion = await moderarContenido(nombreUsuario);
        if (!moderacion.aprobado) {
            return res.status(400).json({
                error: `El nombre de usuario contiene lenguaje inapropiado: ${moderacion.razon}`
            });
        }

        // Verificación de nombre único de usuario
        console.log(`Verificando nombre de usuario "${nombreUsuario}"...`);
        const { data: nombreExistente, error: nombreError } = await supabase
            .from('usuarios')
            .select('nombre_usuario')
            .eq('nombre_usuario', nombreUsuario)
            .maybeSingle();

        if (nombreError) {
            console.error('Error al verificar nombre de usuario:', nombreError);
            return res.status(500).json({ error: 'Error al verificar nombre de usuario' });
        }

        if (nombreExistente) {
            console.log(`El nombre de usuario "${nombreUsuario}" ya está en uso`);
            return res.status(409).json({
                error: 'El nombre de usuario ya está en uso. Por favor elige otro.',
                campo: 'nombre_usuario',
                sugerencia: 'Intenta agregar números o letras adicionales a tu nombre o elige otro diferente.'
            });
        }
        console.log('Nombre de usuario disponible');

        // Verificación del correo único
        console.log(`Verificando correo "${correo}"...`);
        const { data: correoExistente, error: correoError } = await supabase
            .from('usuarios')
            .select('correo')
            .eq('correo', correo)
            .maybeSingle();

        if (correoError) {
            console.error('Error al verificar correo:', correoError);
            return res.status(500).json({ error: 'Error al verificar correo' });
        }

        if (correoExistente) {
            return res.status(409).json({
                error: 'Ya existe un usuario con este correo'
            });
        }
        console.log('Correo disponible');

        // Encriptación de contraseña
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Guardar usuario con nombre encriptado y nombre de usuario visible
        const { data: nuevoUsuario, error: insertError } = await supabase
            .from('usuarios')
            .insert({
                boleta,
                nombre: nombreEncriptado,
                nombre_usuario: nombreUsuario,
                correo,
                password_hash: passwordHash,
                carrera: carrera,
                escuela: escuela,
                correo_verificado: false
            })
            .select('boleta, nombre, nombre_usuario, correo, avatar_url, bio, carrera, escuela, fecha_registro');

        if (insertError) {
            console.error('Error al registrar usuario:', insertError);
            return res.status(500).json({ 
                error: 'Error al registrar usuario', 
                detalle: insertError.message 
            });
        }

        console.log(`Usuario registrado exitosamente: ${nombreUsuario} (${boleta})`);

        // Enviar correo de verificación
        let emailEnviado = false;
        try {
            const tokenVerificacion = jwt.sign(
                {
                    boleta: nuevoUsuario[0].boleta,
                    correo: nuevoUsuario[0].correo,
                    tipo: 'verificacion_correo'
                },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            emailEnviado = await enviarCorreoVerificacion(
                nuevoUsuario[0].correo,
                nombreUsuario,
                tokenVerificacion
            );

            if (emailEnviado) {
                console.log(`Correo de verificación enviado a: ${nuevoUsuario[0].correo}`);
            } else {
                console.warn(`No se pudo enviar el correo a: ${nuevoUsuario[0].correo}`);
            }
        } catch (emailError) {
            console.error('Error al enviar el correo de verificación:', emailError.message);
        }

        return res.status(201).json({
            mensaje: 'Usuario registrado correctamente. Revisa tu correo para verificar tu cuenta.',
            usuario: nuevoUsuario[0],
            correo_enviado: emailEnviado,
            correo_verificado: false
        });

    } catch (error) {
        console.error('Error en registro completo:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Verificación del correo
const verificarCorreo = async (req, res) => {
    try {
        const { token } = req.params;

        console.log('Verificando correo con token:', token ? 'Token recibido' : 'Sin token');

        if (!token) {
            return res.status(400).json({
                error: "Token de verificación requerido"
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Token verificado:', decoded);
        } catch (error) {
            console.error('Token inválido o expirado:', error.message);
            return res.status(401).json({
                error: 'Token inválido o expirado. Solicita un nuevo enlace de verificación'
            });
        }

        if (decoded.tipo !== 'verificacion_correo') {
            console.error('Tipo de token incorrecto: ', decoded.tipo);
            return res.status(400).json({
                error: 'Token inválido para la verificación del correo'
            });
        }

        const { data: usuario, error: findError } = await supabase
            .from('usuarios')
            .select('boleta, correo, correo_verificado')
            .eq('boleta', decoded.boleta)
            .single();

        if (findError || !usuario) {
            console.error('Usuario no encontrado', findError);
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        if (usuario.correo_verificado === true) {
            console.log('El correo ya estaba verificado');
            return res.status(200).json({
                mensaje: 'El correo ya estaba verificado. Puedes iniciar sesión.'
            });
        }

        const { error: updateError } = await supabase
            .from('usuarios')
            .update({ correo_verificado: true })
            .eq('boleta', decoded.boleta);

        if (updateError) {
            console.error('Error al actualizar correo_verificado:', updateError);
            return res.status(500).json({
                error: 'Error al verificar correo'
            });
        }

        console.log(`Correo verificado correctamente para el usuario ${decoded.boleta}`);

        res.status(200).json({
            mensaje: 'Correo verificado exitosamente. Puedes iniciar sesión.',
            boleta: decoded.boleta,
            correo: usuario.correo
        });

    } catch (error) {
        console.error('Error en verificarCorreo', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Login
const loginUsuario = async (req, res) => {
    try {
        const { correo, password } = req.body;

        if (!correo || !password) {
            return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
        }

        const { data: usuario, error } = await supabase
            .from('usuarios')
            .select('boleta, nombre, nombre_usuario, correo, password_hash, avatar_url, bio, correo_verificado')
            .eq('correo', correo)
            .maybeSingle();

        if (error) {
            console.error('Error al buscar usuario:', error);
            return res.status(500).json({ error: 'Error al iniciar sesión' });
        }

        if (!usuario) {
            return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
        }

        // Verificar que el correo esté confirmado
        if (!usuario.correo_verificado) {
            console.log(`Intento de login con correo no verificado: ${correo}`);
            return res.status(403).json({ 
                error: 'Correo no verificado. Revisa tu bandeja de entrada y haz clic en el enlace de verificación.',
                correo_verificado: false
            });
        }

        const passwordValida = await bcrypt.compare(password, usuario.password_hash);

        if (!passwordValida) {
            return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
        }

        const token = jwt.sign(
            { 
                boleta: usuario.boleta, 
                correo: usuario.correo,
                nombre: usuario.nombre_usuario
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            mensaje: 'Inicio de sesión exitoso',
            token,
            usuario: {
                boleta: usuario.boleta,
                nombre: usuario.nombre_usuario,
                nombre_completo: usuario.nombre,
                correo: usuario.correo,
                avatar_url: usuario.avatar_url,
                bio: usuario.bio,
                correo_verificado: usuario.correo_verificado
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Recuperación de contraseña
const solicitarRecuperacion = async (req, res) => {
    try {
        const { correo } = req.body;

        console.log('Solicitando recuperación para:', correo);

        if (!correo) {
            return res.status(400).json({ error: 'El correo es obligatorio' });
        }

        // Verificar que el correo existe
        const { data: usuario, error } = await supabase
            .from('usuarios')
            .select('boleta, correo, nombre_usuario')
            .eq('correo', correo)
            .maybeSingle();

        if (error) {
            console.error('Error al buscar usuario:', error);
            return res.status(500).json({ error: 'Error al procesar la solicitud' });
        }

        // Por seguridad, no se releva si existe el correo o no
        if (!usuario) {
            console.log(`Correo no registrado: ${correo}`);
            return res.status(200).json({
                mensaje: 'Si el correo está registrado, recibirás un enlace de recuperación.'
            });
        }

        // Generar token de recuperación (expira en 1 hora)
        const tokenRecuperacion = jwt.sign(
            {
                boleta: usuario.boleta,
                correo: usuario.correo,
                tipo: 'recuperacion_password'
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Enviar correo de recuperación
        const emailEnviado = await enviarCorreoRecuperacion(
            usuario.correo,
            usuario.nombre_usuario,
            tokenRecuperacion
        );

        if (!emailEnviado) {
            console.error('Error al enviar correo de recuperación');
            return res.status(500).json({ error: 'Error al enviar el correo de recuperación' });
        }

        console.log(`Correo de recuperación enviado a: ${usuario.correo}`);
        res.json({
            mensaje: 'Se ha enviado un enlace de recuperación a tu correo.',
            correo_enviado: true
        });

    } catch (error) {
        console.error('Error en solicitarRecuperacion:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Validar token de recuperación
const validarTokenRecuperacion = async (req, res) => {
    try {
        const { token } = req.params;

        console.log('Validando token de recuperación...');

        if (!token) {
            return res.status(400).json({ error: 'Token requerido' });
        }

        // Verificar token JWT
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            console.error('Token inválido o expirado:', error.message);
            return res.status(401).json({
                error: 'Token inválido o expirado. Solicita un nuevo enlace de recuperación.'
            });
        }

        if (decoded.tipo !== 'recuperacion_password') {
            console.error('Tipo de token incorrecto:', decoded.tipo);
            return res.status(400).json({ error: 'Token inválido' });
        }

        // Verificar que el usuario existe
        const { data: usuario, error } = await supabase
            .from('usuarios')
            .select('boleta, correo, nombre_usuario')
            .eq('boleta', decoded.boleta)
            .single();

        if (error || !usuario) {
            console.error('Usuario no encontrado:', error);
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        console.log(`Token válido para: ${usuario.nombre_usuario}`);
        res.json({
            mensaje: 'Token válido',
            boleta: usuario.boleta,
            correo: usuario.correo
        });

    } catch (error) {
        console.error('Error en validarTokenRecuperacion:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Restablecer contraseña
const restablecerPassword = async (req, res) => {
    try {
        const { token, nuevaPassword } = req.body;

        console.log('Restableciendo contraseña...');

        if (!token || !nuevaPassword) {
            return res.status(400).json({
                error: 'Token y nueva contraseña son obligatorios'
            });
        }

        // Validar token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            console.error('Token inválido o expirado:', error.message);
            return res.status(401).json({
                error: 'Token inválido o expirado. Solicita un nuevo enlace de recuperación.'
            });
        }

        if (decoded.tipo !== 'recuperacion_password') {
            console.error('Tipo de token incorrecto:', decoded.tipo);
            return res.status(400).json({ error: 'Token inválido' });
        }

        // Validar que la contraseña cumpla con los requisitos
        const validacion = validarContraseña(nuevaPassword);
        if (!validacion.valido) {
            return res.status(400).json({ error: validacion.error });
        }

        // Encriptar nueva contraseña
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(nuevaPassword, saltRounds);

        // Actualizar en Supabase
        const { error: updateError } = await supabase
            .from('usuarios')
            .update({ password_hash: passwordHash })
            .eq('boleta', decoded.boleta);

        if (updateError) {
            console.error('Error al actualizar contraseña:', updateError);
            return res.status(500).json({ error: 'Error al actualizar la contraseña' });
        }

        console.log(`Contraseña actualizada para: ${decoded.boleta}`);
        res.json({
            mensaje: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.'
        });

    } catch (error) {
        console.error('Error en restablecerPassword:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = { 
    verificarIdentidad,
    validarCredencialQR,
    registrarUsuarioCompleto,
    verificarCorreo,
    validarContraseña,
    loginUsuario,
    solicitarRecuperacion,
    validarTokenRecuperacion,
    restablecerPassword
};