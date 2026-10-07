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
import { normalizeQueueItem, thumbUrl } from './shared/queueItem'
import { STORAGE_KEYS, clearStoredSession, readStoredVotes } from './shared/storage'

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-cyan-500/10 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.32em] text-emerald-400/80">Jukebox User MVP</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Sala colaborativa</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-400">
                Busca canciones, agregalas a la cola y vota para subirlas.
              </p>
            </div>
            <div className="grid gap-2">
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
                Socket: {connected ? 'Conectado' : 'Desconectado'}
              </span>
              <span className="rounded-full bg-slate-800/90 px-3 py-1 text-sm text-slate-300">
                {stage === 'dashboard' ? `Sala: ${roomCode}` : 'Ingresa a una sala'}
              </span>
            </div>
          </div>
          {statusMessage && <p className="mt-4 text-sm text-slate-300">{statusMessage}</p>}
        </header>

        {authStage === 'login' ? (
          <main className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-cyan-500/10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">
                  {authMode === 'signin' ? 'Iniciar sesion' : 'Crear cuenta'}
                </h2>
                <button
                  type="button"
                  onClick={() => { setAuthMode(authMode === 'signin' ? 'register' : 'signin'); setStatusMessage('') }}
                  className="rounded-3xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-emerald-400 hover:text-emerald-200"
                >
                  {authMode === 'signin' ? 'Registrarse' : 'Ya tengo cuenta'}
                </button>
              </div>
              <form className="mt-6 space-y-4" onSubmit={authMode === 'signin' ? handleAuthLogin : handleRegister}>
                <label className="block text-sm text-slate-300">
                  Usuario
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400/80 focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Tu nombre de usuario"
                  />
                </label>

                <label className="block text-sm text-slate-300">
                  Contraseña
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400/80 focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Tu contraseña"
                  />
                </label>

                <button
                  type="submit"
                  className="w-full rounded-3xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-950 shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30"
                >
                  {authMode === 'signin' ? 'Entrar' : 'Registrarse'}
                </button>
              </form>
            </section>
          </main>
        ) : authStage === 'home' && stage !== 'dashboard' ? (
          <main className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-cyan-500/10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.32em] text-emerald-400/80">Jukebox</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Bienvenido</h2>
                  <p className="mt-1 text-sm text-slate-500">Usuario: {username}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-3xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-emerald-400 hover:text-emerald-200"
                >
                  Cerrar sesion
                </button>
              </div>
            </section>

            {ownedRooms.length > 0 && (
              <section>
                <h3 className="mb-3 text-sm uppercase tracking-[0.24em] text-emerald-400/80">Tus salas como Host</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {ownedRooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => handleEnterAsHost(room)}
                      className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-left shadow-xl shadow-emerald-500/10 transition hover:border-emerald-400/60 hover:-translate-y-0.5"
                    >
                      <p className="text-lg font-semibold text-white">{room.name || room.code}</p>
                      <p className="mt-1 text-sm text-emerald-300/70">Codigo: {room.code}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-emerald-400">Entrar como Host</p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="grid gap-6 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleCreateRoom}
                className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-left shadow-xl shadow-cyan-500/10 transition hover:border-emerald-400/60 hover:-translate-y-0.5"
              >
                <p className="text-lg font-semibold text-white">Crear sala</p>
                <p className="mt-1 text-sm text-slate-400">Crea una nueva sala para tu jukebox</p>
              </button>

              <button
                type="button"
                onClick={handleGoToRoomJoin}
                className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-left shadow-xl shadow-cyan-500/10 transition hover:border-cyan-400/60 hover:-translate-y-0.5"
              >
                <p className="text-lg font-semibold text-white">Unirse a sala</p>
                <p className="mt-1 text-sm text-slate-400">Ingresa el codigo de una sala existente</p>
              </button>
            </section>
          </main>
        ) : (
          <main className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-cyan-500/10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.32em] text-slate-400">Tu sala</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{roomCode}</h2>
                  <p className="mt-1 text-sm text-slate-500">Usuario: {username}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={clearSession}
                    className="rounded-3xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-emerald-400 hover:text-emerald-200"
                  >
                    Cambiar sala
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-3xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-red-400 hover:text-red-200"
                  >
                    Cerrar sesion
                  </button>
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-6">
                <article className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-cyan-500/10">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-emerald-400">Buscar cancion</p>
                      <h2 className="mt-2 text-xl font-semibold text-white">Encuentra la proxima pista</h2>
                    </div>
                    <span className="rounded-full bg-slate-800 px-3 py-2 text-sm text-slate-300">
                      {connected ? 'Realtime activo' : 'Esperando realtime'}
                    </span>
                  </div>

                  <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={handleSearch}>
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="min-w-0 flex-1 rounded-full border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                      placeholder="Buscar cancion..."
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-950 transition hover:brightness-110"
                    >
                      {loadingSearch ? 'Buscando...' : 'Buscar'}
                    </button>
                  </form>

                  {searchResults.length > 0 && (
                    <div className="mt-6 space-y-4">
                      {searchResults.map((song) => (
                        <div
                          key={song.ytId || song.title}
                          className="flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <img
                            src={song.thumb || `https://img.youtube.com/vi/${song.ytId}/hqdefault.jpg`}
                            alt={song.title}
                            className="h-16 w-28 rounded-2xl object-cover"
                            />
                            <div>
                              <p className="font-semibold text-slate-100">{song.title}</p>
                              <p className="text-sm text-slate-400">{song.artist || 'Artista desconocido'}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddSong(song)}
                            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                          >
                            Agregar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </article>

                <article className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-cyan-500/10">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.32em] text-emerald-400">Cola de reproduccion</p>
                      <h2 className="mt-2 text-xl font-semibold text-white">Sonando ahora</h2>
                    </div>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                      {queue.length} canciones
                    </span>
                  </div>

                  {nowPlaying ? (
                    <div className="rounded-[2rem] bg-slate-950 p-5 shadow-inner shadow-cyan-500/10">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <img
                            src={thumbUrl(nowPlaying)}
                            alt=""
                            className="h-24 w-36 rounded-3xl object-cover"
                          />
                          <div>
                            <p className="text-sm uppercase tracking-[0.24em] text-emerald-300">Ahora suena</p>
                            <h3 className="mt-2 text-xl font-semibold text-white">{nowPlaying.songTitle}</h3>
                            <p className="mt-1 text-sm text-slate-400">{nowPlaying.songArtist}</p>
                          </div>
                        </div>
                        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200">
                          {nowPlaying.votesCount ?? 0} votos
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[2rem] border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-400">
                      No hay ninguna cancion sonando ahora. Busca y agrega una pista.
                    </div>
                  )}
                </article>
              </div>

              <aside className="space-y-6">
                <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-cyan-500/10">
                  <h2 className="text-xl font-semibold text-white">Pendientes</h2>
                  <p className="mt-2 text-sm text-slate-400">Las canciones suben segun votos y tiempo de espera.</p>

                  <div className="mt-6 space-y-4">
                    {pendingSongs.length > 0 ? (
                      pendingSongs.map((song, index) => {
                        const songId = song.id
                        const key = songId ?? `${song.songYtId}-${index}`
                        const voted = songId != null && Boolean(votedSongs[String(songId)])

                        return (
                          <div key={key} className="rounded-3xl border border-slate-800 bg-slate-950 px-4 py-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 flex-1 items-start gap-3">
                                <img
                                  src={thumbUrl(song)}
                                  alt=""
                                  className="h-14 w-24 shrink-0 rounded-2xl object-cover"
                                />
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-100">{song.songTitle}</p>
                                  <p className="mt-1 text-sm text-slate-400">{song.songArtist}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-slate-400">Votos</p>
                                <p className="text-lg font-semibold text-emerald-300">{song.votesCount ?? 0}</p>
                              </div>
                            </div>
                            {songId != null ? (
                              <button
                                type="button"
                                onClick={() => handleVoteToggle(songId, voted)}
                                className={`mt-4 inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition sm:w-auto ${
                                  voted
                                    ? 'border border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-500'
                                    : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                                }`}
                              >
                                {voted ? 'Quitar voto' : 'Votar'}
                              </button>
                            ) : null}
                          </div>
                        )
                      })
                    ) : (
                      <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950 p-6 text-center text-slate-500">
                        No hay canciones pendientes.
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            </section>
          </main>
        )}

        {showCreateRoomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateRoomModal(false)}>
            <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-2xl shadow-cyan-500/20" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-semibold text-white">Crear sala</h2>
              <p className="mt-2 text-sm text-slate-400">Elige un nombre para tu sala de jukebox</p>

              <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); handleConfirmCreateRoom() }}>
                <label className="block text-sm text-slate-300">
                  Nombre de la sala
                  <input
                    value={roomName}
                    onChange={(e) => { setRoomName(e.target.value); setStatusMessage('') }}
                    className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400/80 focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Ej. Mi Jukebox"
                    maxLength={100}
                    autoFocus
                  />
                </label>

                {statusMessage && !statusMessage.startsWith('Conectado') && !statusMessage.startsWith('Desconectado') && !statusMessage.startsWith('Cola') && !statusMessage.startsWith('No se pudo cargar') && (
                  <p className="text-sm text-amber-300">{statusMessage}</p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowCreateRoomModal(false); setRoomName(''); setStatusMessage('') }}
                    className="flex-1 rounded-3xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingRoom || !roomName.trim()}
                    className="flex-1 rounded-3xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-950 shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creatingRoom ? 'Creando...' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showJoinRoomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowJoinRoomModal(false)}>
            <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-2xl shadow-cyan-500/20" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-semibold text-white">Unirse a sala</h2>
              <p className="mt-2 text-sm text-slate-400">Ingresa el codigo de sala para entrar como invitado</p>

              <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); handleConfirmJoinRoom() }}>
                <label className="block text-sm text-slate-300">
                  Codigo de sala
                  <input
                    value={joinRoomCode}
                    onChange={(e) => { setJoinRoomCode(e.target.value.toUpperCase()); setStatusMessage('') }}
                    className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400/80 focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Ej. A3F9K2"
                    maxLength={10}
                    autoFocus
                  />
                </label>

                {statusMessage && !statusMessage.startsWith('Conectado') && !statusMessage.startsWith('Desconectado') && !statusMessage.startsWith('Cola') && !statusMessage.startsWith('No se pudo cargar') && (
                  <p className="text-sm text-amber-300">{statusMessage}</p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowJoinRoomModal(false); setJoinRoomCode(''); setStatusMessage('') }}
                    className="flex-1 rounded-3xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={joiningRoom || !joinRoomCode.trim()}
                    className="flex-1 rounded-3xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-950 shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {joiningRoom ? 'Entrando...' : 'Entrar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
