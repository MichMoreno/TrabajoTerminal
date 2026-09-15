const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const transcribirAudio = (audioPath) => {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(audioPath)) {
            reject(new Error(`Archivo de audio no encontrado: ${audioPath}`));
            return;
        }

        console.log('Transcribiendo audio con Whisper...');
        console.log(`Archivo: ${audioPath}`);

        // Ejecutar el script de Python
        const scriptPath = path.join(__dirname, '../../whisper_script.py');
        const command = `python "${scriptPath}" "${audioPath}"`;

        console.log(`Ejecutando: ${command}`);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('Error al ejecutar Whisper:', error);
                console.error('stderr:', stderr);
                reject(new Error(`Error en Whisper: ${stderr || error.message}`));
                return;
            }

            if (stderr && stderr.includes('ERROR')) {
                console.error('Error en Whisper (stderr):', stderr);
                reject(new Error(`Error en Whisper: ${stderr}`));
                return;
            }

            const transcripcion = stdout.trim();
            
            if (!transcripcion) {
                console.error('Transcripción vacía');
                reject(new Error('La transcripción está vacía'));
                return;
            }

            console.log('Transcripción completada');
            console.log(`Texto: ${transcripcion.substring(0, 100)}...`);

            resolve(transcripcion);
        });
    });
};

module.exports = { transcribirAudio };