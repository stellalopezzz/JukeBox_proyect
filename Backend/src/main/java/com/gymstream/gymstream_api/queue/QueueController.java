package com.gymstream.gymstream_api.queue;

import com.gymstream.gymstream_api.realtime.RealtimeNotifier;
import com.gymstream.gymstream_api.user.AppUser;
import com.gymstream.gymstream_api.user.AppUserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/queue")
public class QueueController {

    private final QueueService queueService;
    private final AppUserService userService;
    private final RealtimeNotifier realtimeNotifier;

    public QueueController(
            QueueService queueService,
            AppUserService userService,
            RealtimeNotifier realtimeNotifier) {
        this.queueService = queueService;
        this.userService = userService;
        this.realtimeNotifier = realtimeNotifier;
    }

    @PostMapping("/add")
    public ResponseEntity<QueueItemDTO> addToQueue(
            @RequestHeader("X-Session-Token") String sessionToken,
            @Valid @RequestBody AddQueueItemRequest request) {

        AppUser user = userService.getUserBySessionToken(sessionToken);
        QueueItem item = queueService.addToQueue(
                request.ytId(),
                request.title(),
                request.artist(),
                request.thumb(),
                request.roomId(),
                user
        );
        notifyQueue(request.roomId());

        return ResponseEntity.status(HttpStatus.CREATED).body(new QueueItemDTO(item, item.getVotesCount()));
    }

    @GetMapping("/{roomId}")
    public ResponseEntity<List<QueueItemDTO>> getQueue(@PathVariable Long roomId) {
        List<QueueItemDTO> queue = queueService.getQueue(roomId);
        return ResponseEntity.ok(queue);
    }

    @PatchMapping("/next-track/{roomId}")
    public ResponseEntity<QueueItemDTO> nextTrack(
            @PathVariable Long roomId,
            @RequestHeader("X-Session-Token") String sessionToken) {
        AppUser user = userService.getUserBySessionToken(sessionToken);
        queueService.validateOwner(roomId, user);
        QueueItemDTO next = queueService.nextTrack(roomId);
        notifyQueue(roomId);
        return ResponseEntity.ok(next);
    }

    @DeleteMapping("/{queueItemId}")
    public ResponseEntity<Void> deleteQueueItem(
            @PathVariable Long queueItemId,
            @RequestHeader("X-Session-Token") String sessionToken) {
        AppUser user = userService.getUserBySessionToken(sessionToken);
        Long roomId = queueService.deleteQueueItem(queueItemId);
        queueService.validateOwner(roomId, user);
        notifyQueue(roomId);
        return ResponseEntity.noContent().build();
    }

    private void notifyQueue(Long roomId) {
        realtimeNotifier.notifyQueueRefreshed(roomId, queueService.getQueue(roomId));
    }
}
