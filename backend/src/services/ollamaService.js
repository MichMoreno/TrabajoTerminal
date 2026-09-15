const axios = require('axios');

const generarCuestionario = async (transcripcion) => {
    try {
        console.log('Generando 3 conjuntos de preguntas con Ollama...');
        console.log(`Longitud de transcripción: ${transcripcion.length} caracteres`);

        const textoParaResumen = transcripcion.length < 3000
            ? transcripcion.substring(0, 3000)
            : transcripcion;

        console.log(`Usando ${textoParaResumen.length} caracteres para el resumen`);

        // Extraer puuntos clave del video
        console.log('Extrayendo puntos clave del video...');

        const promptResumen = `
Analiza el siguiente contenido y extrae los 5 conceptos más importantes.

IMPORTANTE: Responde SOLO con los 5 conceptos clave, enumerados (1-5), sin texto adicional.

Contenido:
${textoParaResumen}
`;

        const responseResumen = await axios.post(
            'http://127.0.0.1:11434/api/generate',
            {
                model: 'llama3.1',
                prompt: promptResumen,
                stream: false,
                options: {
                    temperature: 0.3,
                    num_predict: 800
                }
            },
            {
                timeout: 1200000,
                headers: { 'Content-Type': 'application/json' }
            }
        );

        const puntosClave = responseResumen.data.response;
        console.log('Puntos clave extraídos:', puntosClave.substring(0, 200) + '...');

        const contenidoParaCuestionario = puntosClave && puntosClave.length > 20 
            ? puntosClave 
            : `Conceptos clave del video:\n${textoParaResumen.substring(0, 3000)}`;

        // Generar 3 conjuntos de preguntas diferentes
        console.log('Generando 3 conjuntos de 5 preguntas cada uno...');

        const promptCuestionarioMultiple = `
Eres un tutor experto en desarrollo web y habilidades profesionales.

Basado en el siguiente contenido, genera 3 conjuntos DIFERENTES de 5 preguntas de opción múltiple cada uno.
Cada pregunta debe tener 4 opciones y solo una correcta.
Incluye una explicación de por qué la respuesta es correcta.

INSTRUCCIONES IMPORTANTES:
- Genera 3 conjuntos diferentes (conjunto_1, conjunto_2, conjunto_3)
- Cada conjunto debe tener 5 preguntas
- Las preguntas deben cubrir los mismos conceptos pero con preguntas diferentes
- No repitas preguntas entre conjuntos
- Asegúrate de que las preguntas sean claras y directas

CONTENIDO:
${contenidoParaCuestionario}

Formato JSON estricto (SOLO EL JSON, sin texto adicional):
{
  "conjunto_1": {
    "preguntas": [
      {
        "texto": "pregunta aquí",
        "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
        "respuesta_correcta": 0,
        "explicacion": "explicación aquí"
      }
    ]
  },
  "conjunto_2": {
    "preguntas": [
      // 5 preguntas diferentes al conjunto_1
    ]
  },
  "conjunto_3": {
    "preguntas": [
      // 5 preguntas diferentes al conjunto_1 y conjunto_2
    ]
  }
}
`;

        const responseCuestionario = await axios.post(
            'http://127.0.0.1:11434/api/generate',
            {
                model: 'llama3.1',
                prompt: promptCuestionarioMultiple,
                stream: false,
                options: {
                    temperature: 0.8,
                    num_predict: 3000
                }
            },
            {
                timeout: 1800000,  // 30 minutos
                headers: { 'Content-Type': 'application/json' }
            }
        );

        console.log('3 conjuntos generados correctamente');

        // Parsear JSON
        let jsonStr = responseCuestionario.data.response;
        console.log('Respuesta de Ollama (primeros 100 caracteres):', jsonStr.substring(0, 100) + '...');

        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('No se encontró JSON válido');
            throw new Error('Formato de respuesta inválido');
        }

        jsonStr = jsonMatch[0];

        let cuestionarios;
        try {
            cuestionarios = JSON.parse(jsonStr);
        } catch (parseError) {
            console.error('Error al parsear JSON:', parseError.message);
            throw new Error('Error al parsear el cuestionario');
        }

        // Verificar estructura
        if (!cuestionarios.conjunto_1 || !cuestionarios.conjunto_2 || !cuestionarios.conjunto_3) {
            console.error('Estructura de cuestionarios inválida');
            throw new Error('Estructura de cuestionarios inválida');
        }

        // Verificar que cada conjunto tenga 5 preguntas
        for (const conjunto of ['conjunto_1', 'conjunto_2', 'conjunto_3']) {
            if (!cuestionarios[conjunto].preguntas || cuestionarios[conjunto].preguntas.length !== 5) {
                console.error(`${conjunto} no tiene 5 preguntas`);
                throw new Error(`Estructura inválida en ${conjunto}`);
            }
        }

        console.log('3 conjuntos de 5 preguntas generados correctamente (15 preguntas totales)');
        
        // Devolver los 3 conjuntos
        return {
            conjunto_1: cuestionarios.conjunto_1.preguntas,
            conjunto_2: cuestionarios.conjunto_2.preguntas,
            conjunto_3: cuestionarios.conjunto_3.preguntas
        };

    } catch (error) {
        console.error('Error al generar cuestionarios:', error.message);
        
        if (error.code === 'ECONNABORTED') {
            console.error('Timeout: La solicitud tardó demasiado.');
        } else if (error.response) {
            console.error(`Error en la API de Ollama: ${error.response.status}`);
        } else if (error.request) {
            console.error('No se recibió respuesta de Ollama');
        }
        
        throw new Error('Error al generar cuestionario');
    }
};

module.exports = { generarCuestionario };