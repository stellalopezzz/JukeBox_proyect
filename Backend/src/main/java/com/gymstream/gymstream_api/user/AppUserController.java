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
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest request) {
        AppUser user = userService.login(request.username(), request.password());

        return ResponseEntity.ok(Map.of(
                "token", user.getSessionToken(),
                "userId", user.getId(),
                "username", user.getUsername()
        ));
    }

    @PostMapping("/rooms/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest request) {
        AppUser user = userService.register(request.username(), request.password());

        return ResponseEntity.ok(Map.of(
                "token", user.getSessionToken(),
                "userId", user.getId(),
                "username", user.getUsername()
        ));
    }

    // Unirse a una sala. Solo puede hacerlo alguien que ya inicio sesion.
    @PostMapping("/rooms/join")
    public ResponseEntity<Map<String, Object>> joinRoom(
            // @RequestHeader le pide a Spring que lea el header "X-Session-Token" del request
            // y lo pase como parametro. Es el token que el usuario recibio al hacer login.
            // Si el header no viene, Spring lanza MissingRequestHeaderException antes de
            // entrar aca, y GlobalExceptionHandler la convierte en un 401 (no autorizado).
            @RequestHeader("X-Session-Token") String sessionToken,
            // @RequestBody convierte el JSON del body en un JoinRoomRequest;
            // @Valid hace que se apliquen las validaciones del record (@NotBlank).
            @Valid @RequestBody JoinRoomRequest request) {
        // El controller no decide nada de seguridad: le pasa el token al service,
        // que es quien comprueba de quien es (asi la regla vive en un solo lugar).
        AppUser user = userService.joinRoom(request.code(), sessionToken);

        // Devolvemos el mismo token que ya tenia (no uno nuevo), para que el
        // frontend pueda seguir guardandolo igual que antes.
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
