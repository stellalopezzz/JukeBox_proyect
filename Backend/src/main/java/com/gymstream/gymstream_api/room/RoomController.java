package com.gymstream.gymstream_api.room;

import com.gymstream.gymstream_api.user.AppUser;
import com.gymstream.gymstream_api.user.AppUserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService roomService;
    private final AppUserService userService;

    public RoomController(RoomService roomService, AppUserService userService) {
        this.roomService = roomService;
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createRoom(
            @Valid @RequestBody CreateRoomRequest request,
            @RequestHeader(value = "X-Session-Token", required = false) String sessionToken) {

        Long ownerId = null;
        if (sessionToken != null && !sessionToken.trim().isEmpty()) {
            try {
                AppUser owner = userService.getUserBySessionToken(sessionToken);
                ownerId = owner.getId();
            } catch (Exception e) {
                // Token invalido o no autenticado: se crea sala sin owner
            }
        }

        Room room = roomService.createRoom(request.name(), ownerId);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(Map.of(
                        "id", room.getId(),
                        "code", room.getCode()
                ));
    }

    // Devolvemos solo los datos publicos de la sala. Si devolvieramos la entidad Room,
    // Jackson serializaria tambien el owner (con su password hasheada y su token de sesion),
    // y si el owner esta unido a su propia sala entraria en un ciclo infinito Room -> owner -> room.
    @GetMapping("/{code}")
    public ResponseEntity<Map<String, Object>> getRoomByCode(@PathVariable String code) {
        Room room = roomService.getRoomByCode(code);
        return ResponseEntity.ok(Map.of(
                "id", room.getId(),
                "code", room.getCode(),
                "name", room.getName() != null ? room.getName() : "",
                "isActive", Boolean.TRUE.equals(room.getIsActive())
        ));
    }
}
