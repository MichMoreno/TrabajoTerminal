const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const { uploadAvatar } = require('../config/cloudinary');
const { verificarLimiteAvatar } = require('../middleware/limiteAvatar');
const {
    obtenerPerfil,
    actualizarBio,
    cambiarPassword,
    eliminarCuenta,
    actualizarAvatar,
    buscarUsuarios,
    obtenerUsuarioPorNombre
} = require('../controllers/usuarioController');

// ===== RUTAS PÚBLICAS =====
router.get('/buscar', buscarUsuarios);
router.get('/perfil/:nombre_usuario', obtenerUsuarioPorNombre);  // ← Aquí debe estar :nombre_usuario

// ===== RUTAS PROTEGIDAS =====
router.get('/perfil', verificarToken, obtenerPerfil);
router.put('/perfil/bio', verificarToken, actualizarBio);
router.put('/perfil/avatar', verificarToken, verificarLimiteAvatar, uploadAvatar.single('avatar'), actualizarAvatar);
router.put('/perfil/password', verificarToken, cambiarPassword);
router.delete('/cuenta', verificarToken, eliminarCuenta);

module.exports = router;