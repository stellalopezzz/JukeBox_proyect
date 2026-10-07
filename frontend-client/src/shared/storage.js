// Claves que la vista de usuario guarda en localStorage.
// Centralizarlas evita errores de tipeo entre quien escribe y quien lee.
export const STORAGE_KEYS = {
  roomCode: 'jukebox_roomCode',
  roomDbId: 'jukebox_roomDbId',
  username: 'jukebox_username',
  sessionToken: 'jukebox_sessionToken',
  votedSongs: 'jukebox_votedSongs',
  authUser: 'jukebox_authUser',
  userId: 'jukebox_userId',
  ownedRooms: 'jukebox_ownedRooms',
  joinedRoom: 'jukebox_joinedRoom',
}

export function readStoredVotes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.votedSongs) || '{}')
  } catch {
    return {}
  }
}

export function clearStoredSession() {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key))
}
