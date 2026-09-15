// test-cloudinary.js
require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('Probando conexión con Cloudinary...');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API Key:', process.env.CLOUDINARY_API_KEY);

// Subir una imagen de prueba
cloudinary.uploader.upload('https://www.google.com/images/branding/googlelogo/1x/googlelogo_light_color_272x92dp.png', {
    folder: 'test'
}, (error, result) => {
    if (error) {
        console.error('Error:', error.message);
        console.log('Verifica que el API Secret esté correcto');
    } else {
        console.log('Conexión exitosa');
        console.log('URL:', result.secure_url);
        console.log('Public ID:', result.public_id);
        console.log('Elimina el archivo de prueba con:');
        console.log(`cloudinary.uploader.destroy('${result.public_id}')`);
    }
});