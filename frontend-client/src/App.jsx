import { useState } from 'react'
import { AppHeader } from './views/user/components/AppHeader'
import { AuthScreen } from './views/user/components/AuthScreen'
import { LobbyScreen } from './views/user/components/LobbyScreen'
import { RoomFormModal } from './views/user/components/RoomFormModal'
import { RoomScreen } from './views/user/components/RoomScreen'
import { useRoomQueue } from './views/user/hooks/useRoomQueue'
import { useSession } from './views/user/hooks/useSession'
import { useSongSearch } from './views/user/hooks/useSongSearch'
import { useVotes } from './views/user/hooks/useVotes'

// Vista de usuario/invitado. App solo conecta los hooks (estado y servidores)
// con las pantallas (interfaz) y decide cual mostrar.
function App() {
  // Un solo mensaje de estado para toda la vista; cada hook lo actualiza.
  const [statusMessage, setStatusMessage] = useState('')

  const session = useSession({ setStatusMessage })
  const room = useRoomQueue({
    inRoom: session.inRoom,
    roomDbId: session.roomDbId,
    username: session.username,
    setStatusMessage,
  })
  const search = useSongSearch({ setStatusMessage })
  const votes = useVotes({ setStatusMessage, onVoted: room.fetchQueue })

  // "Cambiar sala": borra la sesion local y desconecta el socket.
  function handleChangeRoom() {
    session.resetSession()
    room.clearQueue()
    votes.clearVotes()
    room.disconnect()
  }

  async function handleLogout() {
    await session.logoutFromServer()
    room.disconnect()
    session.resetSession()
    room.clearQueue()
    votes.clearVotes()
    setStatusMessage('Sesion cerrada')
  }

  const { createRoomModal, joinRoomModal } = session

  let screen
  if (session.authStage === 'login') {
    screen = (
      <AuthScreen
        authMode={session.authMode}
        email={session.email}
        username={session.username}
        password={session.password}
        onEmailChange={session.setEmail}
        onUsernameChange={session.setUsername}
        onPasswordChange={session.setPassword}
        onToggleMode={session.toggleAuthMode}
        onSubmit={session.authMode === 'signin' ? session.handleAuthLogin : session.handleRegister}
      />
    )
  } else if (session.authStage === 'home' && !session.inRoom) {
    screen = (
      <LobbyScreen
        username={session.username}
        ownedRooms={session.ownedRooms}
        onLogout={handleLogout}
        onEnterAsHost={session.enterAsHost}
        onCreateRoom={createRoomModal.openModal}
        onJoinRoom={joinRoomModal.openModal}
      />
    )
  } else {
    screen = (
      <RoomScreen
        roomCode={session.roomCode}
        username={session.username}
        connected={room.connected}
        onChangeRoom={handleChangeRoom}
        onLogout={handleLogout}
        search={search}
        queue={room}
        votes={votes}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <AppHeader
          connected={room.connected}
          inRoom={session.inRoom}
          roomCode={session.roomCode}
          statusMessage={statusMessage}
        />

        {screen}

        {createRoomModal.open && (
          <RoomFormModal
            title="Crear sala"
            description="Elige un nombre para tu sala de jukebox"
            label="Nombre de la sala"
            value={createRoomModal.roomName}
            onValueChange={(value) => { createRoomModal.setRoomName(value); setStatusMessage('') }}
            placeholder="Ej. Mi Jukebox"
            maxLength={100}
            statusMessage={statusMessage}
            submitting={createRoomModal.submitting}
            submitLabel="Crear"
            submittingLabel="Creando..."
            onSubmit={createRoomModal.confirm}
            onCancel={() => { createRoomModal.setOpen(false); createRoomModal.setRoomName(''); setStatusMessage('') }}
            onClose={() => createRoomModal.setOpen(false)}
          />
        )}

        {joinRoomModal.open && (
          <RoomFormModal
            title="Unirse a sala"
            description="Ingresa el codigo de sala para entrar como invitado"
            label="Codigo de sala"
            value={joinRoomModal.roomCode}
            onValueChange={(value) => { joinRoomModal.setRoomCode(value.toUpperCase()); setStatusMessage('') }}
            placeholder="Ej. A3F9K2"
            maxLength={10}
            statusMessage={statusMessage}
            submitting={joinRoomModal.submitting}
            submitLabel="Entrar"
            submittingLabel="Entrando..."
            onSubmit={joinRoomModal.confirm}
            onCancel={() => { joinRoomModal.setOpen(false); joinRoomModal.setRoomCode(''); setStatusMessage('') }}
            onClose={() => joinRoomModal.setOpen(false)}
          />
        )}
      </div>
    </div>
  )
}

export default App
