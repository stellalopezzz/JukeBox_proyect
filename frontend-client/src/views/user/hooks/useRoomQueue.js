import { useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { apiAddToQueue, apiGetQueue } from '../../../api/api'
import { SOCKET_URL } from '../../../shared/config'
import { normalizeQueueItem } from '../../../shared/queueItem'
import { STORAGE_KEYS } from '../../../shared/storage'

// Cola de la sala: la trae del backend, escucha el socket para actualizarla
// en tiempo real y permite agregar canciones.
export function useRoomQueue({ inRoom, roomDbId, username, setStatusMessage }) {
  const [queue, setQueue] = useState([])
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)

  async function fetchQueue() {
    try {
      const list = await apiGetQueue(roomDbId)
      if (!list) return
      setQueue(list.map(normalizeQueueItem))
    } catch {
      setStatusMessage('No se pudo cargar la cola.')
    }
  }

  useEffect(() => {
    if (!inRoom || !roomDbId || !username || socketRef.current) return

    const socket = io(SOCKET_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      setStatusMessage('Conectado al realtime service')
      socket.emit('join_room', { roomId: roomDbId, role: 'guest' })
    })

    socket.on('disconnect', () => {
      setConnected(false)
      setStatusMessage('Desconectado del realtime service')
    })

    socket.on('refresh_queue', (message) => {
      setStatusMessage('Cola actualizada automaticamente')
      const raw = Array.isArray(message) ? message : message?.queue
      if (Array.isArray(raw)) {
        setQueue(raw.map(normalizeQueueItem))
      }
    })

    socket.on('connect_error', () => {
      setStatusMessage('No se pudo conectar al realtime service')
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [inRoom, roomDbId, username, setStatusMessage])

  useEffect(() => {
    if (!inRoom || !roomDbId) return

    fetchQueue()
  }, [inRoom, roomDbId])

  async function addSong(song) {
    const token = localStorage.getItem(STORAGE_KEYS.sessionToken)
    if (!token || !roomDbId) {
      setStatusMessage('Sesion incompleta. Vuelve a entrar a la sala.')
      return
    }

    setStatusMessage('Agregando cancion...')

    try {
      await apiAddToQueue(token, {
        roomId: Number(roomDbId),
        ytId: song.ytId,
        title: song.title,
        artist: song.artist,
        thumb: song.thumbnail,
      })
      await fetchQueue()
      setStatusMessage('Cancion enviada a la cola.')
    } catch (error) {
      setStatusMessage(error.message || 'No se pudo agregar la cancion.')
    }
  }

  function disconnect() {
    socketRef.current?.disconnect()
    socketRef.current = null
  }

  function clearQueue() {
    setQueue([])
  }

  const nowPlaying = useMemo(() => queue.find((s) => s.status === 'PLAYING') || null, [queue])
  const pendingSongs = useMemo(
    () =>
      queue
        .filter((s) => s.status === 'PENDING')
        .sort((a, b) => (b.score || 0) - (a.score || 0)),
    [queue],
  )

  return { queue, connected, nowPlaying, pendingSongs, fetchQueue, addSong, disconnect, clearQueue }
}
