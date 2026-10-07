export function AuthScreen({
  authMode,
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  onToggleMode,
  onSubmit,
}) {
  const isSignin = authMode === 'signin'

  return (
    <main className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-cyan-500/10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            {isSignin ? 'Iniciar sesion' : 'Crear cuenta'}
          </h2>
          <button
            type="button"
            onClick={onToggleMode}
            className="rounded-3xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-emerald-400 hover:text-emerald-200"
          >
            {isSignin ? 'Registrarse' : 'Ya tengo cuenta'}
          </button>
        </div>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm text-slate-300">
            Usuario
            <input
              value={username}
              onChange={(event) => onUsernameChange(event.target.value)}
              className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400/80 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Tu nombre de usuario"
            />
          </label>

          <label className="block text-sm text-slate-300">
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400/80 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Tu contraseña"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-3xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-950 shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30"
          >
            {isSignin ? 'Entrar' : 'Registrarse'}
          </button>
        </form>
      </section>
    </main>
  )
}
