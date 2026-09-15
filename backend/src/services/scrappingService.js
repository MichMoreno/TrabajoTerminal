const puppeteer = require('puppeteer');

// Función para normalizar texto (mayúsculas, sin acentos, sin espacios extra)
const normalizarTexto = (texto) => {
    if (!texto) return '';
    return texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
        .toUpperCase()
        .trim()
        .replace(/\s+/g, ' '); // Unificar espacios
};

// Función para dividir en palabras
const dividirEnPalabras = (texto) => {
    if (!texto) return [];
    return normalizarTexto(texto).split(' ');
};

// Función para comparar nombres aceptando solo dos formatos
const compararNombres = (nombreCredencial, nombreIngresado) => {
    const credencial = normalizarTexto(nombreCredencial);
    const ingresado = normalizarTexto(nombreIngresado);

    if (credencial === ingresado) {
        console.log('Nombres idénticos');
        return true;
    }

    const palabrasCredencial = dividirEnPalabras(nombreCredencial);
    const palabrasIngresado = dividirEnPalabras(nombreIngresado);

    console.log('Comparando nombres:');
    console.log(`Credencial: ${JSON.stringify(palabrasCredencial)}`);
    console.log(`Ingresado:  ${JSON.stringify(palabrasIngresado)}`);

    // Validación 1: Debe tener entre 3 y 5 palabras
    if (palabrasCredencial.length < 3 || palabrasCredencial.length > 5) {
        console.log(`La credencial tiene ${palabrasCredencial.length} palabras, debe tener entre 3 y 5`);
        return false;
    }

    if (palabrasIngresado.length !== palabrasCredencial.length) {
        console.log(`Diferente cantidad de palabras: ${palabrasIngresado.length} vs ${palabrasCredencial.length}`);
        return false;
    }

    const totalPalabras = palabrasCredencial.length;

    // Validación 2: Mismas palabras (sin importar orden)
    const setCredencial = new Set(palabrasCredencial);
    const setIngresado = new Set(palabrasIngresado);
    
    const mismasPalabras = setCredencial.size === setIngresado.size &&
                           [...setCredencial].every(p => setIngresado.has(p));
    
    if (!mismasPalabras) {
        console.log('Las palabras no coinciden');
        return false;
    }

    console.log('Las palabras coinciden (sin importar orden)');

    // =============================================
    // CASO 1: 3 palabras (1 nombre + 2 apellidos)
    // =============================================
    if (totalPalabras === 3) {
        // FORMATO 1: Nombres → Apellidos
        const nombreCred = palabrasCredencial[0];
        const apellidosCred = [palabrasCredencial[1], palabrasCredencial[2]];
        const nombreIng = palabrasIngresado[0];
        const apellidosIng = [palabrasIngresado[1], palabrasIngresado[2]];

        if (nombreCred === nombreIng &&
            apellidosCred[0] === apellidosIng[0] &&
            apellidosCred[1] === apellidosIng[1]) {
            console.log('Formato válido: 1 nombre + 2 apellidos (Nombres → Apellidos)');
            return true;
        }

        // FORMATO 2: Apellidos (últimos 2) → Nombres (primero)
        const apellidosCred2 = [palabrasCredencial[1], palabrasCredencial[2]];
        const nombreCred2 = palabrasCredencial[0];
        const apellidosIng2 = [palabrasIngresado[0], palabrasIngresado[1]];
        const nombreIng2 = palabrasIngresado[2];

        if (apellidosCred2[0] === apellidosIng2[0] &&
            apellidosCred2[1] === apellidosIng2[1] &&
            nombreCred2 === nombreIng2) {
            console.log('Formato válido: 1 nombre + 2 apellidos (Apellidos → Nombres)');
            return true;
        }

        console.log('Formato inválido para 3 palabras');
        return false;
    }

    // =============================================
    // CASO 2: 4 palabras (2 nombres + 2 apellidos)
    // =============================================
    if (totalPalabras === 4) {
        // FORMATO 1: Nombres (primeros 2) → Apellidos (últimos 2)
        const nombresCred = [palabrasCredencial[0], palabrasCredencial[1]];
        const apellidosCred = [palabrasCredencial[2], palabrasCredencial[3]];
        const nombresIng = [palabrasIngresado[0], palabrasIngresado[1]];
        const apellidosIng = [palabrasIngresado[2], palabrasIngresado[3]];

        if (nombresCred[0] === nombresIng[0] &&
            nombresCred[1] === nombresIng[1] &&
            apellidosCred[0] === apellidosIng[0] &&
            apellidosCred[1] === apellidosIng[1]) {
            console.log('Formato válido: 2 nombres + 2 apellidos (Nombres → Apellidos)');
            return true;
        }

        // FORMATO 2: Apellidos (últimos 2) → Nombres (primeros 2)
        const apellidosCred2 = [palabrasCredencial[2], palabrasCredencial[3]];
        const nombresCred2 = [palabrasCredencial[0], palabrasCredencial[1]];
        const apellidosIng2 = [palabrasIngresado[0], palabrasIngresado[1]];
        const nombresIng2 = [palabrasIngresado[2], palabrasIngresado[3]];

        if (apellidosCred2[0] === apellidosIng2[0] &&
            apellidosCred2[1] === apellidosIng2[1] &&
            nombresCred2[0] === nombresIng2[0] &&
            nombresCred2[1] === nombresIng2[1]) {
            console.log('Formato válido: 2 nombres + 2 apellidos (Apellidos → Nombres)');
            return true;
        }

        console.log('Formato inválido para 4 palabras');
        return false;
    }

    // =============================================
    // CASO 3: 5 palabras (3 nombres + 2 apellidos)
    // =============================================
    if (totalPalabras === 5) {
        // FORMATO 1: Nombres (primeros 3) → Apellidos (últimos 2)
        const nombresCred = [palabrasCredencial[0], palabrasCredencial[1], palabrasCredencial[2]];
        const apellidosCred = [palabrasCredencial[3], palabrasCredencial[4]];
        const nombresIng = [palabrasIngresado[0], palabrasIngresado[1], palabrasIngresado[2]];
        const apellidosIng = [palabrasIngresado[3], palabrasIngresado[4]];

        if (nombresCred[0] === nombresIng[0] &&
            nombresCred[1] === nombresIng[1] &&
            nombresCred[2] === nombresIng[2] &&
            apellidosCred[0] === apellidosIng[0] &&
            apellidosCred[1] === apellidosIng[1]) {
            console.log('Formato válido: 3 nombres + 2 apellidos (Nombres → Apellidos)');
            return true;
        }

        // FORMATO 2: Apellidos (últimos 2) → Nombres (primeros 3)
        const apellidosCred2 = [palabrasCredencial[3], palabrasCredencial[4]];
        const nombresCred2 = [palabrasCredencial[0], palabrasCredencial[1], palabrasCredencial[2]];
        const apellidosIng2 = [palabrasIngresado[0], palabrasIngresado[1]];
        const nombresIng2 = [palabrasIngresado[2], palabrasIngresado[3], palabrasIngresado[4]];

        if (apellidosCred2[0] === apellidosIng2[0] &&
            apellidosCred2[1] === apellidosIng2[1] &&
            nombresCred2[0] === nombresIng2[0] &&
            nombresCred2[1] === nombresIng2[1] &&
            nombresCred2[2] === nombresIng2[2]) {
            console.log('Formato válido: 3 nombres + 2 apellidos (Apellidos → Nombres)');
            return true;
        }

        console.log('Formato inválido para 5 palabras');
        return false;
    }

    return false;
};

