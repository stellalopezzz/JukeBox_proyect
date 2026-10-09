package com.gymstream.gymstream_api.user;

import com.gymstream.gymstream_api.room.Room;
import com.gymstream.gymstream_api.room.RoomRepository;
import com.gymstream.gymstream_api.room.RoomService;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AppUserServiceTest {

    private final AppUserRepository userRepository = mock(AppUserRepository.class);
    private final RoomService roomService = mock(RoomService.class);
    private final RoomRepository roomRepository = mock(RoomRepository.class);
    // Encoder real: queremos comprobar que el hash funciona de verdad, no simularlo
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final AppUserService userService =
            new AppUserService(userRepository, roomService, roomRepository, passwordEncoder);

    @Test
    void registerStoresHashedPasswordInsteadOfPlainText() {
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppUser user = userService.register("stella@gmail.com", "stella", "gym12345");

        assertNotEquals("gym12345", user.getPassword());
        assertTrue(user.getPassword().startsWith("$2"));
        assertTrue(passwordEncoder.matches("gym12345", user.getPassword()));
    }

    @Test
    void registerNormalizesEmail() {
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppUser user = userService.register("  Stella@Gmail.COM ", "stella", "gym12345");

        assertEquals("stella@gmail.com", user.getEmail());
    }

    @Test
    void registerRejectsDuplicateEmailIgnoringCase() {
        when(userRepository.existsByEmail("stella@gmail.com")).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userService.register("STELLA@gmail.com", "otra", "gym12345"));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(userRepository, never()).save(any(AppUser.class));
    }

    @Test
    void registerTranslatesUniqueViolationToConflict() {
        // Simula dos registros simultáneos: el chequeo pasa pero la base rechaza el duplicado
        when(userRepository.save(any(AppUser.class))).thenThrow(new DataIntegrityViolationException("duplicado"));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userService.register("stella@gmail.com", "stella", "gym12345"));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void loginSucceedsWithCorrectPassword() {
        AppUser stored = userWithPassword(passwordEncoder.encode("gym1234"));
        when(userRepository.findByEmail("stella@gmail.com")).thenReturn(Optional.of(stored));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppUser user = userService.login("stella@gmail.com", "gym1234");

        assertNotNull(user.getSessionToken());
    }

    @Test
    void loginWorksWithDifferentCase() {
        AppUser stored = userWithPassword(passwordEncoder.encode("gym1234"));
        when(userRepository.findByEmail("stella@gmail.com")).thenReturn(Optional.of(stored));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppUser user = userService.login(" Stella@GMAIL.com ", "gym1234");

        assertNotNull(user.getSessionToken());
    }

    @Test
    void loginGivesSameErrorForUnknownEmailAndWrongPassword() {
        AppUser stored = userWithPassword(passwordEncoder.encode("gym1234"));
        when(userRepository.findByEmail("stella@gmail.com")).thenReturn(Optional.of(stored));
        when(userRepository.findByEmail("nadie@gmail.com")).thenReturn(Optional.empty());

        ResponseStatusException wrongPassword = assertThrows(ResponseStatusException.class,
                () -> userService.login("stella@gmail.com", "otraClave"));
        ResponseStatusException unknownEmail = assertThrows(ResponseStatusException.class,
                () -> userService.login("nadie@gmail.com", "gym1234"));

        assertEquals(HttpStatus.UNAUTHORIZED, unknownEmail.getStatusCode());
        assertEquals(wrongPassword.getReason(), unknownEmail.getReason());
    }

    @Test
    void loginRejectsWrongPassword() {
        AppUser stored = userWithPassword(passwordEncoder.encode("gym1234"));
        when(userRepository.findByEmail("stella@gmail.com")).thenReturn(Optional.of(stored));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userService.login("stella@gmail.com", "otraClave"));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
    }

    @Test
    void loginRejectsLegacyPlainTextPassword() {
        // Sin migración: un usuario viejo con la contraseña guardada en texto plano ya no puede entrar
        AppUser stored = userWithPassword("gym1234");
        when(userRepository.findByEmail("stella@gmail.com")).thenReturn(Optional.of(stored));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userService.login("stella@gmail.com", "gym1234"));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
    }

    @Test
    void getMeWorksForUserWithoutJoinedRoom() {
        // Recien registrado: todavia no se unio a ninguna sala, asi que joinedRoom es null
        AppUser stored = userWithPassword(passwordEncoder.encode("gym1234"));
        stored.setId(7L);
        stored.setSessionToken("token-123");
        when(userRepository.findBySessionToken("token-123")).thenReturn(Optional.of(stored));
        when(roomRepository.findByOwnerId(7L)).thenReturn(List.of());

        Map<String, Object> me = userService.getMe("token-123");

        assertEquals("stella", me.get("username"));
        assertNull(me.get("joinedRoom"));
        assertEquals(List.of(), me.get("ownedRooms"));
    }

    @Test
    void joinRoomUsesTheTokenOwnerAndKeepsTheirToken() {
        AppUser stored = userWithPassword(passwordEncoder.encode("gym1234"));
        stored.setSessionToken("token-123");
        Room room = new Room();
        room.setId(1L);
        room.setCode("ABC123");
        when(userRepository.findBySessionToken("token-123")).thenReturn(Optional.of(stored));
        when(roomService.getRoomByCode("ABC123")).thenReturn(room);
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppUser user = userService.joinRoom("ABC123", "token-123");

        assertEquals("stella", user.getUsername());
        assertEquals(room, user.getRoom());
        // No se emite un token nuevo: sigue valiendo el que dio el login
        assertEquals("token-123", user.getSessionToken());
    }

    @Test
    void joinRoomRejectsMissingToken() {
        // Antes bastaba con mandar un username para quedarse con un token de esa cuenta
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userService.joinRoom("ABC123", null));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
        // Comprueba que no se guardó nada en la base
        verify(userRepository, never()).save(any(AppUser.class));
    }

    @Test
    void joinRoomRejectsUnknownToken() {
        when(userRepository.findBySessionToken("token-falso")).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userService.joinRoom("ABC123", "token-falso"));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
        verify(userRepository, never()).save(any(AppUser.class));
    }

    private AppUser userWithPassword(String password) {
        AppUser user = new AppUser();
        user.setUsername("stella");
        user.setPassword(password);
        return user;
    }
}
