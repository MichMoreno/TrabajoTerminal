const crypto = require('crypto');
require('dotenv').config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16;

// Encriptar
const encrypt = (text) => {
    if (!text) {
        console.warn('Texto vacío en encrypt');
        return null;
    }
    try {
        console.log('Encriptando:', text.substring(0, 30) + '...');
        
        // Verificar que la clave existe
        if (!ENCRYPTION_KEY) {
            console.error('ENCRYPTION_KEY no está definida en .env');
            return null;
        }

        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const result = iv.toString('hex') + ':' + encrypted;
        
        console.log('Encriptado correctamente');
        console.log('Resultado (primeros 50 chars):', result.substring(0, 50) + '...');
        return result;
    } catch (error) {
        console.error('Error al encriptar:', error.message);
        return null;
    }
};

// Desencriptar
const decrypt = (encryptedText) => {
    if (!encryptedText) {
        console.warn('Texto vacío en decrypt');
        return null;
    }
    try {
        console.log('Desencriptando:', encryptedText.substring(0, 30) + '...');
        
        const parts = encryptedText.split(':');
        if (parts.length !== 2) {
            console.error('   Formato inválido en decrypt:', encryptedText);
            console.error('   Se esperaba "iv:datos_encriptados"');
            return null;
        }
        
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        console.log('Desencriptado correctamente');
        return decrypted;
    } catch (error) {
        console.error('Error al desencriptar:', error.message);
        return null;
    }
};

// Función para verificar si un texto está encriptado
const estaEncriptado = (text) => {
    return text && text.includes(':') && text.length > 50;
};

module.exports = { encrypt, decrypt, estaEncriptado };