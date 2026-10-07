export function SongSearch({
  connected,
  searchQuery,
  onSearchQueryChange,
  onSubmit,
  loadingSearch,
  searchResults,
  onAddSong,
}) {
  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-cyan-500/10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-emerald-400">Buscar cancion</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Encuentra la proxima pista</h2>
        </div>
        <span className="rounded-full bg-slate-800 px-3 py-2 text-sm text-slate-300">
          {connected ? 'Realtime activo' : 'Esperando realtime'}
        </span>
      </div>

      <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={onSubmit}>
        <input
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          className="min-w-0 flex-1 rounded-full border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
          placeholder="Buscar cancion..."
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-950 transition hover:brightness-110"
        >
          {loadingSearch ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {searchResults.length > 0 && (
        <div className="mt-6 space-y-4">
          {searchResults.map((song) => (
            <div
              key={song.ytId || song.title}
              className="flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <img
                  src={song.thumb || `https://img.youtube.com/vi/${song.ytId}/hqdefault.jpg`}
                  alt={song.title}
                  className="h-16 w-28 rounded-2xl object-cover"
                />
                <div>
                  <p className="font-semibold text-slate-100">{song.title}</p>
                  <p className="text-sm text-slate-400">{song.artist || 'Artista desconocido'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onAddSong(song)}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Agregar
              </button>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}
