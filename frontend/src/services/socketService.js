import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

socket.on('connect_error', (error) => {
    console.log('Connection Error:', error);
});

socket.on('connect', () => {
    console.log('Connected to WebSocket');
});

export const initializeSocketListeners = (callbacks) => {
    Object.entries(callbacks).forEach(([event, callback]) => {
        socket.on(event, callback);
    });
};