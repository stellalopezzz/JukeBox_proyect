import { NowPlaying } from './NowPlaying'
import { PendingQueue } from './PendingQueue'
import { SongSearch } from './SongSearch'

export function RoomScreen({
  roomCode,
  username,
  connected,
  onChangeRoom,
  onLogout,
  search,
  queue,
  votes,
}) {
  return (
    <main className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-cyan-500/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-slate-400">Tu sala</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{roomCode}</h2>
            <p className="mt-1 text-sm text-slate-500">Usuario: {username}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onChangeRoom}
              className="rounded-3xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-emerald-400 hover:text-emerald-200"
            >
              Cambiar sala
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-3xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-red-400 hover:text-red-200"
            >
              Cerrar sesion
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <SongSearch
            connected={connected}
            searchQuery={search.searchQuery}
            onSearchQueryChange={search.setSearchQuery}
            onSubmit={search.handleSearch}
            loadingSearch={search.loadingSearch}
            searchResults={search.searchResults}
            onAddSong={queue.addSong}
          />
          <NowPlaying nowPlaying={queue.nowPlaying} queueLength={queue.queue.length} />
        </div>

        <aside className="space-y-6">
          <PendingQueue
            pendingSongs={queue.pendingSongs}
            votedSongs={votes.votedSongs}
            onVoteToggle={votes.toggleVote}
          />
        </aside>
      </section>
    </main>
  )
}
