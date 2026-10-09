import { useEffect, useRef, useState } from 'react'
import { apiVerifyEmail } from '../../api/api'

type Status = 'loading' | 'ok' | 'error'

// Pagina a la que lleva el enlace del correo: manda el token al backend y muestra el resultado.
export function VerifyEmailPage() {
  const token = new URLSearchParams(window.location.search).get('token')
  // Si el enlace no trae token, el error ya se sabe antes de llamar al backend
  const [status, setStatus] = useState<Status>(token ? 'loading' : 'error')
  const [message, setMessage] = useState(token ? 'Verificando tu correo...' : 'El enlace no tiene token.')
  // En desarrollo, StrictMode ejecuta los efectos dos veces. El token es de un solo uso,
  // asi que la segunda llamada fallaria: este ref evita mandarlo dos veces.
  const sent = useRef(false)

  useEffect(() => {
    if (!token || sent.current) return
    sent.current = true

    apiVerifyEmail(token)
      .then(() => {
        setStatus('ok')
        setMessage('Listo, tu correo quedo confirmado.')
      })
      .catch((error: Error) => {
        setStatus('error')
        setMessage(error.message)
      })
  }, [token])

  const color = status === 'ok' ? 'text-emerald-300' : status === 'error' ? 'text-rose-300' : 'text-slate-300'

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100">
      <main className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-center shadow-xl shadow-cyan-500/10">
        <p className="text-sm uppercase tracking-[0.32em] text-emerald-400/80">Jukebox</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Confirmar correo</h1>
        <p className={`mt-4 text-sm ${color}`}>{message}</p>
        {status !== 'loading' && (
          <a
            href="/"
            className="mt-6 inline-block rounded-3xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-emerald-400 hover:text-emerald-200"
          >
            Ir a JukeBox
          </a>
        )}
      </main>
    </div>
  )
}
