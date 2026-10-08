package com.gymstream.gymstream_api.user;

import com.gymstream.gymstream_api.room.Room;
import com.gymstream.gymstream_api.room.RoomRepository;
import com.gymstream.gymstream_api.room.RoomService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.HashMap;
import java.util.UUID;
import java.util.Optional;
import java.util.List;
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

   
    public AppUser login(String username, String password) {
        if (username == null || username.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username requerido");
        }
        if (password == null || password.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password requerido");
        }

    Optional<AppUser> userOpt = userRepository.findByUsername(username.trim());

        AppUser user = userOpt.orElseThrow(() ->
                new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas"));

        // matches() lee el salt guardado dentro del hash y repite el cálculo con él
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }

        user.setSessionToken(UUID.randomUUID().toString());
        return userRepository.save(user);
    }

    public AppUser register(String username, String password) {
        if (username == null || username.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username requerido");
        }
        if (password == null || password.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password requerido");
        }

        String trimmedUsername = username.trim();
        if (trimmedUsername.length() < 3 || trimmedUsername.length() > 50) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El username debe tener entre 3 y 50 caracteres");
        }
        if (password.length() < 4 || password.length() > 15) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El password debe tener entre 4 y 15 caracteres");
        }

        if (userRepository.existsByUsername(trimmedUsername)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El username ya esta en uso");
        }

        AppUser user = new AppUser();
        user.setUsername(trimmedUsername);
        user.setPassword(passwordEncoder.encode(password));
        user.setSessionToken(UUID.randomUUID().toString());
        return userRepository.save(user);
    }

    public AppUser joinRoom(String roomCode, String username) {
        // Validar que el código de sala no sea nulo o vacío
        if (roomCode == null || roomCode.trim().isEmpty()) {
            throw new IllegalArgumentException("El código de la sala no puede estar vacío");
        }
        
        // Validar que el nombre de usuario no sea nulo o vacío
        if (username == null || username.trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre de usuario no puede estar vacío");
        }
        
        // Validar longitud del nombre de usuario
        if (username.length() > 50) {
            throw new IllegalArgumentException("El nombre de usuario no puede exceder 50 caracteres");
        }
        
        // Obtener la sala validada (lanza excepción si no existe)
        Room room = roomService.getRoomByCode(roomCode.trim());
        
        // Validar que la sala esté activa
        if (!Boolean.TRUE.equals(room.getIsActive())) {
            throw new RuntimeException("La sala no está activa");
        }

        String trimmedUsername = username.trim();
        Optional<AppUser> existingUserOpt = userRepository.findByUsername(trimmedUsername);

        if (existingUserOpt.isPresent()) {
            AppUser user = existingUserOpt.get();
            user.setRoom(room);
            user.setSessionToken(UUID.randomUUID().toString());
            return userRepository.save(user);
        }

        // Crear nuevo usuario con token único de sesión
        AppUser user = new AppUser();
        user.setUsername(trimmedUsername);
        user.setRoom(room);
        user.setSessionToken(UUID.randomUUID().toString());
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
