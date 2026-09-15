require('dotenv').config();

// Temario
const TEMARIO_ESCOM = `
TEMARIO OFICIAL - ANÁLISIS Y DISEÑO DE SISTEMAS (ESCOM - PLAN 2020)

PROPÓSITO DE LA UNIDAD: Desarrolla un sistema de cómputo con base en el análisis de requerimientos y técnicas de diseño.

UNIDAD I. FUNDAMENTOS DE ANÁLISIS Y DISEÑO DE SISTEMAS
- Historia y evolución del desarrollo del software. Necesidad del análisis y diseño.
- Ciclo de vida del desarrollo de software (fases y herramientas).
- Metodologías de desarrollo: tradicionales, estructuradas, orientadas a objetos, ágiles (Scrum, XP, Kanban).

UNIDAD II. EL PROCESO DE ANÁLISIS DEL SISTEMA
- Análisis de requerimientos: identificación del problema, técnicas de recopilación, alcance.
- Especificación de requerimientos: tipos, documentación, técnicas.
- Validación y aceptación de requerimientos.

UNIDAD III. MODELADO DEL SISTEMA
- El proceso de modelado: vistas de un sistema.
- Técnicas de modelado: requerimientos, datos, no funcionales.
- Vistas del sistema: contexto, funcional, información, concurrencia, desarrollo, despliegue.
- Herramientas y diagramas UML (casos de uso, clases, secuencia, actividades, estados).

UNIDAD IV. EL PROCESO DE DISEÑO DEL SISTEMA
- Diseño de la arquitectura: propiedades, estilos arquitectónicos, patrones de diseño (Singleton, Iterator, MVC).
- Consideraciones de diseño: entrada/salida, interfaz de usuario, archivos y bases de datos, captura de datos.
- Principios de diseño y desarrollo de patrones.

UNIDAD V. CODIFICACIÓN Y PRUEBAS
- Convenciones de codificación, código limpio.
- Pruebas de programas: unidad, integración.
- Pruebas de sistemas: funcionales, desempeño, aceptación.
- Documentación de pruebas: plan, diseño, registro, informes.
- Herramientas de pruebas automatizadas y trabajo colaborativo.

BIBLIOGRAFÍA CLAVE:
- Kendall & Kendall. Análisis y Diseño de Sistemas.
- Booch, Jacobson, Rumbaugh. El Lenguaje Unificado de Modelado UML.
- Pressman. Ingeniería del software: Un enfoque práctico.
- Sommerville. Ingeniería de Software.
`;

// Validación
const validarContenidoVideo = async (titulo, descripcion, transcripcion) => {
    try {
        console.log('Validando contenido del video con el temario...');

        // Si no hay transcripción, no se puede validar
        if (!transcripcion || transcripcion.length < 50) {
            console.log('Transcripción insuficiente para validar');
            return {
                es_relevante: true,
                confianza: 30,
                razon: 'Transcripción insuficiente. Video aceptado por defecto.',
                temas_detectados: [],
                unidad_tematica_relacionada: 'No determinada'
            };
        }

        const prompt = `
Eres un profesor especializado de la materia "Análisis y Diseño de Sistemas" de la ESCOM.
Debes determinar si el contenido de un video está ESTRICTAMENTE RELACIONADO con el temario oficial de la materia.

**TEMARIO OFICIAL DE LA MATERIA:**
${TEMARIO_ESCOM}

**CONTENIDO DEL VIDEO A EVALUAR:**
TÍTULO: ${titulo}
DESCRIPCIÓN: ${descripcion || 'Sin descripción'}
TRANSCRIPCIÓN: ${transcripcion.substring(0, 2500)}

**INSTRUCCIONES:**
1. Compara el contenido del video (título, descripción y transcripción) con el TEMARIO OFICIAL.
2. El video DEBE tratar sobre los temas listados en el temario para ser considerado relevante.
3. Si el video se enfoca en lenguajes de programación específicos (ej. React, Python), frameworks web, o bases de datos físicas (SQL), sin estar ligado al análisis/diseño o a los conceptos del temario, NO es relevante.
4. Responde SOLO con el JSON, sin texto adicional.

Responde en JSON:
{
  "es_relevante": true/false,
  "confianza": 0-100 (número),
  "temas_detectados": ["tema1 del temario", "tema2 del temario"],
  "unidad_tematica_relacionada": "Unidad I, II, III, IV, V o 'Ninguna'",
  "razon": "Explicación clara de tu decisión, citando similitudes o diferencias con el temario."
}
`;

        // Configuración de timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.log('Timeout de validación alcanzado (15 minutos)');
            controller.abort();
        }, 900000);

        const response = await fetch('http://127.0.0.1:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama3.1',
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.2,
                    num_predict: 800
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Error en la API de Ollama: ${response.status}`);
        }

        const data = await response.json();
        console.log('Validación completada');

        // Extraer JSON de la respuesta
        const respuestaRaw = data.response;
        console.log('Respuesta cruda (primeros 100 chars):', respuestaRaw.substring(0, 100) + '...');

        // Buscar JSON en la respuesta (entre llaves)
        const jsonMatch = respuestaRaw.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            console.error('No se encontró JSON en la respuesta');
            return {
                es_relevante: true,
                confianza: 40,
                razon: 'Error al procesar la respuesta del modelo. Video aceptado por seguridad.',
                temas_detectados: [],
                unidad_tematica_relacionada: 'No determinada',
                error: true
            };
        }

        const jsonStr = jsonMatch[0];
        console.log('JSON extraído:', jsonStr.substring(0, 200) + '...');

        // Parsear JSON
        try {
            const resultado = JSON.parse(jsonStr);
            console.log(`Relevante: ${resultado.es_relevante}`);
            console.log(`Confianza: ${resultado.confianza}%`);
            console.log(`Unidad: ${resultado.unidad_tematica_relacionada}`);
            console.log(`Temas: ${resultado.temas_detectados?.join(', ') || 'Ninguno'}`);
            return resultado;
        } catch (parseError) {
            console.error('Error al parsear JSON:', parseError.message);
            console.error('JSON problemático:', jsonStr);
            return {
                es_relevante: true,
                confianza: 40,
                razon: 'Error al procesar la respuesta del modelo. Video aceptado por seguridad.',
                temas_detectados: [],
                unidad_tematica_relacionada: 'No determinada',
                error: true
            };
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('Timeout en validación de contenido');
        } else {
            console.error('Error al validar contenido:', error.message);
        }
        return {
            es_relevante: true,
            confianza: 40,
            razon: 'Error en sistema de validación. Video aceptado por seguridad.',
            temas_detectados: [],
            unidad_tematica_relacionada: 'No determinada',
            error: true
        };
    }
};

module.exports = { validarContenidoVideo };