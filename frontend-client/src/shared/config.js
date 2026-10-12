// Vite reemplaza import.meta.env.VITE_* al compilar, con los valores de .env.
// Si la variable no está definida, se usa localhost (desarrollo).
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'
