export function LobbyScreen({ username, emailVerified, onResendVerification, ownedRooms, onLogout, onEnterAsHost, onCreateRoom, onJoinRoom }) {
  return (
    <main className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-cyan-500/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-emerald-400/80">Jukebox</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Bienvenido</h2>
            <p className="mt-1 text-sm text-slate-500">Usuario: {username}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-3xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-emerald-400 hover:text-emerald-200"
          >
            Cerrar sesion
          </button>
        </div>
      </section>

      {/* Solo con false: null significa que todavia no sabemos si esta verificado */}
      {emailVerified === false && (
        <section className="flex flex-col gap-3 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-100">Revisa tu correo y abre el enlace para confirmar tu cuenta.</p>
          <button
            type="button"
            onClick={onResendVerification}
            className="rounded-3xl border border-amber-400/50 px-4 py-2 text-sm text-amber-100 transition hover:border-amber-300"
          >
            Reenviar correo
          </button>
        </section>
      )}

      {ownedRooms.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm uppercase tracking-[0.24em] text-emerald-400/80">Tus salas como Host</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {ownedRooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => onEnterAsHost(room)}
                className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-left shadow-xl shadow-emerald-500/10 transition hover:border-emerald-400/60 hover:-translate-y-0.5"
              >
                <p className="text-lg font-semibold text-white">{room.name || room.code}</p>
                <p className="mt-1 text-sm text-emerald-300/70">Codigo: {room.code}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-emerald-400">Entrar como Host</p>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-6 sm:grid-cols-2">
        <button
          type="button"
          onClick={onCreateRoom}
          className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-left shadow-xl shadow-cyan-500/10 transition hover:border-emerald-400/60 hover:-translate-y-0.5"
        >
          <p className="text-lg font-semibold text-white">Crear sala</p>
          <p className="mt-1 text-sm text-slate-400">Crea una nueva sala para tu jukebox</p>
        </button>

        <button
          type="button"
          onClick={onJoinRoom}
          className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-left shadow-xl shadow-cyan-500/10 transition hover:border-cyan-400/60 hover:-translate-y-0.5"
        >
          <p className="text-lg font-semibold text-white">Unirse a sala</p>
          <p className="mt-1 text-sm text-slate-400">Ingresa el codigo de una sala existente</p>
        </button>
      </section>
    </main>
  )
}
