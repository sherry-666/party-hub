import { io } from 'socket.io-client';

const isProduction = import.meta.env.PROD;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (isProduction ? window.location.origin : 'http://localhost:3002');

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
