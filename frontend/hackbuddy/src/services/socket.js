import { io } from 'socket.io-client';

// VITE_API_URL is the REST API base (e.g. http://localhost:5000/api).
// Socket.IO needs the server root — strip the /api suffix if present.
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = apiUrl.replace(/\/api\/?$/, '');

// Create a single persistent socket connection for the whole app
const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

export default socket;
