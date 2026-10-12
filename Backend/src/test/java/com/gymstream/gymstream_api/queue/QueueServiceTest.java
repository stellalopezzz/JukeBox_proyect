package com.gymstream.gymstream_api.queue;

import com.gymstream.gymstream_api.cooldown.CooldownRepository;
import com.gymstream.gymstream_api.room.Room;
import com.gymstream.gymstream_api.room.RoomRepository;
import com.gymstream.gymstream_api.song.Song;
import com.gymstream.gymstream_api.song.SongRepository;
import com.gymstream.gymstream_api.user.AppUser;
import com.gymstream.gymstream_api.vote.Vote;
import com.gymstream.gymstream_api.vote.VoteRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class QueueServiceTest {

    private final QueueRepository queueRepository = mock(QueueRepository.class);
    private final VoteRepository voteRepository = mock(VoteRepository.class);
    private final SongRepository songRepository = mock(SongRepository.class);
    private final RoomRepository roomRepository = mock(RoomRepository.class);
    private final CooldownRepository cooldownRepository = mock(CooldownRepository.class);

    private final QueueService queueService = new QueueService(
            queueRepository,
            voteRepository,
            songRepository,
            roomRepository,
            cooldownRepository
    );

    @Test
    void voteRejectsUserFromAnotherRoom() {
        Room room = room(1L);
        QueueItem item = queueItem(10L, room, song("yt-1", "Song A", "Artist A"), 1);
        AppUser user = user(7L, room(2L));

        when(queueRepository.findWithLockById(10L)).thenReturn(Optional.of(item));

        assertThrows(ResponseStatusException.class, () -> queueService.vote(10L, user));
    }

    @Test
    void nextTrackPicksHighestScoreAndMarksItPlaying() {
        Room room = room(1L);
        QueueItem first = queueItem(11L, room, song("yt-1", "Song A", "Artist A"), 1);
        QueueItem second = queueItem(12L, room, song("yt-2", "Song B", "Artist B"), 5);

        when(queueRepository.findWithLockByRoomIdAndStatus(1L, QueueItem.QueueStatus.PLAYING))
                .thenReturn(List.of());
        when(queueRepository.findWithLockByRoomIdAndStatus(1L, QueueItem.QueueStatus.PENDING))
                .thenReturn(List.of(first, second));
        when(queueRepository.save(any(QueueItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

        QueueItemDTO next = queueService.nextTrack(1L);

        assertEquals(12L, next.getId());
        assertEquals(QueueItem.QueueStatus.PLAYING, second.getStatus());
    }

    @Test
    void tiedScoresPlayOldestSongFirst() {
        Room room = room(1L);
        QueueItem older = queueItem(21L, room, song("yt-1", "Song A", "Artist A"), 1);
        QueueItem newer = queueItem(22L, room, song("yt-2", "Song B", "Artist B"), 1);
        // Las dos se agregaron dentro del mismo minuto, así que empatan en score
        older.setAddedAt(LocalDateTime.now().minusSeconds(100));
        newer.setAddedAt(LocalDateTime.now().minusSeconds(70));

        // La base devuelve la más nueva primero, como puede pasar en PostgreSQL
        when(queueRepository.findByRoomIdAndStatus(1L, QueueItem.QueueStatus.PENDING))
                .thenReturn(List.of(newer, older));
        when(queueRepository.findByRoomIdAndStatus(1L, QueueItem.QueueStatus.PLAYING))
                .thenReturn(List.of());
        when(queueRepository.findWithLockByRoomIdAndStatus(1L, QueueItem.QueueStatus.PLAYING))
                .thenReturn(List.of());
        when(queueRepository.findWithLockByRoomIdAndStatus(1L, QueueItem.QueueStatus.PENDING))
                .thenReturn(List.of(newer, older));
        when(queueRepository.save(any(QueueItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

        List<QueueItemDTO> queue = queueService.getQueue(1L);
        assertEquals(queue.get(0).getScore(), queue.get(1).getScore());
        assertEquals(21L, queue.get(0).getId());
        assertEquals(22L, queue.get(1).getId());

        assertEquals(21L, queueService.nextTrack(1L).getId());
    }

    @Test
    void addToQueueCreatesSongQueueItemAndInitialVote() {
        Room room = room(1L);
        AppUser user = user(7L, room);

        when(roomRepository.findById(1L)).thenReturn(Optional.of(room));
        when(songRepository.findByYoutubeId("yt-1")).thenReturn(Optional.empty());
        when(songRepository.save(any(Song.class))).thenAnswer(invocation -> {
            Song song = invocation.getArgument(0);
            song.setId(99L);
            return song;
        });
        when(cooldownRepository.findByRoomIdAndIdentifierAndTypeAndExpiresAtAfter(any(), any(), any(), any()))
                .thenReturn(Optional.empty());
        when(queueRepository.findWithLockByRoomIdAndSongIdAndStatus(1L, 99L, QueueItem.QueueStatus.PENDING))
                .thenReturn(Optional.empty());
        when(queueRepository.save(any(QueueItem.class))).thenAnswer(invocation -> {
            QueueItem item = invocation.getArgument(0);
            if (item.getId() == null) {
                item.setId(15L);
            }
            return item;
        });
        when(voteRepository.findByQueueItemIdAndUserId(15L, 7L)).thenReturn(Optional.empty());
        when(voteRepository.save(any(Vote.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(voteRepository.countByQueueItemId(15L)).thenReturn(1);

        QueueItem item = queueService.addToQueue("yt-1", "Song A", "Artist A", "thumb", 1L, user);

        assertEquals(15L, item.getId());
        assertEquals(1, item.getVotesCount());
    }

    @Test
    void addToQueueRejectsFourthPendingSongFromSameUser() {
        Room room = room(1L);
        AppUser user = user(7L, room);
        Song song = song("yt-4", "Song D", "Artist D");

        when(roomRepository.findById(1L)).thenReturn(Optional.of(room));
        when(songRepository.findByYoutubeId("yt-4")).thenReturn(Optional.of(song));
        when(cooldownRepository.findByRoomIdAndIdentifierAndTypeAndExpiresAtAfter(any(), any(), any(), any()))
                .thenReturn(Optional.empty());
        when(queueRepository.findWithLockByRoomIdAndSongIdAndStatus(1L, song.getId(), QueueItem.QueueStatus.PENDING))
                .thenReturn(Optional.empty());
        // El usuario ya tiene 3 canciones esperando en la cola
        when(queueRepository.countByRoomIdAndAddedByIdAndStatus(1L, 7L, QueueItem.QueueStatus.PENDING))
                .thenReturn(3L);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> queueService.addToQueue("yt-4", "Song D", "Artist D", "thumb", 1L, user));

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, error.getStatusCode());
        verify(queueRepository, never()).save(any(QueueItem.class));
    }

    @Test
    void voteChecksRecentVotesFromTheLastSixtySeconds() {
        Room room = room(1L);
        QueueItem item = queueItem(10L, room, song("yt-1", "Song A", "Artist A"), 1);
        AppUser user = user(7L, room);

        when(queueRepository.findWithLockById(10L)).thenReturn(Optional.of(item));
        when(voteRepository.existsRecentVoteByUserInRoom(any(), any(), any())).thenReturn(true);

        assertThrows(ResponseStatusException.class, () -> queueService.vote(10L, user));

        // Revisamos desde qué momento se buscaron votos recientes: tiene que ser hace ~60 segundos
        ArgumentCaptor<LocalDateTime> since = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(voteRepository).existsRecentVoteByUserInRoom(eq(7L), eq(1L), since.capture());
        long segundos = Duration.between(since.getValue(), LocalDateTime.now()).getSeconds();
        assertTrue(segundos >= 59 && segundos <= 61);
    }

    private Room room(Long id) {
        Room room = new Room();
        room.setId(id);
        room.setCode("ABC123");
        return room;
    }

    private AppUser user(Long id, Room room) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setRoom(room);
        user.setUsername("user");
        return user;
    }

    private Song song(String ytId, String title, String artist) {
        Song song = new Song();
        song.setId((long) Math.abs(ytId.hashCode()));
        song.setYoutubeId(ytId);
        song.setTitle(title);
        song.setArtist(artist);
        return song;
    }

    private QueueItem queueItem(Long id, Room room, Song song, int votes) {
        QueueItem item = new QueueItem();
        item.setId(id);
        item.setRoom(room);
        item.setSong(song);
        item.setVotesCount(votes);
        item.setAddedAt(LocalDateTime.now().minusMinutes(1));
        item.setStatus(QueueItem.QueueStatus.PENDING);
        return item;
    }
}
