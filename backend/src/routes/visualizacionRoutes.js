const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const {
    guardarProgreso,
    obtenerProgreso,
    obtenerVideosEnProgreso,
    obtenerVideosCompletados
} = require('../controllers/visualizacionController');

// Todas las rutas requieren autenticación
router.use(verificarToken);

router.post('/', guardarProgreso);
router.get('/video/:video_id', obtenerProgreso);
router.get('/en-progreso', obtenerVideosEnProgreso);
router.get('/completados', obtenerVideosCompletados);

module.exports = router;