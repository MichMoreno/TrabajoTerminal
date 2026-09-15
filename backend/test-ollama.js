// test-ollama.js
const { generarCuestionario } = require('./src/services/ollamaService');

const transcripcionPrueba = `
La fotosíntesis es el proceso mediante el cual las plantas convierten la luz solar en energía química.
Este proceso ocurre en los cloroplastos y requiere agua, dióxido de carbono y luz solar.
`;

generarCuestionario(transcripcionPrueba)
    .then(cuestionario => {
        console.log('Cuestionario generado:');
        console.log(JSON.stringify(cuestionario, null, 2));
    })
    .catch(error => {
        console.error('Error:', error);
    });