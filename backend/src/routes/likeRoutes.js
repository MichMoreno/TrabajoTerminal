const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const {
    obtenerLikes,
    verificarLike,
    darLike,
    quitarLike
} = require('../controllers/likeController');

// Rutas públicas
router.get('/video/:video_id', obtenerLikes);

// Rutas protegidas
router.get('/video/:video_id/estado', verificarToken, verificarLike);
router.post('/video/:video_id', verificarToken, darLike);
router.delete('/video/:video_id', verificarToken, quitarLike);

module.exports = router;