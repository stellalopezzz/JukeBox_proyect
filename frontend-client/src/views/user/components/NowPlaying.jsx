import { thumbUrl } from '../../../shared/queueItem'

export function NowPlaying({ nowPlaying, queueLength }) {
  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-cyan-500/10">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.32em] text-emerald-400">Cola de reproduccion</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Sonando ahora</h2>
        </div>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
          {queueLength} canciones
        </span>
      </div>

      {nowPlaying ? (
        <div className="rounded-[2rem] bg-slate-950 p-5 shadow-inner shadow-cyan-500/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <img
                src={thumbUrl(nowPlaying)}
                alt=""
                className="h-24 w-36 rounded-3xl object-cover"
              />
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-emerald-300">Ahora suena</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{nowPlaying.songTitle}</h3>
                <p className="mt-1 text-sm text-slate-400">{nowPlaying.songArtist}</p>
              </div>
            </div>
            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200">
              {nowPlaying.votesCount ?? 0} votos
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-400">
          No hay ninguna cancion sonando ahora. Busca y agrega una pista.
        </div>
      )}
    </article>
  )
}
