const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const {
    obtenerChats,
    obtenerMensajesChat,
    eliminarChat,
    editarMensaje,
    eliminarMensaje
} = require('../controllers/chatController');

// Todas las rutas requieren autenticación
router.use(verificarToken);

router.get('/', obtenerChats);
router.get('/:chat_id/mensajes', obtenerMensajesChat);
router.delete('/:chat_id', eliminarChat);

router.put('/mensajes/:mensaje_id', editarMensaje);
router.delete('/mensajes/:mensaje_id', eliminarMensaje);

module.exports = router;