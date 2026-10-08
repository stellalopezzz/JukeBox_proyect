export function AppHeader({ connected, inRoom, roomCode, statusMessage }) {
  return (
    <header className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-cyan-500/10 backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.32em] text-emerald-400/80">Jukebox User MVP</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Sala colaborativa</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Busca canciones, agregalas a la cola y vota para subirlas.
          </p>
        </div>
        <div className="grid gap-2">
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
            Socket: {connected ? 'Conectado' : 'Desconectado'}
          </span>
          <span className="rounded-full bg-slate-800/90 px-3 py-1 text-sm text-slate-300">
            {inRoom ? `Sala: ${roomCode}` : 'Ingresa a una sala'}
          </span>
        </div>
      </div>
      {statusMessage && <p className="mt-4 text-sm text-slate-300">{statusMessage}</p>}
    </header>
  )
}
