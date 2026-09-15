const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const {
    obtenerConversacion,
    enviarMensaje,
    marcarLeido,
    eliminarMensaje,
    obtenerChats
} = require('../controllers/mensajeController');

// Todas las rutas requieren autenticación
router.use(verificarToken);

router.get('/chats', obtenerChats);
router.get('/privados/:usuario_id', obtenerConversacion);
router.post('/privados', enviarMensaje);
router.put('/privados/:id/leer', marcarLeido);
router.delete('/privados/:id', eliminarMensaje);

module.exports = router;