import { thumbUrl } from '../../../shared/queueItem'

export function PendingQueue({ pendingSongs, votedSongs, onVoteToggle }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-cyan-500/10">
      <h2 className="text-xl font-semibold text-white">Pendientes</h2>
      <p className="mt-2 text-sm text-slate-400">Las canciones suben segun votos y tiempo de espera.</p>

      <div className="mt-6 space-y-4">
        {pendingSongs.length > 0 ? (
          pendingSongs.map((song, index) => {
            const songId = song.id
            const key = songId ?? `${song.songYtId}-${index}`
            const voted = songId != null && Boolean(votedSongs[String(songId)])

            return (
              <PendingSongCard
                key={key}
                song={song}
                voted={voted}
                onVoteToggle={songId != null ? () => onVoteToggle(songId, voted) : null}
              />
            )
          })
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950 p-6 text-center text-slate-500">
            No hay canciones pendientes.
          </div>
        )}
      </div>
    </div>
  )
}

function PendingSongCard({ song, voted, onVoteToggle }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <img
            src={thumbUrl(song)}
            alt=""
            className="h-14 w-24 shrink-0 rounded-2xl object-cover"
          />
          <div className="min-w-0">
            <p className="font-semibold text-slate-100">{song.songTitle}</p>
            <p className="mt-1 text-sm text-slate-400">{song.songArtist}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-400">Votos</p>
          <p className="text-lg font-semibold text-emerald-300">{song.votesCount ?? 0}</p>
        </div>
      </div>
      {onVoteToggle ? (
        <button
          type="button"
          onClick={onVoteToggle}
          className={`mt-4 inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition sm:w-auto ${
            voted
              ? 'border border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-500'
              : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
          }`}
        >
          {voted ? 'Quitar voto' : 'Votar'}
        </button>
      ) : null}
    </div>
  )
}
