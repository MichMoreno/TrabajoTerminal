const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const {
    obtenerAutoresDocumento,
    obtenerDocumentosPublicados,
    registrarPublicacionDocumento,
    eliminarPublicacionDocumento
} = require('../controllers/publicacionDocumentoController');

// Rutas públicas
router.get('/documento/:documento_id/autores', obtenerAutoresDocumento);
router.get('/usuario/:boleta', obtenerDocumentosPublicados);

// Rutas protegidas
router.post('/', verificarToken, registrarPublicacionDocumento);
router.delete('/:documento_id', verificarToken, eliminarPublicacionDocumento);

module.exports = router;