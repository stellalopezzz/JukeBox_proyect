import { useCallback, useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    YT?: YouTubeNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

type YouTubePlayer = {
  destroy?: () => void
  mute?: () => void
  playVideo?: () => void
  loadVideoById?: (videoId: string) => void
  getVideoData?: () => { video_id?: string }
  getCurrentTime?: () => number
  getDuration?: () => number
}

type YouTubePlayerEvent = {
  data?: number
  target?: YouTubePlayer
}

type YouTubePlayerOptions = {
  height: string
  width: string
  videoId?: string
  playerVars: Record<string, number>
  events: {
    onReady: () => void
    onStateChange: (event: YouTubePlayerEvent) => void
    onError: () => void
  }
}

type YouTubeNamespace = {
  Player: new (element: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayer
}

type UseYouTubeIFramePlayerArgs = {
  videoId: string | null
  autoplay?: boolean
  onEnded?: () => void
}

type PlayerStatus = 'idle' | 'loading' | 'ready' | 'error'

let youtubeApiPromise: Promise<void> | null = null

function loadYouTubeIFrameApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if (window.YT?.Player) return Promise.resolve()
  if (youtubeApiPromise) return youtubeApiPromise

  youtubeApiPromise = new Promise((resolve, reject) => {
    const finish = () => resolve()

    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      finish()
    }

    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]')

    if (window.YT?.Player) {
      finish()
      return
    }

    if (!existing) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      script.onerror = () => reject(new Error('Failed to load YouTube IFrame API'))
      document.body.appendChild(script)
      return
    }

    // Script tag ya está en el DOM: la API puede estar lista o cargando
    let attempts = 0
    const maxAttempts = 200
    const poll = () => {
      if (window.YT?.Player) {
        finish()
        return
      }
      attempts += 1
      if (attempts >= maxAttempts) {
        reject(new Error('YouTube IFrame API timeout'))
        return
      }
      window.setTimeout(poll, 50)
    }
    poll()
  })

  return youtubeApiPromise
}

export function useYouTubeIFramePlayer({ videoId, autoplay = true, onEnded }: UseYouTubeIFramePlayerArgs) {
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null)
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    setContainerEl(node)
  }, [])

  const playerRef = useRef<YouTubePlayer | null>(null)
  const videoIdRef = useRef<string | null>(videoId)
  videoIdRef.current = videoId

  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded

  const [status, setStatus] = useState<PlayerStatus>('idle')
  const [currentTimeSec, setCurrentTimeSec] = useState(0)
  const [durationSec, setDurationSec] = useState(0)

  const destroy = useCallback(() => {
    try {
      playerRef.current?.destroy?.()
    } catch {
      // ignore
    } finally {
      playerRef.current = null
    }
  }, [])

  // Un solo player por ciclo de vida del contenedor; onEnded estable vía ref
  useEffect(() => {
    if (!containerEl) return
    setStatus('loading')

    let cancelled = false

    loadYouTubeIFrameApi()
      .then(() => {
        if (cancelled) return
        if (!containerEl) return
        if (!window.YT?.Player) {
          setStatus('error')
          return
        }

        destroy()

        playerRef.current = new window.YT.Player(containerEl, {
          height: '100%',
          width: '100%',
          videoId: videoIdRef.current || undefined,
          playerVars: {
            autoplay: autoplay ? 1 : 0,
            controls: 1,
            rel: 0,
            playsinline: 1,
            modestbranding: 1,
          },
          events: {
            onReady: () => {
              if (cancelled) return
              setStatus('ready')
              const id = videoIdRef.current
              if (autoplay && id) {
                try {
                  playerRef.current?.mute?.()
                  playerRef.current?.loadVideoById?.(id)
                  playerRef.current?.playVideo?.()
                } catch {
                  // ignore
                }
              }
              setDurationSec(Math.floor(playerRef.current?.getDuration?.() ?? 0))
            },
            onStateChange: (event: YouTubePlayerEvent) => {
              if (event?.data === 1) setStatus('ready')
              if (event?.data === 0) onEndedRef.current?.()
            },
            onError: () => {
              if (cancelled) return
              setStatus('error')
            },
          },
        })
      })
      .catch(() => {
        if (cancelled) return
        setStatus('error')
      })

    return () => {
      cancelled = true
      destroy()
    }
  }, [autoplay, containerEl, destroy])

  useEffect(() => {
    if (!videoId) return
    const p = playerRef.current
    if (!p) return

    try {
      setCurrentTimeSec(0)
      p.loadVideoById?.(videoId)
      // Sin mute(): el player recuerda si el host ya activó el sonido
      if (autoplay) p.playVideo?.()
    } catch {
      // ignore
    }
  }, [videoId, autoplay])

  useEffect(() => {
    const id = window.setInterval(() => {
      const current = playerRef.current?.getCurrentTime?.() ?? 0
      const duration = playerRef.current?.getDuration?.() ?? 0
      setCurrentTimeSec(Math.max(0, Math.floor(current)))
      setDurationSec(Math.max(0, Math.floor(duration)))
    }, 1000)

    return () => {
      window.clearInterval(id)
    }
  }, [])

  return { containerRef: setContainerRef, status, currentTimeSec, durationSec }
}
