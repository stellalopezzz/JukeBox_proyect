import { useState } from 'react'
import { apiToggleVote } from '../../../api/api'
import { STORAGE_KEYS, readStoredVotes } from '../../../shared/storage'

// Recuerda en que canciones vote (en localStorage) y permite votar/desvotar.
// onVoted se llama despues de cada voto para refrescar la cola.
export function useVotes({ setStatusMessage, onVoted }) {
  const [votedSongs, setVotedSongs] = useState(readStoredVotes)

  async function toggleVote(queueItemId, alreadyVoted) {
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
      await onVoted()
      setStatusMessage(alreadyVoted ? 'Voto quitado.' : 'Voto registrado.')
    } catch (error) {
      setStatusMessage(error.message || 'No se pudo actualizar el voto.')
    }
  }

  function clearVotes() {
    setVotedSongs({})
  }

  return { votedSongs, toggleVote, clearVotes }
}
