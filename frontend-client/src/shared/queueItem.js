// El backend y el realtime-service no siempre usan los mismos nombres de campo
// (title vs songTitle, votes vs votesCount...). Normalizamos para que la UI
// trabaje siempre con la misma forma.
export function normalizeQueueItem(raw) {
  return {
    ...raw,
    id: raw.id,
    songTitle: raw.songTitle ?? raw.title ?? 'Sin titulo',
    songArtist: raw.songArtist ?? raw.artist ?? 'Artista desconocido',
    songYtId: raw.songYtId ?? raw.ytId ?? '',
    songThumb: raw.songThumb ?? raw.thumbnail ?? '',
    votesCount: raw.votesCount ?? raw.votes ?? 0,
    score: raw.score ?? 0,
    status: raw.status,
  }
}

export function thumbUrl(item) {
  if (item.songThumb) return item.songThumb
  if (item.songYtId) return `https://img.youtube.com/vi/${item.songYtId}/hqdefault.jpg`
  return 'https://via.placeholder.com/100x60?text=Cover'
}
