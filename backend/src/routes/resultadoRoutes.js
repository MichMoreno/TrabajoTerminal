const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const {
    obtenerResultados,
    guardarResultado,
    obtenerMejorPuntaje,
    obtenerGrafica
} = require('../controllers/resultadoController');

// Rutas protegidas
router.use(verificarToken);

router.get('/', obtenerResultados);
router.post('/', guardarResultado);
router.get('/:cuestionario_id/mejor', obtenerMejorPuntaje);
router.get('/progreso', obtenerGrafica);
module.exports = router;