// Validar credencial
const validarCredencial = async (url) => {
    // Validación de seguridad
    if (typeof url !== 'string' || url.includes('[object')) {
        console.error('ERROR CRÍTICO: Se recibió un objeto en lugar de una URL:', url);
        return {
            valido: false,
            error: 'Formato de URL no válido (se recibió un objeto en lugar de texto).'
        };
    }

    const urlLimpia = url.trim();
    let browser;

    try {
        console.log('Iniciando scraping de la credencial');
        console.log('URL procesada:', urlLimpia);

        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(30000);

        await page.goto(urlLimpia, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        await new Promise(r => setTimeout(r, 2000));

        // Extraer texto completo
        const textoCompleto = await page.evaluate(() => document.body.innerText);
        console.log('Texto extraído correctamente');

        // Limpiar texto
        const textoLimpio = textoCompleto
            .replace(/\r\n/g, '\n')
            .replace(/\n\s*\n/g, '\n')
            .trim();
        
        console.log('Texto limpio:', textoLimpio);

        // Dividir por líneas
        const lineas = textoLimpio.split('\n').filter(linea => linea.trim() !== '');
        console.log('Líneas extraídas:', lineas);

        const datos = {
            boleta: lineas[0] || null,
            curp: lineas[1] || null,
            nombre: lineas[2] || null,
            carrera: lineas[3] || null,
            escuela: lineas[4] || null,
            cct: lineas[5] || null
        };

        console.log('Datos extraídos por posición:', datos);

        await browser.close();

        return {
            valido: true,
            datos: datos
        };

    } catch (error) {
        console.error('Error en scraping:', error.message);
        
        if (browser) {
            await browser.close().catch(e => console.error('Error al cerrar navegador:', e));
        }
        
        return {
            valido: false,
            error: 'No se pudo conectar con el servidor de la credencial.'
        };
    }
};

// Validar credencial contra los datos ingresados por el alumno
const validarCredencialConDatos = async (url, boletaUsuario, nombreUsuario) => {
    const resultado = await validarCredencial(url);
    
    if (!resultado.valido) {
        return {
            valido: false,
            error: resultado.error || 'No se pudo validar la credencial'
        };
    }

    const { datos } = resultado;
    
    // Validar escuela
    const esESCOM = datos.escuela?.toUpperCase().includes('ESCOM');
    console.log(`Validando escuela: ${datos.escuela} → ${esESCOM}`);
    
    if (!esESCOM) {
        return {
            valido: false,
            error: 'La credencial no pertenece a ESCOM',
            datos: datos
        };
    }

    // Validar carrera
    const esSistemas = datos.carrera?.toUpperCase().includes('SISTEMAS COMPUTACIONALES');
    console.log(`Validando carrera: ${datos.carrera} → ${esSistemas}`);
    
    if (!esSistemas) {
        return {
            valido: false,
            error: 'La credencial no es de Ingeniería en Sistemas Computacionales',
            datos: datos
        };
    }

    // Validar boleta
    console.log(`Validando boleta: ${datos.boleta} vs ${boletaUsuario}`);
    
    if (datos.boleta !== boletaUsuario) {
        return {
            valido: false,
            error: `La boleta de la credencial (${datos.boleta}) no coincide con la ingresada (${boletaUsuario})`,
            datos: datos
        };
    }

    // Validar nombre con formato estricto
    console.log(`Validando nombre: "${datos.nombre}" vs "${nombreUsuario}"`);
    
    const nombreCoincide = compararNombres(datos.nombre, nombreUsuario);
    
    if (!nombreCoincide) {
        return {
            valido: false,
            error: `El nombre de la credencial (${datos.nombre}) no coincide con el ingresado (${nombreUsuario})`,
            datos: datos
        };
    }

    return {
        valido: true,
        datos: datos,
        mensaje: 'Credencial validada exitosamente'
    };
};

module.exports = { 
    validarCredencial,
    validarCredencialConDatos
};