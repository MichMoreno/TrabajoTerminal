const jwt = require('jsonwebtoken');
require('dotenv').config();

const verificarToken = (req, res, next) => {
    // Obtener el token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ 
            error: 'Acceso denegado. No se proporcionó token.' 
        });
    }

    // El header viene con formato "Bearer <token>"
    const token = authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ 
            error: 'Acceso denegado. Token inválido.' 
        });
    }

    // Verificar el token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Guardamos los datos del usuario en la request
        next(); // Continuar con el siguiente middleware o endpoint
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token expirado. Vuelve a iniciar sesión.' 
            });
        }
        return res.status(401).json({ 
            error: 'Token inválido.' 
        });
    }
};

module.exports = { verificarToken };