import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useYouTubeIFramePlayer } from './hooks/useYouTubeIFramePlayer'
import { STORAGE_KEYS } from '../../shared/storage'

const SERVER_BASE = 'http://localhost:8080/api'
const SOCKET_URL = 'http://localhost:3000'

const PLACEHOLDER_THUMB = 'https://via.placeholder.com/320x180?text=Music'

type QueueItem = {
  songTitle?: string
  songArtist?: string
  songYtId?: string
  songThumb?: string
  votesCount?: number
  title?: string
  artist?: string
  ytId?: string
  thumbnail?: string
  votes?: number
  status?: string
  score?: number
  id?: number | string
}

type QueueRefreshMessage = QueueItem[] | { queue?: QueueItem[] }
type RoomLookupResponse = { id?: number; code?: string }

function thumbUrl(item: { songThumb?: string; songYtId?: string }): string {
  if (item.songThumb) return item.songThumb
  if (item.songYtId) return `https://img.youtube.com/vi/${item.songYtId}/hqdefault.jpg`
  return PLACEHOLDER_THUMB
}

// sessionStorage es propio de cada pestaña: un login en otra pestaña pisa
// localStorage, pero no esta copia, asi el host sigue siendo el dueño.
const HOST_TOKEN_KEY = 'jukebox_hostSessionToken'

// Copia el token del login a esta pestaña la primera vez (si ya hay copia, la reusa tras un F5).
function captureHostToken(): string | null {
  const saved = sessionStorage.getItem(HOST_TOKEN_KEY)
  if (saved) return saved
  const token = localStorage.getItem(STORAGE_KEYS.sessionToken)
  if (token) sessionStorage.setItem(HOST_TOKEN_KEY, token)
  return token
}

// El backend solo deja avanzar o borrar canciones al owner de la sala,
// y lo reconoce por el token que esta pestaña capturo al abrirse.
function ownerHeaders(): HeadersInit {
  const token = sessionStorage.getItem(HOST_TOKEN_KEY)
  return token ? { 'X-Session-Token': token } : {}
}

async function fetchQueue(roomId: string): Promise<QueueItem[]> {
  const response = await fetch(`${SERVER_BASE}/queue/${encodeURIComponent(roomId)}`)
  if (!response.ok) return []
  const data = await response.json()
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.queue)) return data.queue
  return []
}

