import { useState } from 'react'
import type { FormEvent } from 'react'
import { apiForgotPassword } from '../../api/api'

// Pagina /recuperar: pide el correo y manda el enlace para elegir una contraseña nueva.
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!email.trim()) {
      setError('Escribe tu correo.')
      return
    }
    try {
      await apiForgotPassword(email.trim())
      setSent(true)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100">
      <main className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-cyan-500/10">
        <p className="text-center text-sm uppercase tracking-[0.32em] text-emerald-400/80">Jukebox</p>
        <h1 className="mt-2 text-center text-2xl font-semibold text-white">Recuperar contraseña</h1>

        {sent ? (
          // El backend responde igual exista o no la cuenta, asi que el mensaje tampoco lo dice
          <p className="mt-4 text-center text-sm text-emerald-300">
            Si ese correo tiene una cuenta, te mandamos un enlace. Vence en 1 hora.
          </p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm text-slate-300">
              Correo
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400/80 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="tu@correo.com"
              />
            </label>
            {error && <p className="text-sm text-rose-300">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-3xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-950"
            >
              Enviar enlace
            </button>
          </form>
        )}

        <a href="/" className="mt-6 block text-center text-sm text-slate-400 hover:text-emerald-200">
          Volver a iniciar sesion
        </a>
      </main>
    </div>
  )
}
