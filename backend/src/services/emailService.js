const nodemailer = require('nodemailer');
require('dotenv').config();

// Configurar el transporter de Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Función para enviar correo de verificación
const enviarCorreoVerificacion = async (correo, nombreUsuario, token) => {
    const linkVerificacion = `${process.env.FRONTEND_URL}/verificar-correo?token=${token}`;

    const mailOptions = {
        from: `"Plataforma de videos educativos ADS" <${process.env.EMAIL_USER}>`,
        to: correo,
        subject: 'Verifica tu correo - Plataforma de videos educativos ADS',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h1 style="color: #656cb1; margin-top: 0;">Verifica tu correo</h1>
                    <p>Hola <strong style="color: #8b3c68;">${nombreUsuario}</strong>,</p>
                    <p>Gracias por registrarte en la <strong>Plataforma de videos educativos ADS</strong>.</p>
                    <p>Para activar tu cuenta, haz clic en el siguiente enlace:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${linkVerificacion}" 
                           style="background-color: #606ad3; color: white; padding: 14px 35px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;
                                  font-weight: bold; font-size: 16px;">
                            Verificar mi correo
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">
                        Este enlace expirará en <strong style="color: #5761d1;">24 horas</strong>.
                    </p>
                    <p style="color: #666; font-size: 14px;">
                        Si no creaste esta cuenta, puedes ignorar este correo de manera segura.
                    </p>
                    <hr style="border: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px;">
                        Este es un mensaje automático, por favor no responder a este correo.
                    </p>
                </div>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Correo de verificación enviado a: ${correo}`);
        console.log(`ID del mensaje: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('Error al enviar correo de verificación:', error.message);
        return false;
    }
};

//Función para enviar correo de recuperación de contraseña
const enviarCorreoRecuperacion = async (correo, nombreUsuario, token) => {
    const linkRecuperacion = `${process.env.FRONTEND_URL}/restablecer-password?token=${token}`;

    const mailOptions = {
        from: `"Plataforma de videos educativos ADS" <${process.env.EMAIL_USER}>`,
        to: correo,
        subject: 'Recuperación de contraseña - Plataforma de videos educativos ADS',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h1 style="color: #1a237e; margin-top: 0;">Recuperación de contraseña</h1>
                    <p>Hola <strong style="color: #1a237e;">${nombreUsuario}</strong>,</p>
                    <p>Hemos recibido una solicitud para restablecer tu contraseña en la <strong>Plataforma de videos educativos ADS</strong>.</p>
                    <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${linkRecuperacion}" 
                           style="background-color: #1a237e; color: white; padding: 14px 35px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;
                                  font-weight: bold; font-size: 16px;">
                            Restablecer contraseña
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">
                        Este enlace expirará en <strong style="color: #1a237e;">1 hora</strong>.
                    </p>
                    <p style="color: #666; font-size: 14px;">
                        Si no solicitaste este cambio, puedes ignorar este correo de manera segura.
                    </p>
                    <hr style="border: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px;">
                        Este es un mensaje automático, por favor no responder a este correo.
                    </p>
                </div>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Correo de recuperación enviado a: ${correo}`);
        console.log(`ID del mensaje: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('Error al enviar correo de recuperación:', error.message);
        return false;
    }
};

// Función para verificar la conexión con Gmail
const verificarConexion = async () => {
    try {
        await transporter.verify();
        console.log('Servicio de correo listo');
        return true;
    } catch (error) {
        console.error('Error al conectar con Gmail:', error.message);
        return false;
    }
};

// Verificar conexión al iniciar
verificarConexion();

module.exports = {
    enviarCorreoVerificacion,
    enviarCorreoRecuperacion,
    verificarConexion
};