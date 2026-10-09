import { useEffect, useState } from 'react'
import { apiCreateRoom, apiJoinRoom, apiLogin, apiLogout, apiMe, apiRegister } from '../../../api/api'
import { STORAGE_KEYS, clearStoredSession } from '../../../shared/storage'

// Quien soy y en que sala estoy: login/registro, restaurar la sesion guardada,
// crear/unirse a salas y los modales que piden esos datos.
export function useSession({ setStatusMessage }) {
  const [authStage, setAuthStage] = useState('login') // "login" | "home"
  const [authMode, setAuthMode] = useState('signin') // "signin" | "register"
  const [stage, setStage] = useState('login') // "login" | "dashboard"
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [roomDbId, setRoomDbId] = useState('')
  const [ownedRooms, setOwnedRooms] = useState([])
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [showJoinRoomModal, setShowJoinRoomModal] = useState(false)
  const [joinRoomCode, setJoinRoomCode] = useState('')
  const [joiningRoom, setJoiningRoom] = useState(false)

  useEffect(() => {
    const storedRoomCode = localStorage.getItem(STORAGE_KEYS.roomCode)
    const storedRoomDbId = localStorage.getItem(STORAGE_KEYS.roomDbId)
    const storedUser = localStorage.getItem(STORAGE_KEYS.username)
    const storedToken = localStorage.getItem(STORAGE_KEYS.sessionToken)
    const storedAuthUser = localStorage.getItem(STORAGE_KEYS.authUser)
    const storedOwnedRooms = localStorage.getItem(STORAGE_KEYS.ownedRooms)

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
  }, [setStatusMessage])

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

  function toggleAuthMode() {
    setAuthMode(authMode === 'signin' ? 'register' : 'signin')
    setStatusMessage('')
  }

  // Avisa al backend que la sesion termino. No limpia el estado local:
  // eso lo hace resetSession, para que App decida el orden.
  async function logoutFromServer() {
    const token = localStorage.getItem(STORAGE_KEYS.sessionToken)
    if (token) {
      try { await apiLogout(token) } catch {}
    }
  }

  function resetSession() {
    clearStoredSession()
    setOwnedRooms([])
    setAuthStage('login')
    setAuthMode('signin')
    setStage('login')
    setRoomCode('')
    setRoomDbId('')
    setUsername('')
    setPassword('')
    setShowCreateRoomModal(false)
    setRoomName('')
    setShowJoinRoomModal(false)
    setJoinRoomCode('')
  }

  function openJoinRoomModal() {
    setJoinRoomCode('')
    setShowJoinRoomModal(true)
    setStatusMessage('')
  }

  function openCreateRoomModal() {
    setRoomName('')
    setShowCreateRoomModal(true)
    setStatusMessage('')
  }

  // El reproductor vive en /host/:code (ver Root.tsx), igual que al crear la sala.
  function enterAsHost(room) {
    localStorage.setItem(STORAGE_KEYS.roomCode, room.code)
    localStorage.setItem(STORAGE_KEYS.roomDbId, String(room.id))
    setStatusMessage(`Entrando como Host a ${room.name || room.code}`)
    window.location.href = `/host/${room.code}`
  }

  async function confirmCreateRoom() {
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

  async function confirmJoinRoom() {
    const trimmed = joinRoomCode.trim().toUpperCase()
    if (!trimmed) {
      setStatusMessage('El codigo de sala es obligatorio')
      return
    }
    const currentUser = username.trim()
    // El token se guardo en localStorage al hacer login (handleAuthLogin).
    // Sin token no hay sesion, asi que no tiene sentido llamar al backend.
    const token = localStorage.getItem(STORAGE_KEYS.sessionToken)
    if (!currentUser || !token) {
      setStatusMessage('Debes iniciar sesion primero.')
      return
    }
    setJoiningRoom(true)
    try {
      // El backend identifica al usuario por su token de sesion, no por el nombre
      const data = await apiJoinRoom(trimmed, token)
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

  return {
    authStage,
    authMode,
    inRoom: stage === 'dashboard',
    username,
    setUsername,
    password,
    setPassword,
    roomCode,
    roomDbId,
    ownedRooms,
    handleAuthLogin,
    handleRegister,
    toggleAuthMode,
    logoutFromServer,
    resetSession,
    enterAsHost,
    createRoomModal: {
      open: showCreateRoomModal,
      setOpen: setShowCreateRoomModal,
      roomName,
      setRoomName,
      submitting: creatingRoom,
      openModal: openCreateRoomModal,
      confirm: confirmCreateRoom,
    },
    joinRoomModal: {
      open: showJoinRoomModal,
      setOpen: setShowJoinRoomModal,
      roomCode: joinRoomCode,
      setRoomCode: setJoinRoomCode,
      submitting: joiningRoom,
      openModal: openJoinRoomModal,
      confirm: confirmJoinRoom,
    },
  }
}
