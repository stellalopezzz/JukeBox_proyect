package com.gymstream.gymstream_api.queue;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

public interface QueueRepository extends JpaRepository<QueueItem, Long> {

    // Busca todos los items de una sala con un status específico
    // Spring genera el SQL automáticamente leyendo el nombre del método:
    // SELECT * FROM queue WHERE room_id = ? AND status = ?
    List<QueueItem> findByRoomIdAndStatus(Long roomId, QueueItem.QueueStatus status);

    // Busca un item específico por sala, canción y status
    // Esto nos permite saber si una canción ya está en la cola
    // SELECT * FROM queue WHERE room_id = ? AND song_id = ? AND status = ?
    Optional<QueueItem> findByRoomIdAndSongIdAndStatus(
        Long roomId, Long songId, QueueItem.QueueStatus status
    );

    // Cuenta cuántas canciones agregó un usuario en una sala con cierto status
    // SELECT COUNT(*) FROM queue WHERE room_id = ? AND added_by_user_id = ? AND status = ?
    long countByRoomIdAndAddedByIdAndStatus(Long roomId, Long userId, QueueItem.QueueStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<QueueItem> findWithLockById(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<QueueItem> findWithLockByRoomIdAndStatus(Long roomId, QueueItem.QueueStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<QueueItem> findWithLockByRoomIdAndSongIdAndStatus(
        Long roomId, Long songId, QueueItem.QueueStatus status
    );
}
