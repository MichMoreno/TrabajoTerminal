const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const { uploadVideo } = require('../config/cloudinary');
const { uploadVideoTemp} = require('../config/multer');
const { verificarLimiteVisualizacion } = require('../middleware/limiteVisualizacion');
const { verificarLimitePublicaciones } = require ('../middleware/limitePublicaciones');
const {
    obtenerVideos,
    obtenerVideoPorId,
    crearVideo,
    actualizarVideo,
    eliminarVideo,
    obtenerVideosPorNombre,
    buscarVideos
} = require('../controllers/videoController');

// Rutas públicas
router.get('/', obtenerVideos);
router.get('/buscar',buscarVideos);
router.get('/usuario/:nombre', obtenerVideosPorNombre);

router.get('/:id', verificarToken, verificarLimiteVisualizacion, obtenerVideoPorId);

// Rutas protegidas
router.post('/', verificarToken, verificarLimitePublicaciones('video'), uploadVideoTemp.single('video'), crearVideo);
router.put('/:id', verificarToken, actualizarVideo);
router.delete('/:id', verificarToken, eliminarVideo);

module.exports = router;