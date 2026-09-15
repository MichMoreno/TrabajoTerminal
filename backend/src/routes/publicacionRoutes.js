const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const {
    obtenerAutoresVideo,
    obtenerVideosPublicados,
    registrarPublicacion,
    eliminarPublicacion
} = require('../controllers/publicacionController');

// Rutas públicas
router.get('/video/:video_id/autores', obtenerAutoresVideo);
router.get('/usuario/:boleta', obtenerVideosPublicados);

// Rutas protegidas
router.post('/', verificarToken, registrarPublicacion);
router.delete('/:video_id', verificarToken, eliminarPublicacion);

module.exports = router;