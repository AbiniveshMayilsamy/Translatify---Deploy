import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
  timeout: 60000,
  secure: true,
  rejectUnauthorized: false,
});

socket.on("connect", () => console.log("[Socket] connected", socket.id));
socket.on("connect_error", (e) => console.error("[Socket] error", e.message));
socket.on("disconnect", () => console.log("[Socket] disconnected"));

export default socket;
