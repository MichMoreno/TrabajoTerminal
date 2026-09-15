const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// Configurar Cloudinary con tus credenciales
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('Cloudinary configurado con:', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY
});

// Configurar almacenamiento para videos
const videoStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'plataforma-escom/videos',
        resource_type: 'video',
        allowed_formats: ['mp4', 'mov', 'avi', 'mkv', 'webm']
    }
});

// Configurar almacenamiento para documentos
const documentStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'plataforma-escom/documentos',
        resource_type: 'raw',
        allowed_formats: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'zip']
    }
});

// Configurar almacenamiento para avatares
const avatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'plataforma-escom/avatares',
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [
            { width: 200, height: 200, crop: 'fill', quality: 'auto:good' }
        ]
    }
});

// 5. Crear middlewares de Multer
const uploadVideo = multer({ storage: videoStorage });
const uploadDocument = multer({ storage: documentStorage });
const uploadAvatar = multer({ storage: avatarStorage });

// 6. Función para eliminar archivos de Cloudinary
const eliminarArchivo = async (publicId, resourceType = 'video') => {
    try {
        if (!publicId) return;
        const result = await cloudinary.uploader.destroy(publicId, { 
            resource_type: resourceType 
        });
        console.log(`Archivo eliminado: ${publicId}`);
        return result;
    } catch (error) {
        console.error(`Error al eliminar ${publicId}:`, error.message);
        throw error;
    }
};

module.exports = {
    cloudinary,
    uploadVideo,
    uploadDocument,
    uploadAvatar,
    eliminarArchivo
};