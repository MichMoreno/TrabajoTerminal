const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

// Configurar FFmpeg
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

// Comprimir videos
const comprimirVideo = (inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
        console.log('Comprimiendo video...');

        ffmpeg(inputPath)
            .output(outputPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .videoBitrate('1000k')
            .audioBitrate('128k')
            .size('1280x720')
            .autopad(true)
            .fps(30)
            .format('mp4')
            .on('end', () => {
                console.log('Video comprimido');
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('Error en compresión:', err.message);
                reject(err);
            })
            .run();
    });
};

// Extracción del audio
const extraerAudio = (videoPath) => {
    return new Promise((resolve, reject) => {
        const audioPath = videoPath.replace(/\.[^.]+$/, '_audio.mp3');

        console.log('Extrayendo audio del video...');

        ffmpeg(videoPath)
            .output(audioPath)
            .audioCodec('libmp3lame')
            .audioBitrate('128k')
            .on('end', () => {
                console.log('Audio extraído correctamente');
                resolve(audioPath);
            })
            .on('error', (err) => {
                console.error('Error al extraer audio:', err);
                reject(err);
            })
            .run();
    });
};

// Limpiar archivo
const limpiarArchivo = (filePath) => {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Archivo eliminado: ${filePath}`);
    }
};

module.exports = { extraerAudio, limpiarArchivo, comprimirVideo };