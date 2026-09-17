const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const { uploadDocument } = require('../config/cloudinary');
const { verificarLimiteDescargas } = require('../middleware/limiteDescargas');
const { verificarLimitePublicaciones } = require('../middleware/limitePublicaciones');
const {
    obtenerMateriales,
    obtenerMaterialesPorNombre,
    obtenerMisDocumentos,
    subirMaterial,
    editarMaterial,
    eliminarMaterial,
    descargarMaterial,
} = require('../controllers/materialController');

// Rutas públicas
router.get('/', obtenerMateriales);
router.get('/usuario/:nombre', obtenerMaterialesPorNombre);
router.get('/mis-documentos', verificarToken, obtenerMisDocumentos);
router.get('/:id/descargar', verificarToken, verificarLimiteDescargas, descargarMaterial);

// Rutas protegidas
router.post('/', verificarToken, verificarLimitePublicaciones('documento'), uploadDocument.single('archivo'), subirMaterial);
router.put('/:id', verificarToken, editarMaterial);
router.delete('/:id', verificarToken, eliminarMaterial);

module.exports = router;