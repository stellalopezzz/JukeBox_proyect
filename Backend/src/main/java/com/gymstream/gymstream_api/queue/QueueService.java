package com.gymstream.gymstream_api.queue;

import com.gymstream.gymstream_api.cooldown.Cooldown;
import com.gymstream.gymstream_api.cooldown.CooldownRepository;
import com.gymstream.gymstream_api.room.Room;
import com.gymstream.gymstream_api.room.RoomRepository;
import com.gymstream.gymstream_api.song.Song;
import com.gymstream.gymstream_api.song.SongRepository;
import com.gymstream.gymstream_api.user.AppUser;
import com.gymstream.gymstream_api.vote.Vote;
import com.gymstream.gymstream_api.vote.VoteRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class QueueService {

    private final QueueRepository queueRepository;
    private final VoteRepository voteRepository;
    private final SongRepository songRepository;
    private final RoomRepository roomRepository;
    private final CooldownRepository cooldownRepository;

    // Cuántas canciones pendientes puede tener cada usuario en la cola a la vez
    static final int MAX_CANCIONES_PENDIENTES_POR_USUARIO = 3;
    // Cuánto tiene que esperar un usuario entre un voto y el siguiente
    static final int SEGUNDOS_ENTRE_VOTOS = 60;

    public QueueService(
            QueueRepository queueRepository,
            VoteRepository voteRepository,
            SongRepository songRepository,
            RoomRepository roomRepository,
            CooldownRepository cooldownRepository) {
        this.queueRepository = queueRepository;
        this.voteRepository = voteRepository;
        this.songRepository = songRepository;
        this.roomRepository = roomRepository;
        this.cooldownRepository = cooldownRepository;
    }

    @Transactional
    public QueueItem addToQueue(String ytId, String title, String artist,
                                String thumb, Long roomId, AppUser user) {

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Sala no encontrada"));
        ensureUserBelongsToRoom(user, roomId);

        Song song = songRepository.findByYoutubeId(ytId)
                .orElseGet(() -> {
                    Song newSong = new Song();
                    newSong.setYoutubeId(ytId);
                    newSong.setTitle(title);
                    newSong.setArtist(artist);
                    newSong.setThumbnailUrl(thumb);
                    return songRepository.save(newSong);
                });

        Optional<Cooldown> cooldownActivo = cooldownRepository
                .findByRoomIdAndIdentifierAndTypeAndExpiresAtAfter(
                        roomId,
                        song.getYoutubeId(),
                        Cooldown.CooldownType.SONG,
                        LocalDateTime.now()
                );

        if (cooldownActivo.isPresent()) {
            long minutosRestantes = java.time.Duration.between(
                    LocalDateTime.now(),
                    cooldownActivo.get().getExpiresAt()
            ).toMinutes() + 1;

            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Esta cancion no puede agregarse por " + minutosRestantes + " minutos mas"
            );
        }

        Optional<QueueItem> existingItem = queueRepository
                .findWithLockByRoomIdAndSongIdAndStatus(roomId, song.getId(), QueueItem.QueueStatus.PENDING);

        if (existingItem.isPresent()) {
            QueueItem item = existingItem.get();
            addVoteOrReject(item, user);
            item.setVotesCount(voteRepository.countByQueueItemId(item.getId()));
            return queueRepository.save(item);
        }

        // Solo se controla al crear una canción nueva: sumarse a una que ya está es un voto
        long pendientesDelUsuario = queueRepository.countByRoomIdAndAddedByIdAndStatus(
                roomId, user.getId(), QueueItem.QueueStatus.PENDING);
        if (pendientesDelUsuario >= MAX_CANCIONES_PENDIENTES_POR_USUARIO) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Ya tenes " + MAX_CANCIONES_PENDIENTES_POR_USUARIO
                            + " canciones en la cola. Espera a que suene una para agregar otra");
        }

        QueueItem newItem = new QueueItem();
        newItem.setRoom(room);
        newItem.setSong(song);
        newItem.setAddedBy(user);
        newItem.setStatus(QueueItem.QueueStatus.PENDING);
        QueueItem savedItem = queueRepository.save(newItem);

        addVoteOrReject(savedItem, user);
        savedItem.setVotesCount(voteRepository.countByQueueItemId(savedItem.getId()));
        return queueRepository.save(savedItem);
    }

    @Transactional
    public QueueItem unvote(Long queueItemId, AppUser user) {
        QueueItem item = queueRepository.findWithLockById(queueItemId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cancion no encontrada en la cola"));
        ensureUserBelongsToRoom(user, item.getRoom().getId());

        Vote vote = voteRepository.findByQueueItemIdAndUserId(queueItemId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "No votaste esta cancion"));

        voteRepository.delete(vote);
        item.setVotesCount(voteRepository.countByQueueItemId(item.getId()));
        return queueRepository.save(item);
    }

    @Transactional
    public Long deleteQueueItem(Long queueItemId) {
        QueueItem item = queueRepository.findById(queueItemId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Item no encontrado en la cola"));

        if (item.getStatus() != QueueItem.QueueStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Solo se pueden eliminar canciones pendientes");
        }

        Long roomId = item.getRoom().getId();
        voteRepository.deleteByQueueItemId(queueItemId);
        queueRepository.delete(item);
        return roomId;
    }

    @Transactional
    public QueueItem vote(Long queueItemId, AppUser user) {
        QueueItem item = queueRepository.findWithLockById(queueItemId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cancion no encontrada en la cola"));
        ensureUserBelongsToRoom(user, item.getRoom().getId());

        LocalDateTime inicioDeEspera = LocalDateTime.now().minusSeconds(SEGUNDOS_ENTRE_VOTOS);
        boolean votoReciente = voteRepository
                .existsRecentVoteByUserInRoom(user.getId(), item.getRoom().getId(), inicioDeEspera);

        if (votoReciente) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Debes esperar " + SEGUNDOS_ENTRE_VOTOS + " segundos entre un voto y el siguiente");
        }

        addVoteOrReject(item, user);
        item.setVotesCount(voteRepository.countByQueueItemId(item.getId()));
        return queueRepository.save(item);
    }

    @Transactional(readOnly = true)
    public List<QueueItemDTO> getQueue(Long roomId) {
        List<QueueItem> pendingItems = queueRepository
                .findByRoomIdAndStatus(roomId, QueueItem.QueueStatus.PENDING);
        List<QueueItem> playingItems = queueRepository
                .findByRoomIdAndStatus(roomId, QueueItem.QueueStatus.PLAYING);

        List<QueueItemDTO> result = new ArrayList<>();
        String currentArtist = null;
        if (!playingItems.isEmpty()) {
            QueueItem playing = playingItems.get(0);
            currentArtist = playing.getSong().getArtist();
            result.add(new QueueItemDTO(playing, Double.MAX_VALUE));
        }

        List<QueueItemDTO> pendingDTOs = scorePendingItems(pendingItems, currentArtist);
        result.addAll(pendingDTOs);
        return result;
    }

    @Transactional
    public QueueItemDTO nextTrack(Long roomId) {
        List<QueueItem> playingItems = queueRepository
                .findWithLockByRoomIdAndStatus(roomId, QueueItem.QueueStatus.PLAYING);

        String lastArtist = null;
        if (!playingItems.isEmpty()) {
            LocalDateTime playedAt = LocalDateTime.now();
            for (int i = 0; i < playingItems.size(); i++) {
                QueueItem currentlyPlaying = playingItems.get(i);
                if (i == 0 && currentlyPlaying.getSong() != null) {
                    lastArtist = currentlyPlaying.getSong().getArtist();
                }

                currentlyPlaying.setStatus(QueueItem.QueueStatus.PLAYED);
                currentlyPlaying.setPlayedAt(playedAt);
                queueRepository.save(currentlyPlaying);

                if (currentlyPlaying.getSong() != null && currentlyPlaying.getSong().getYoutubeId() != null) {
                    Cooldown cooldown = new Cooldown();
                    cooldown.setRoom(currentlyPlaying.getRoom());
                    cooldown.setIdentifier(currentlyPlaying.getSong().getYoutubeId());
                    cooldown.setType(Cooldown.CooldownType.SONG);
                    cooldown.setExpiresAt(playedAt.plusMinutes(15));
                    cooldownRepository.save(cooldown);
                }
            }
        }

        List<QueueItem> pendingItems = queueRepository
                .findWithLockByRoomIdAndStatus(roomId, QueueItem.QueueStatus.PENDING);

        if (pendingItems.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "No hay canciones en la cola");
        }

        QueueItemDTO best = scorePendingItems(pendingItems, lastArtist).get(0);
        QueueItem bestItem = pendingItems.stream()
                .filter(item -> item.getId().equals(best.getId()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "No hay canciones en la cola"));

        bestItem.setStatus(QueueItem.QueueStatus.PLAYING);
        QueueItem savedItem = queueRepository.save(bestItem);
        return new QueueItemDTO(savedItem, best.getScore());
    }

    private List<QueueItemDTO> scorePendingItems(List<QueueItem> pendingItems, String artistToAvoid) {
        List<QueueItemDTO> pendingDTOs = new ArrayList<>();

        // La base no garantiza el orden de las filas: ordenamos primero por llegada (la más vieja primero)
        List<QueueItem> byArrival = new ArrayList<>(pendingItems);
        byArrival.sort(Comparator.comparing(QueueItem::getAddedAt).thenComparing(QueueItem::getId));

        for (QueueItem item : byArrival) {
            long minutosEspera = java.time.Duration.between(
                    item.getAddedAt(),
                    LocalDateTime.now()
            ).toMinutes();

            double score = (item.getVotesCount() * 10.0) + minutosEspera;

            if (artistToAvoid != null &&
                    item.getSong().getArtist() != null &&
                    artistToAvoid.equalsIgnoreCase(item.getSong().getArtist())) {
                score -= 1000;
            }

            pendingDTOs.add(new QueueItemDTO(item, score));
        }

        // sort es estable: si dos canciones empatan en score, queda primero la que llegó antes
        pendingDTOs.sort((a, b) -> Double.compare(b.getScore(), a.getScore()));
        return pendingDTOs;
    }

    private void addVoteOrReject(QueueItem item, AppUser user) {
        boolean yaVoto = voteRepository
                .findByQueueItemIdAndUserId(item.getId(), user.getId())
                .isPresent();

        if (yaVoto) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya votaste esta cancion");
        }

        Vote vote = new Vote();
        vote.setQueueItem(item);
        vote.setUser(user);
        voteRepository.save(vote);
    }

    private void ensureUserBelongsToRoom(AppUser user, Long roomId) {
        if (user.getRoom() == null || !roomId.equals(user.getRoom().getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "El usuario no pertenece a esta sala");
        }
    }

    public void validateOwner(Long roomId, AppUser user) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Sala no encontrada"));
        if (room.getOwner() == null || !room.getOwner().getId().equals(user.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Solo el owner de la sala puede realizar esta accion");
        }
    }
}
