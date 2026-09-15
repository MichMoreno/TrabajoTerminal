// src/routes/cuestionarioRoutes.js
const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const {
    obtenerCuestionario,
    obtenerEstadoIntentos,
    responderCuestionario,
    obtenerHistorial
} = require('../controllers/cuestionarioController');

// Rutas públicas
router.get('/video/:video_id', obtenerCuestionario);

// Rutas protegidas
router.get('/:cuestionario_id/estado', verificarToken, obtenerEstadoIntentos);
router.post('/responder', verificarToken, responderCuestionario);
router.get('/historial', verificarToken, obtenerHistorial);

module.exports = router;