import { useState } from 'react'
import type { FormEvent } from 'react'
import { apiResetPassword } from '../../api/api'
import { clearStoredSession } from '../../shared/storage'

// Pagina /restablecer?token=...: a donde lleva el enlace del correo para elegir la contraseña nueva.
export function ResetPasswordPage() {
  const token = new URLSearchParams(window.location.search).get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState(token ? '' : 'El enlace no tiene token.')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!token) return
    // Se revisa aca para no gastar un viaje al backend; el backend igual vuelve a validar
    if (password.length < 8 || password.length > 64) {
      setError('La contraseña debe tener entre 8 y 64 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    try {
      await apiResetPassword(token, password)
      // El backend cerro la sesion vieja: se borra tambien la guardada en este navegador
      clearStoredSession()
      setDone(true)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const inputClass =
    'mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400/80 focus:ring-2 focus:ring-emerald-500/20'

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100">
      <main className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-cyan-500/10">
        <p className="text-center text-sm uppercase tracking-[0.32em] text-emerald-400/80">Jukebox</p>
        <h1 className="mt-2 text-center text-2xl font-semibold text-white">Nueva contraseña</h1>

        {done ? (
          <p className="mt-4 text-center text-sm text-emerald-300">Listo, ya puedes entrar con tu contraseña nueva.</p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm text-slate-300">
              Contraseña nueva
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block text-sm text-slate-300">
              Repite la contraseña
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className={inputClass}
              />
            </label>
            {error && <p className="text-sm text-rose-300">{error}</p>}
            <button
              type="submit"
              disabled={!token}
              className="w-full rounded-3xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-950 disabled:opacity-50"
            >
              Cambiar contraseña
            </button>
          </form>
        )}

        <a href="/" className="mt-6 block text-center text-sm text-slate-400 hover:text-emerald-200">
          Ir a iniciar sesion
        </a>
      </main>
    </div>
  )
}
