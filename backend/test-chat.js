// test-chat.js
const io = require('socket.io-client');
const axios = require('axios');

console.log('🚀 Iniciando prueba de chat...\n');

// =============================================
// CONFIGURACIÓN DE USUARIOS REALES
// =============================================
const USUARIOS = {
    fernanda: {
        nombre: 'FerMich web',
        correo: 'fdominguezm1900@alumno.ipn.mx',
        password: 'Website1630+',
        boleta: '2020302324'
    },
    erick: {
        nombre: 'Idanchi',
        correo: 'ealvarezl2102@alumno.ipn.mx',
        password: 'Zelda30+',
        boleta: '2022630675'
    }
};

const SERVER_URL = 'http://localhost:5000';

console.log('📋 Configuración:');
console.log(`   Servidor: ${SERVER_URL}`);
console.log(`   Usuario 1: ${USUARIOS.fernanda.nombre} (${USUARIOS.fernanda.boleta})`);
console.log(`   Usuario 2: ${USUARIOS.erick.nombre} (${USUARIOS.erick.boleta})`);
console.log('');

// =============================================
// FUNCIÓN PARA OBTENER TOKEN
// =============================================
async function obtenerToken(usuario) {
    console.log(`🔑 Intentando login para ${usuario.nombre} (${usuario.correo})...`);
    try {
        const response = await axios.post(`${SERVER_URL}/api/auth/login`, {
            correo: usuario.correo,
            password: usuario.password
        });
        console.log(`✅ Token obtenido para ${usuario.nombre}`);
        return response.data.token;
    } catch (error) {
        console.error(`❌ Error al obtener token:`, error.response?.data?.error || error.message);
        return null;
    }
}

// =============================================
// FUNCIÓN PARA CREAR CLIENTE DE SOCKET
// =============================================
function crearClienteSocket(token, nombre) {
    console.log(`🔌 Conectando ${nombre}...`);
    
    const socket = io(SERVER_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: false
    });

    socket.on('connect', () => {
        console.log(`✅ ${nombre} conectado (socket: ${socket.id})`);
    });

    socket.on('connect_error', (error) => {
        console.error(`❌ ${nombre} error de conexión:`, error.message);
    });

    socket.on('connection-ack', (data) => {
        console.log(`📩 ${nombre} confirmación:`, data.message);
        console.log(`   Usuario: ${data.usuario?.nombre || 'Desconocido'}`);
    });

    socket.on('new-private-message', (data) => {
        console.log(`📨 ${nombre} recibe de ${data.emisor.boleta}: "${data.mensaje.contenido}"`);
    });

    socket.on('message-sent', (data) => {
        console.log(`✅ ${nombre} mensaje enviado correctamente`);
    });

    socket.on('message-error', (data) => {
        console.error(`❌ ${nombre} error al enviar mensaje:`, data.error);
    });

    socket.on('disconnect', () => {
        console.log(`🔴 ${nombre} desconectado`);
    });

    return socket;
}

// =============================================
// FUNCIÓN PRINCIPAL
// =============================================
async function main() {
    console.log('🚀 Iniciando prueba de chat...\n');

    // 1. Obtener tokens
    const tokenFernanda = await obtenerToken(USUARIOS.fernanda);
    const tokenErick = await obtenerToken(USUARIOS.erick);

    if (!tokenFernanda || !tokenErick) {
        console.error('❌ No se pudieron obtener los tokens');
        console.log('💡 Verifica que los usuarios existan y las contraseñas sean correctas.');
        return;
    }

    console.log('🔐 Tokens obtenidos correctamente\n');

    // 2. Crear sockets
    const socketFernanda = crearClienteSocket(tokenFernanda, USUARIOS.fernanda.nombre);
    const socketErick = crearClienteSocket(tokenErick, USUARIOS.erick.nombre);

    // 3. Esperar conexión
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 4. Unirse a la sala privada
    const boletaFernanda = USUARIOS.fernanda.boleta;
    const boletaErick = USUARIOS.erick.boleta;
    const roomId = [boletaFernanda, boletaErick].sort().join('-');

    console.log(`\n📦 Uniendo a ${USUARIOS.fernanda.nombre} a la sala: ${roomId}`);
    socketFernanda.emit('join-private-room', {
        user1Id: boletaFernanda,
        user2Id: boletaErick
    });

    console.log(`📦 Uniendo a ${USUARIOS.erick.nombre} a la sala: ${roomId}`);
    socketErick.emit('join-private-room', {
        user1Id: boletaFernanda,
        user2Id: boletaErick
    });

    // 5. Esperar un momento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 6. Enviar mensaje de Fernanda a Erick
    console.log(`\n💬 Enviando mensaje de ${USUARIOS.fernanda.nombre} a ${USUARIOS.erick.nombre}...`);
    socketFernanda.emit('send-private-message', {
        emisorId: boletaFernanda,
        receptorId: boletaErick,
        contenido: 'Hola Erick, ¿cómo estás?',
        roomId: roomId
    });

    // 7. Esperar respuesta
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 8. Enviar mensaje de Erick a Fernanda
    console.log(`\n💬 Enviando mensaje de ${USUARIOS.erick.nombre} a ${USUARIOS.fernanda.nombre}...`);
    socketErick.emit('send-private-message', {
        emisorId: boletaErick,
        receptorId: boletaFernanda,
        contenido: '¡Hola Fer! Todo bien, ¿y tú?',
        roomId: roomId
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log(`\n💬 Enviando mensaje de ${USUARIOS.fernanda.nombre} a ${USUARIOS.erick.nombre}...`);
    socketFernanda.emit('send-private-message', {
        emisorId: boletaFernanda,
        receptorId: boletaErick,
        contenido: 'Bien, ya estudiaste para ADS?',
        roomId: roomId
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log(`\n💬 Probando límite de 0 caracteres...`);
    console.log(`   Enviando mensaje de ${USUARIOS.fernanda.nombre} a ${USUARIOS.erick.nombre} con 0 caracteres...`);

    const mensajeLargo = 'A'.repeat(0);

    socketFernanda.emit('send-private-message', {
        emisorId: boletaFernanda,
        receptorId: boletaErick,
        contenido: mensajeLargo,
        roomId: roomId
    });

    // 9. Esperar y cerrar conexiones
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n🏁 Prueba completada');
    
    socketFernanda.disconnect();
    socketErick.disconnect();
    
    process.exit(0);
}

// =============================================
// EJECUTAR
// =============================================
main().catch((error) => {
    console.error('❌ Error en main:', error);
    process.exit(1);
});