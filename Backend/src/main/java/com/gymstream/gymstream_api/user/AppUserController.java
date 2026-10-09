package com.gymstream.gymstream_api.user;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class AppUserController {

    private final AppUserService userService;

    public AppUserController(AppUserService userService) {
        this.userService = userService;
    }

    @PostMapping("/rooms/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest request) {
        AppUser user = userService.login(request.email(), request.password());

        return ResponseEntity.ok(Map.of(
                "token", user.getSessionToken(),
                "userId", user.getId(),
                "username", user.getUsername()
        ));
    }

    @PostMapping("/rooms/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest request) {
        AppUser user = userService.register(request.email(), request.username(), request.password());

        return ResponseEntity.ok(Map.of(
                "token", user.getSessionToken(),
                "userId", user.getId(),
                "username", user.getUsername()
        ));
    }

    // Unirse a una sala. Solo puede hacerlo alguien que ya inicio sesion.
    @PostMapping("/rooms/join")
    public ResponseEntity<Map<String, Object>> joinRoom(
            @RequestHeader("X-Session-Token") String sessionToken,
            @Valid @RequestBody JoinRoomRequest request) {
        AppUser user = userService.joinRoom(request.code(), sessionToken);

        return ResponseEntity.ok(Map.of(
                "token", user.getSessionToken(),
                "userId", user.getId(),
                "roomId", user.getRoom().getId(),
                "roomCode", user.getRoom().getCode()
        ));
    }

    @GetMapping("/users/me")
    public ResponseEntity<Map<String, Object>> me(@RequestHeader("X-Session-Token") String sessionToken) {
        Map<String, Object> result = userService.getMe(sessionToken);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/users/logout")
    public ResponseEntity<Map<String, Object>> logout(@RequestHeader("X-Session-Token") String sessionToken) {
        userService.logout(sessionToken);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
