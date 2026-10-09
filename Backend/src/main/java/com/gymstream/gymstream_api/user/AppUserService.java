package com.gymstream.gymstream_api.user;

import com.gymstream.gymstream_api.room.Room;
import com.gymstream.gymstream_api.room.RoomRepository;
import com.gymstream.gymstream_api.room.RoomService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.HashMap;
import java.util.UUID;
import java.util.Optional;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AppUserService {

    private final AppUserRepository userRepository;
    private final RoomService roomService;
    private final RoomRepository roomRepository;
    private final PasswordEncoder passwordEncoder;

    public AppUserService(AppUserRepository appUserRepository, RoomService roomService,
                          RoomRepository roomRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = appUserRepository;
        this.roomService = roomService;
        this.roomRepository = roomRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // PostgreSQL distingue mayúsculas: sin esto "Ana@x.com" y "ana@x.com" serían dos cuentas.
    // Locale.ROOT da el mismo resultado sin importar el idioma del servidor.
    static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public AppUser login(String email, String password) {
        if (email == null || email.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Correo requerido");
        }
        if (password == null || password.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password requerido");
        }

        Optional<AppUser> userOpt = userRepository.findByEmail(normalizeEmail(email));

        // Mismo mensaje si el correo no existe o si la contraseña está mal,
        // para no revelar qué correos tienen cuenta
        AppUser user = userOpt.orElseThrow(() ->
                new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas"));

        // matches() lee el salt guardado dentro del hash y repite el cálculo con él
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }

        user.setSessionToken(UUID.randomUUID().toString());
        return userRepository.save(user);
    }

    public AppUser register(String email, String username, String password) {
        if (email == null || email.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Correo requerido");
        }
        if (username == null || username.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username requerido");
        }
        if (password == null || password.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password requerido");
        }

        String normalizedEmail = normalizeEmail(email);
        String trimmedUsername = username.trim();
        if (trimmedUsername.length() < 3 || trimmedUsername.length() > 50) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El username debe tener entre 3 y 50 caracteres");
        }
        if (password.length() < 8 || password.length() > 64) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El password debe tener entre 8 y 64 caracteres");
        }
        // BCrypt acepta hasta 72 bytes, y un emoji ocupa 4: 64 caracteres pueden pasarse
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El password es demasiado largo");
        }

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ese correo ya esta registrado");
        }
        if (userRepository.existsByUsername(trimmedUsername)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El username ya esta en uso");
        }

        AppUser user = new AppUser();
        user.setEmail(normalizedEmail);
        user.setUsername(trimmedUsername);
        user.setPassword(passwordEncoder.encode(password));
        user.setSessionToken(UUID.randomUUID().toString());
        try {
            return userRepository.save(user);
        } catch (DataIntegrityViolationException e) {
            // Dos registros al mismo tiempo pueden pasar los chequeos de arriba;
            // la restricción UNIQUE de la base frena al segundo
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ese correo o username ya esta en uso");
        }
    }

    // Une a la sala al usuario que hizo login (el dueño del token).
    public AppUser joinRoom(String roomCode, String sessionToken) {
        // Validar que el código de sala no sea nulo o vacío
        if (roomCode == null || roomCode.trim().isEmpty()) {
            throw new IllegalArgumentException("El código de la sala no puede estar vacío");
        }

        // Lanza 401 si el token falta o no existe
        AppUser user = getUserBySessionToken(sessionToken);

        // Obtener la sala validada (lanza excepción si no existe)
        Room room = roomService.getRoomByCode(roomCode.trim());

        // Validar que la sala esté activa
        if (!Boolean.TRUE.equals(room.getIsActive())) {
            throw new RuntimeException("La sala no está activa");
        }

        // No se genera un token nuevo: sigue valiendo el del login
        user.setRoom(room);
        return userRepository.save(user);
    }

    public AppUser getUserBySessionToken(String sessionToken) {
        if (sessionToken == null || sessionToken.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token de sesion requerido");
        }

        return userRepository.findBySessionToken(sessionToken.trim())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Token de sesion invalido"));
    }

    public Map<String, Object> getMe(String sessionToken) {
        AppUser user = getUserBySessionToken(sessionToken);

        Map<String, Object> joinedRoom = null;
        if (user.getRoom() != null) {
            joinedRoom = Map.of(
                    "id", user.getRoom().getId(),
                    "code", user.getRoom().getCode()
            );
        }

        List<Map<String, Object>> ownedRooms = roomRepository.findByOwnerId(user.getId())
                .stream()
                .map(room -> Map.<String, Object>of(
                        "id", room.getId(),
                        "code", room.getCode(),
                        "name", room.getName() != null ? room.getName() : ""
                ))
                .collect(Collectors.toList());

        // Map.of no acepta valores null, y joinedRoom es null si el usuario no se unio a ninguna sala.
        Map<String, Object> result = new HashMap<>();
        result.put("userId", user.getId());
        result.put("username", user.getUsername());
        result.put("joinedRoom", joinedRoom);
        result.put("ownedRooms", ownedRooms);
        return result;
    }

    public void logout(String sessionToken) {
        AppUser user = getUserBySessionToken(sessionToken);
        user.setSessionToken(null);
        userRepository.save(user);
    }
}
