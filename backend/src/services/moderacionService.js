const { palabrasProhibidas } = require('../config/palabrasProhibidas');

// Función para la detección de palabras ofensivas
const contieneLenguajeOfensivo = (texto) => {
    if (!texto) return false;
    const textoLower = texto.toLowerCase();
    return palabrasProhibidas.some(palabra => 
        textoLower.includes(palabra.toLowerCase())
    );
};

const moderarContenido = async (texto) => {
    // Primero pasa por la lista de palabraas
    if (contieneLenguajeOfensivo(texto)) {
        console.log('Contenido rechazado por lista de palabras');
        return {
            aprobado: false,
            categoria: 'ofensivo',
            razon: 'Contiene lenguaje ofensivo'
        };
    }

    // Filtro con llama-guard3
    try {
        console.log('Moderando con llama-guard3...');

        const prompt = `
Eres un moderador de contenido EXTREMADAMENTE ESTRICTO para una plataforma educativa universitaria.

Tu tarea es analizar el TEXTO COMPLETO y determinar si, en su totalidad, es inapropiado para un ambiente educativo.

RESPONDE "unsafe" si el texto, en su conjunto, contiene ALGUNA de estas cosas:
1. Críticas destructivas hacia personas, profesores o instituciones
2. Lenguaje que desprestigie o denigre a otros
3. Quejas excesivas o negatividad sin fundamento constructivo
4. Palabras que denoten falta de respeto o desprecio
5. Ataques personales (incluso sin groserías explícitas)
6. Frases que demuestren odio, rencor o desprecio

RESPONDE "safe" SOLO si el texto es:
- Constructivo
- Respeta a las personas e instituciones
- Aporta valor al diálogo educativo
- No contiene descalificaciones personales

EJEMPLOS DE "unsafe":
- "Los profesores son incompetentes" → unsafe (descalificación)
- "Odio la escuela y a todos los alumnos" → unsafe (lenguaje de odio)
- "La carrera es un fracaso total" → unsafe (crítica destructiva)
- "El profesor Martínez es pésimo" → unsafe (ataque personal)

EJEMPLOS DE "safe":
- "La clase es difícil, necesito más práctica" → safe (opinión constructiva)
- "El profesor podría explicar mejor" → safe (crítica constructiva)
- "Me cuesta entender este tema" → safe (opinión personal)

TEXTO A EVALUAR: "${texto}"

RESPUESTA (SOLO "safe" o "unsafe"):`;

        const response = await fetch('http://127.0.0.1:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama-guard3',
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0,
                    num_predict: 10
                }
            })
        });

        const data = await response.json();
        const resultado = data.response.trim().toLowerCase();

        console.log('Respuesta de llama-guard3:', resultado);

        const esInseguro = resultado.includes('unsafe');

        if (esInseguro) {
            return {
                aprobado: false,
                categoria: 'ofensivo',
                razon: 'Contenido ofensivo detectado'
            };
        }

        return {
            aprobado: true,
            categoria: 'ok',
            razon: 'Contenido apropiado'
        };

    } catch (error) {
        console.error('Error en llama-guard3:', error);
        // Si falla, usar el filtro de palabras como respaldo
        if (contieneLenguajeOfensivo(texto)) {
            return {
                aprobado: false,
                categoria: 'ofensivo',
                razon: 'Contenido ofensivo detectado (fallback)'
            };
        }
        return {
            aprobado: true,
            categoria: 'ok',
            razon: 'Contenido apropiado (fallback)'
        };
    }
};

module.exports = { moderarContenido };