import { io } from 'socket.io-client'

const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const socket = io(URL, {
  transports: ['polling', 'websocket'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  timeout: 20000,
})

socket.on('connect', () => console.log('[Socket] connected', socket.id))
socket.on('connect_error', e => console.error('[Socket] error', e.message))

export default socket