export function HostPage({ roomId }: { roomId: string }) {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [resolvedRoomId, setResolvedRoomId] = useState<string | null>(null)
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const socketRef = useRef<ReturnType<typeof io> | null>(null)
  const advancingRef = useRef(false)
  const bootstrappedRef = useRef(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [nextLoading, setNextLoading] = useState(false)
  // Sin sesion del owner en este navegador, el backend rechaza avanzar o borrar.
  const [hasOwnerSession] = useState(() => Boolean(captureHostToken()))

  const normalizedQueue = useMemo(
    () =>
      queue.map((item) => ({
        ...item,
        songTitle: item.songTitle ?? item.title ?? 'Sin titulo',
        songArtist: item.songArtist ?? item.artist ?? 'Artista desconocido',
        songYtId: item.songYtId ?? item.ytId ?? '',
        songThumb: item.songThumb ?? item.thumbnail ?? '',
        votesCount: item.votesCount ?? item.votes ?? 0,
      })),
    [queue],
  )

  const nowPlaying = useMemo(
    () => normalizedQueue.find((item) => item.status === 'PLAYING') || null,
    [normalizedQueue],
  )

  const nextSong = useMemo(() => {
    const pending = normalizedQueue
      .filter((item) => item.status === 'PENDING')
      .sort((a, b) => (b.score || 0) - (a.score || 0))
    return pending[0] || null
  }, [normalizedQueue])

  const pendingSongs = useMemo(
    () => normalizedQueue.filter((item) => item.status === 'PENDING').sort((a, b) => (b.score || 0) - (a.score || 0)),
    [normalizedQueue],
  )

  const refreshQueue = useCallback(async () => {
    if (!resolvedRoomId) return
    const data = await fetchQueue(resolvedRoomId)
    setQueue(data)
  }, [resolvedRoomId])

  const goToNextTrack = useCallback(async () => {
    if (!resolvedRoomId || advancingRef.current) return
    advancingRef.current = true
    setNextLoading(true)
    try {
      const nextResp = await fetch(`${SERVER_BASE}/queue/next-track/${encodeURIComponent(resolvedRoomId)}`, {
        method: 'PATCH',
        headers: ownerHeaders(),
      })
      if (!nextResp.ok) {
        setStatusMessage('No hay siguiente canción o no se pudo avanzar.')
        return
      }
      await refreshQueue()
      setStatusMessage('')
    } catch {
      setStatusMessage('Error al avanzar de canción.')
    } finally {
      advancingRef.current = false
      setNextLoading(false)
    }
  }, [resolvedRoomId, refreshQueue])

  const { containerRef } = useYouTubeIFramePlayer({
    videoId: nowPlaying?.songYtId || null,
    autoplay: true,
    onEnded: async () => {
      if (!resolvedRoomId) return
      await goToNextTrack()
    },
  })

  useEffect(() => {
    if (!roomId) return
    let cancelled = false
    const candidate = roomId.trim()
    if (!candidate) return

    const isNumericId = /^\d+$/.test(candidate)
    if (isNumericId) {
      setResolvedRoomId(candidate)
      fetch(`${SERVER_BASE}/rooms/${encodeURIComponent(candidate)}`)
        .then(async (response) => {
          if (!response.ok) return
          const data = (await response.json()) as RoomLookupResponse
          if (data?.code) setRoomCode(data.code)
        })
        .catch(() => { /* no-op: room code lookup is optional for numeric IDs */ })
      return
    }

    setStatusMessage('Resolviendo sala…')
    fetch(`${SERVER_BASE}/rooms/${encodeURIComponent(candidate)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Room not found')
        const data = (await response.json()) as RoomLookupResponse
        if (!data?.id) throw new Error('Room id missing')
        if (!cancelled) {
          setResolvedRoomId(String(data.id))
          if (data.code) setRoomCode(data.code)
          setStatusMessage('')
        }
      })
      .catch(() => {
        if (cancelled) return
        setResolvedRoomId(null)
        setStatusMessage('No se pudo resolver la sala.')
      })

    return () => {
      cancelled = true
    }
  }, [roomId])

  useEffect(() => {
    if (!resolvedRoomId) return
    if (socketRef.current) return

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join_room', { roomId: resolvedRoomId, role: 'host' })
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('refresh_queue', (message: QueueRefreshMessage) => {
      if (Array.isArray(message)) {
        setQueue(message)
        return
      }
      if (message?.queue && Array.isArray(message.queue)) {
        setQueue(message.queue)
      }
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [resolvedRoomId])

  useEffect(() => {
    if (!resolvedRoomId) return
    let cancelled = false

    fetchQueue(resolvedRoomId)
      .then((data) => {
        if (cancelled) return
        setQueue(data)
      })
      .catch(() => {
        if (cancelled) return
        setStatusMessage('No se pudo cargar la cola.')
      })

    return () => {
      cancelled = true
    }
  }, [resolvedRoomId])

  useEffect(() => {
    if (!resolvedRoomId) return
    if (advancingRef.current) return
    if (bootstrappedRef.current) return
    if (nowPlaying || pendingSongs.length === 0) return
    if (!hasOwnerSession) return

    bootstrappedRef.current = true
    advancingRef.current = true
    fetch(`${SERVER_BASE}/queue/next-track/${encodeURIComponent(resolvedRoomId)}`, {
      method: 'PATCH',
      headers: ownerHeaders(),
    })
      .then(async (resp) => {
        if (!resp.ok) {
          // Por ejemplo 403 si la sesion de este navegador no es la del dueño.
          const body = await resp.json().catch(() => null)
          setStatusMessage(body?.message || 'No se pudo empezar la reproducción.')
          return
        }
        const updated = await fetchQueue(resolvedRoomId)
        setQueue(updated)
      })
      .finally(() => {
        advancingRef.current = false
      })
  }, [resolvedRoomId, nowPlaying, pendingSongs.length, hasOwnerSession])

  useEffect(() => {
    bootstrappedRef.current = false
  }, [resolvedRoomId])

  function handleCopyRoomCode() {
    const code = roomCode || roomId
    navigator.clipboard.writeText(code).then(() => {
      setStatusMessage('Codigo de sala copiado')
    }).catch(() => {
      setStatusMessage('No se pudo copiar el codigo')
    })
  }

  function parseQueueItemId(raw: number | string | undefined): number | null {
    if (raw == null || raw === '') return null
    const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }

  async function handleDeleteItem(queueItemId: number) {
    if (deletingId != null) return
    setDeletingId(queueItemId)
    try {
      const resp = await fetch(`${SERVER_BASE}/queue/${queueItemId}`, {
        method: 'DELETE',
        headers: ownerHeaders(),
      })
      if (!resp.ok) {
        const body = await resp.json().catch(() => null)
        const msg =
          (body && typeof body.message === 'string' && body.message) ||
          (body && typeof body.error === 'string' && body.error) ||
          'No se pudo eliminar la canción.'
        setStatusMessage(msg)
        return
      }
      await refreshQueue()
      setStatusMessage('')
    } catch {
      setStatusMessage('Error al eliminar.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-cyan-500/10 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.32em] text-emerald-400/80">Jukebox</p>
              <h1 className="mt-2 text-2xl font-semibold text-white">Reproductor</h1>
              <p className="mt-1 text-sm text-slate-500">Sala: {roomId}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs ${
                  connected ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {connected ? 'En vivo' : 'Sin conexión'}
              </span>
              <button
                type="button"
                disabled={!resolvedRoomId || nextLoading}
                onClick={() => goToNextTrack()}
                className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {nextLoading ? '…' : 'Siguiente'}
              </button>
            </div>
          </div>
          {statusMessage ? <p className="mt-4 text-sm text-amber-200/90">{statusMessage}</p> : null}
          {!hasOwnerSession ? (
            <p className="mt-4 text-sm text-amber-200/90">
              Inicia sesion como dueño de la sala en este navegador para que la musica avance.
            </p>
          ) : null}
        </header>

        {roomCode && (
          <section className="mb-6 rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 p-6 shadow-xl shadow-emerald-500/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.32em] text-emerald-400">Comparte este codigo</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="rounded-xl bg-slate-950 px-5 py-3 text-2xl font-mono font-bold tracking-[0.2em] text-white">{roomCode}</span>
                  <button
                    type="button"
                    onClick={handleCopyRoomCode}
                    className="rounded-full border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:border-emerald-400 hover:text-emerald-200"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        <main className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <article className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-cyan-500/10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm uppercase tracking-[0.32em] text-emerald-400">Ahora suena</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{nowPlaying?.songTitle || 'Sin reproducción'}</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {nowPlaying?.songArtist || (nowPlaying ? 'Artista desconocido' : 'La cola está vacía')}
                  </p>
                </div>
                {nowPlaying ? (
                  <img
                    src={thumbUrl(nowPlaying)}
                    alt=""
                    className="h-20 w-32 shrink-0 rounded-2xl object-cover"
                  />
                ) : null}
                <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200">
                  {(nowPlaying?.votesCount ?? 0).toString()} votos
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950">
                <div className="aspect-video w-full">
                  <div ref={containerRef} className="h-full w-full" />
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Siguiente</p>
                {nextSong ? (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={thumbUrl(nextSong)}
                      alt=""
                      className="h-14 w-24 rounded-2xl object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-100">{nextSong.songTitle}</p>
                      <p className="mt-1 truncate text-sm text-slate-400">{nextSong.songArtist}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No hay más canciones en cola.</p>
                )}
              </div>
            </article>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-cyan-500/10">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.32em] text-emerald-400">En cola</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Próximas</h3>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">{pendingSongs.length}</span>
              </div>

              <div className="space-y-4">
                {pendingSongs.length > 0 ? (
                  pendingSongs.map((song, index) => {
                    const key = song.id ?? `${song.songYtId ?? song.songTitle ?? 'song'}-${index}`
                    const qid = parseQueueItemId(song.id)
                    return (
                      <div key={key} className="rounded-3xl border border-slate-800 bg-slate-950 px-4 py-4">
                        <div className="flex items-start gap-3">
                          <img
                            src={thumbUrl(song)}
                            alt=""
                            className="h-14 w-24 rounded-2xl object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-slate-100">{song.songTitle || 'Sin título'}</p>
                            <p className="mt-1 truncate text-sm text-slate-400">{song.songArtist || 'Artista desconocido'}</p>
                            <div className="mt-3 flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-emerald-300">{song.votesCount ?? 0} votos</span>
                              {qid != null ? (
                                <button
                                  type="button"
                                  disabled={deletingId != null}
                                  onClick={() => handleDeleteItem(qid)}
                                  className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                                >
                                  {deletingId === qid ? '…' : 'Eliminar'}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
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
        </main>
      </div>
    </div>
  )
}
