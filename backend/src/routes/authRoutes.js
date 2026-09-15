// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { verificarIdentidad, 
        validarCredencialQR, 
        registrarUsuarioCompleto, 
        loginUsuario, 
        verificarCorreo,
        solicitarRecuperacion,
        validarTokenRecuperacion,
        restablecerPassword
     } = require('../controllers/authController');
const {verificarToken} = require('../middleware/auth');

// Rutas para el flujo de registro

router.post('/verificar-identidad', verificarIdentidad);
router.post('/validar-credencial', validarCredencialQR);
router.post('/registro-completo', registrarUsuarioCompleto);

// Ruta para el login
router.post('/login', loginUsuario);

router.get('/perfil', verificarToken, (req, res) => {
    res.json({
        mensaje: 'Acceso autorizado',
        usuario: req.user
    });
});

router.get('/verificar-correo/:token',verificarCorreo);
router.post('/recuperar-solicitar', solicitarRecuperacion);
router.get('/recuperar-validar/:token', validarTokenRecuperacion);
router.post('/recuperar-restablecer', restablecerPassword);



module.exports = router;