import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  path: '/socket.io',
  transports: ['websocket'],
});

console.log('Connecting to Engine socket.io server...');

socket.on('connect', () => {
  console.log('Connected to Engine! Socket ID:', socket.id);
});

socket.on('whatsapp:customers', (data) => {
  console.log('Received whatsapp:customers:', data);
});

socket.on('whatsapp:status', (data) => {
  console.log('Received whatsapp:status:', data);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected from Engine:', reason);
});

// Keep the script running
setInterval(() => {}, 1000);