import { useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import {
  apiAddToQueue,
  apiCreateRoom,
  apiGetQueue,
  apiJoinRoom,
  apiLogin,
  apiLogout,
  apiMe,
  apiRegister,
  apiSearchSongs,
  apiToggleVote,
} from './api/api'
import { SOCKET_URL } from './shared/config'
import { normalizeQueueItem } from './shared/queueItem'
import { STORAGE_KEYS, clearStoredSession, readStoredVotes } from './shared/storage'
import { AppHeader } from './views/user/components/AppHeader'
import { AuthScreen } from './views/user/components/AuthScreen'
import { LobbyScreen } from './views/user/components/LobbyScreen'
import { RoomFormModal } from './views/user/components/RoomFormModal'
import { RoomScreen } from './views/user/components/RoomScreen'

function App() {
  const [authStage, setAuthStage] = useState('login') // "login" | "home"
  const [authMode, setAuthMode] = useState('signin') // "signin" | "register"
  const [password, setPassword] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [roomDbId, setRoomDbId] = useState('')
  const [username, setUsername] = useState('')
  const [stage, setStage] = useState('login')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [queue, setQueue] = useState([])
  const [statusMessage, setStatusMessage] = useState('')
  const [connected, setConnected] = useState(false)
  const [votedSongs, setVotedSongs] = useState({})
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [showJoinRoomModal, setShowJoinRoomModal] = useState(false)
  const [joinRoomCode, setJoinRoomCode] = useState('')
  const [joiningRoom, setJoiningRoom] = useState(false)
  const [ownedRooms, setOwnedRooms] = useState([])
  const socketRef = useRef(null)

  useEffect(() => {
    const storedRoomCode = localStorage.getItem(STORAGE_KEYS.roomCode)
    const storedRoomDbId = localStorage.getItem(STORAGE_KEYS.roomDbId)
    const storedUser = localStorage.getItem(STORAGE_KEYS.username)
    const storedToken = localStorage.getItem(STORAGE_KEYS.sessionToken)
    const storedAuthUser = localStorage.getItem(STORAGE_KEYS.authUser)
    const storedOwnedRooms = localStorage.getItem(STORAGE_KEYS.ownedRooms)

    setVotedSongs(readStoredVotes())

    if (storedOwnedRooms) {
      try { setOwnedRooms(JSON.parse(storedOwnedRooms)) } catch {}
    }

    if (storedAuthUser) {
      setUsername(storedAuthUser)
      setAuthStage('home')
    }

    if (storedRoomCode && storedRoomDbId && storedUser && storedToken) {
      setRoomCode(storedRoomCode)
      setRoomDbId(storedRoomDbId)
      setUsername(storedUser)
      setAuthStage('home')
      setStage('dashboard')
      setStatusMessage(`Sesion cargada para ${storedUser}`)
    } else if (storedToken && storedAuthUser) {
      apiMe(storedToken)
        .then((me) => {
          if (me.ownedRooms && me.ownedRooms.length > 0) {
            setOwnedRooms(me.ownedRooms)
            localStorage.setItem(STORAGE_KEYS.ownedRooms, JSON.stringify(me.ownedRooms))
          }
          if (me.joinedRoom) {
            localStorage.setItem(STORAGE_KEYS.joinedRoom, JSON.stringify(me.joinedRoom))
          }
        })
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (stage !== 'dashboard' || !roomDbId || !username || socketRef.current) return

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
  }, [stage, roomDbId, username])

  useEffect(() => {
    if (stage !== 'dashboard' || !roomDbId) return

    fetchQueue()
  }, [stage, roomDbId])

  async function fetchQueue() {
    try {
      const list = await apiGetQueue(roomDbId)
      if (!list) return
      setQueue(list.map(normalizeQueueItem))
    } catch {
      setStatusMessage('No se pudo cargar la cola.')
    }
  }

  async function handleAuthLogin(event) {
    event.preventDefault()

    if (!username.trim() || !password.trim()) {
      setStatusMessage('Completa usuario y contraseña.')
      return
    }

    try {
      const data = await apiLogin(username.trim(), password.trim())
      localStorage.setItem(STORAGE_KEYS.authUser, data.username)
      localStorage.setItem(STORAGE_KEYS.sessionToken, data.token)
      localStorage.setItem(STORAGE_KEYS.userId, String(data.userId))
      setUsername(data.username)
      setAuthStage('home')
      setStatusMessage(`Bienvenido ${data.username}`)
      setPassword('')

      const me = await apiMe(data.token)
      if (me.ownedRooms && me.ownedRooms.length > 0) {
        setOwnedRooms(me.ownedRooms)
        localStorage.setItem(STORAGE_KEYS.ownedRooms, JSON.stringify(me.ownedRooms))
      } else {
        setOwnedRooms([])
        localStorage.removeItem(STORAGE_KEYS.ownedRooms)
      }
      if (me.joinedRoom) {
        localStorage.setItem(STORAGE_KEYS.joinedRoom, JSON.stringify(me.joinedRoom))
      }
    } catch (error) {
      setStatusMessage(error.message || 'No se pudo iniciar sesion.')
    }
  }

  async function handleRegister(event) {
    event.preventDefault()

    if (!username.trim() || !password.trim()) {
      setStatusMessage('Completa usuario y contraseña.')
      return
    }

    try {
      const data = await apiRegister(username.trim(), password.trim())
      localStorage.setItem(STORAGE_KEYS.authUser, data.username)
      localStorage.setItem(STORAGE_KEYS.sessionToken, data.token)
      localStorage.setItem(STORAGE_KEYS.userId, String(data.userId))
      setUsername(data.username)
      setAuthStage('home')
      setStatusMessage(`Registro exitoso. Bienvenido ${data.username}`)
      setPassword('')

      const me = await apiMe(data.token)
      if (me.ownedRooms && me.ownedRooms.length > 0) {
        setOwnedRooms(me.ownedRooms)
        localStorage.setItem(STORAGE_KEYS.ownedRooms, JSON.stringify(me.ownedRooms))
      } else {
        setOwnedRooms([])
        localStorage.removeItem(STORAGE_KEYS.ownedRooms)
      }
      if (me.joinedRoom) {
        localStorage.setItem(STORAGE_KEYS.joinedRoom, JSON.stringify(me.joinedRoom))
      }
    } catch (error) {
      setStatusMessage(error.message || 'No se pudo registrar.')
    }
  }

  async function handleSearch(event) {
    event.preventDefault()
    const query = searchQuery.trim()
    if (!query) return

    setLoadingSearch(true)
    setStatusMessage('Buscando canciones...')

    try {
      const results = await apiSearchSongs(query)
      setSearchResults(results)
      setStatusMessage(`${results.length} resultados encontrados`)
    } catch {
      setStatusMessage('No se pudo buscar canciones. Reintenta.')
    } finally {
      setLoadingSearch(false)
    }
  }

  async function handleAddSong(song) {
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

  async function handleVoteToggle(queueItemId, alreadyVoted) {
    const token = localStorage.getItem(STORAGE_KEYS.sessionToken)
    if (!token) return

    const idKey = String(queueItemId)

    try {
      await apiToggleVote(token, queueItemId, alreadyVoted)
      const nextVotes = { ...votedSongs }
      if (alreadyVoted) {
        delete nextVotes[idKey]
      } else {
        nextVotes[idKey] = true
      }
      setVotedSongs(nextVotes)
      localStorage.setItem(STORAGE_KEYS.votedSongs, JSON.stringify(nextVotes))
      await fetchQueue()
      setStatusMessage(alreadyVoted ? 'Voto quitado.' : 'Voto registrado.')
    } catch (error) {
      setStatusMessage(error.message || 'No se pudo actualizar el voto.')
    }
  }

  function clearSession() {
    clearStoredSession()
    setOwnedRooms([])
    setAuthStage('login')
    setAuthMode('signin')
    setStage('login')
    setRoomCode('')
    setRoomDbId('')
    setUsername('')
    setPassword('')
    setQueue([])
    setVotedSongs({})
    setShowCreateRoomModal(false)
    setRoomName('')
    setShowJoinRoomModal(false)
    setJoinRoomCode('')
    socketRef.current?.disconnect()
    socketRef.current = null
  }

  async function handleLogout() {
    const token = localStorage.getItem(STORAGE_KEYS.sessionToken)
    if (token) {
      try { await apiLogout(token) } catch {}
    }
    socketRef.current?.disconnect()
    socketRef.current = null
    clearStoredSession()
    setOwnedRooms([])
    setAuthStage('login')
    setAuthMode('signin')
    setStage('login')
    setRoomCode('')
    setRoomDbId('')
    setUsername('')
    setPassword('')
    setQueue([])
    setVotedSongs({})
    setShowCreateRoomModal(false)
    setRoomName('')
    setShowJoinRoomModal(false)
    setJoinRoomCode('')
    setStatusMessage('Sesion cerrada')
  }

  function handleGoToRoomJoin() {
    setJoinRoomCode('')
    setShowJoinRoomModal(true)
    setStatusMessage('')
  }

  function handleCreateRoom() {
    setRoomName('')
    setShowCreateRoomModal(true)
    setStatusMessage('')
  }

  function handleEnterAsHost(room) {
    localStorage.setItem(STORAGE_KEYS.roomCode, room.code)
    localStorage.setItem(STORAGE_KEYS.roomDbId, String(room.id))
    setRoomCode(room.code)
    setRoomDbId(String(room.id))
    setStage('dashboard')
    setStatusMessage(`Entrando como Host a ${room.name || room.code}`)
  }

  async function handleConfirmCreateRoom() {
    const trimmed = roomName.trim()
    if (!trimmed) {
      setStatusMessage('El nombre de la sala es obligatorio')
      return
    }
    if (trimmed.length < 3) {
      setStatusMessage('El nombre debe tener al menos 3 caracteres')
      return
    }
    const token = localStorage.getItem(STORAGE_KEYS.sessionToken)
    if (!token) {
      setStatusMessage('Debes iniciar sesion primero.')
      return
    }
    setCreatingRoom(true)
    try {
      const data = await apiCreateRoom(trimmed, token)
      localStorage.setItem(STORAGE_KEYS.roomCode, data.code)
      localStorage.setItem(STORAGE_KEYS.roomDbId, String(data.id))
      setRoomCode(data.code)
      setRoomDbId(String(data.id))
      setShowCreateRoomModal(false)
      setRoomName('')
      window.location.href = `/host/${data.code}`
    } catch (error) {
      setStatusMessage(error.message || 'No se pudo crear la sala')
    } finally {
      setCreatingRoom(false)
    }
  }

  async function handleConfirmJoinRoom() {
    const trimmed = joinRoomCode.trim().toUpperCase()
    if (!trimmed) {
      setStatusMessage('El codigo de sala es obligatorio')
      return
    }
    const currentUser = username.trim()
    if (!currentUser) {
      setStatusMessage('Debes iniciar sesion primero.')
      return
    }
    setJoiningRoom(true)
    try {
      const data = await apiJoinRoom(trimmed, currentUser)
      const nextRoomCode = data.roomCode || trimmed
      const nextRoomDbId = String(data.roomId)
      localStorage.setItem(STORAGE_KEYS.sessionToken, data.token)
      localStorage.setItem(STORAGE_KEYS.roomDbId, nextRoomDbId)
      localStorage.setItem(STORAGE_KEYS.roomCode, nextRoomCode)
      localStorage.setItem(STORAGE_KEYS.username, currentUser)
      setRoomCode(nextRoomCode)
      setRoomDbId(nextRoomDbId)
      setUsername(currentUser)
      setShowJoinRoomModal(false)
      setJoinRoomCode('')
      setStage('dashboard')
      setStatusMessage(`Bienvenido ${currentUser}`)
    } catch (error) {
      setStatusMessage(error.message || 'No se pudo conectar. Verifica el codigo de sala.')
    } finally {
      setJoiningRoom(false)
    }
  }

  const nowPlaying = useMemo(() => queue.find((s) => s.status === 'PLAYING') || null, [queue])
  const pendingSongs = useMemo(
    () =>
      queue
        .filter((s) => s.status === 'PENDING')
        .sort((a, b) => (b.score || 0) - (a.score || 0)),
    [queue],
  )

  const inRoom = stage === 'dashboard'

  let screen
  if (authStage === 'login') {
    screen = (
      <AuthScreen
        authMode={authMode}
        username={username}
        password={password}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        onToggleMode={() => { setAuthMode(authMode === 'signin' ? 'register' : 'signin'); setStatusMessage('') }}
        onSubmit={authMode === 'signin' ? handleAuthLogin : handleRegister}
      />
    )
  } else if (authStage === 'home' && !inRoom) {
    screen = (
      <LobbyScreen
        username={username}
        ownedRooms={ownedRooms}
        onLogout={handleLogout}
        onEnterAsHost={handleEnterAsHost}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleGoToRoomJoin}
      />
    )
  } else {
    screen = (
      <RoomScreen
        roomCode={roomCode}
        username={username}
        connected={connected}
        onChangeRoom={clearSession}
        onLogout={handleLogout}
        search={{ searchQuery, setSearchQuery, handleSearch, loadingSearch, searchResults }}
        queue={{ queue, nowPlaying, pendingSongs, addSong: handleAddSong }}
        votes={{ votedSongs, toggleVote: handleVoteToggle }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <AppHeader connected={connected} inRoom={inRoom} roomCode={roomCode} statusMessage={statusMessage} />

        {screen}

        {showCreateRoomModal && (
          <RoomFormModal
            title="Crear sala"
            description="Elige un nombre para tu sala de jukebox"
            label="Nombre de la sala"
            value={roomName}
            onValueChange={(value) => { setRoomName(value); setStatusMessage('') }}
            placeholder="Ej. Mi Jukebox"
            maxLength={100}
            statusMessage={statusMessage}
            submitting={creatingRoom}
            submitLabel="Crear"
            submittingLabel="Creando..."
            onSubmit={handleConfirmCreateRoom}
            onCancel={() => { setShowCreateRoomModal(false); setRoomName(''); setStatusMessage('') }}
            onClose={() => setShowCreateRoomModal(false)}
          />
        )}

        {showJoinRoomModal && (
          <RoomFormModal
            title="Unirse a sala"
            description="Ingresa el codigo de sala para entrar como invitado"
            label="Codigo de sala"
            value={joinRoomCode}
            onValueChange={(value) => { setJoinRoomCode(value.toUpperCase()); setStatusMessage('') }}
            placeholder="Ej. A3F9K2"
            maxLength={10}
            statusMessage={statusMessage}
            submitting={joiningRoom}
            submitLabel="Entrar"
            submittingLabel="Entrando..."
            onSubmit={handleConfirmJoinRoom}
            onCancel={() => { setShowJoinRoomModal(false); setJoinRoomCode(''); setStatusMessage('') }}
            onClose={() => setShowJoinRoomModal(false)}
          />
        )}
      </div>
    </div>
  )
}

export default App
