// src/routes/comentarioRoutes.js
const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const {
    obtenerComentarios,
    publicarComentario,
    editarComentario,
    eliminarComentario
} = require('../controllers/comentarioController');

// Rutas públicas
router.get('/video/:video_id', obtenerComentarios);

// Rutas protegidas
router.post('/', verificarToken, publicarComentario);
router.put('/:id', verificarToken, editarComentario);
router.delete('/:id', verificarToken, eliminarComentario);

module.exports = router;