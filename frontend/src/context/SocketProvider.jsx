// frontend/src/context/SocketProvider.jsx
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { SocketContext } from './SocketContext';
import { useAuth } from '../hooks/useAuth';

// ✅ Socket fuera del componente (variable de módulo)
let socketGlobal = null;
let socketBoleta = null;

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [conectado, setConectado] = useState(false);

  const userBoleta = user?.boleta;
  const userName = user?.nombre_usuario || user?.nombre;

  // ✅ useEffect SOLO se suscribe a eventos (sin setState directo)
  useEffect(() => {
    if (!userBoleta) {
      // Logout: desconectar
      if (socketGlobal) {
        socketGlobal.disconnect();
        socketGlobal = null;
        socketBoleta = null;
      }
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    // Si ya hay un socket para otro usuario, desconectar
    if (socketGlobal && socketBoleta !== userBoleta) {
      socketGlobal.disconnect();
      socketGlobal = null;
    }

    // Crear socket solo si no existe
    if (!socketGlobal) {
      socketGlobal = io('/', {
        auth: { token },
        transports: ['polling'],
      });
      socketBoleta = userBoleta;
    }

    const socket = socketGlobal;

    // =============================================
    // SUSCRIPCIÓN A EVENTOS (callbacks, no setState directo)
    // =============================================
    const handleConnect = () => {
      console.log('✅ Socket conectado:', socket.id);
      setConectado(true);
      socket.emit('register-user', {
        boleta: userBoleta,
        nombre: userName,
      });
    };

    const handleDisconnect = () => {
      console.log('❌ Socket desconectado');
      setConectado(false);
    };

    const handleConnectError = (error) => {
      console.error('Error de conexión socket:', error.message);
      setConectado(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    // Si ya está conectado
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
    };
  }, [userBoleta, userName]);

  return (
    <SocketContext.Provider value={{ socket: socketGlobal, conectado }}>
      {children}
    </SocketContext.Provider>
  );
};