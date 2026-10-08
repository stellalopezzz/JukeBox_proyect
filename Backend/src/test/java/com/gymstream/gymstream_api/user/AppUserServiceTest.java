package com.gymstream.gymstream_api.user;

import com.gymstream.gymstream_api.room.RoomRepository;
import com.gymstream.gymstream_api.room.RoomService;
import org.junit.jupiter.api.Test;
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
        when(userRepository.existsByUsername("stella")).thenReturn(false);
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppUser user = userService.register("stella", "gym1234");

        assertNotEquals("gym1234", user.getPassword());
        assertTrue(user.getPassword().startsWith("$2"));
        assertTrue(passwordEncoder.matches("gym1234", user.getPassword()));
    }

    @Test
    void loginSucceedsWithCorrectPassword() {
        AppUser stored = userWithPassword(passwordEncoder.encode("gym1234"));
        when(userRepository.findByUsername("stella")).thenReturn(Optional.of(stored));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppUser user = userService.login("stella", "gym1234");

        assertNotNull(user.getSessionToken());
    }

    @Test
    void loginRejectsWrongPassword() {
        AppUser stored = userWithPassword(passwordEncoder.encode("gym1234"));
        when(userRepository.findByUsername("stella")).thenReturn(Optional.of(stored));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userService.login("stella", "otraClave"));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
    }

    @Test
    void loginRejectsLegacyPlainTextPassword() {
        // Sin migración: un usuario viejo con la contraseña guardada en texto plano ya no puede entrar
        AppUser stored = userWithPassword("gym1234");
        when(userRepository.findByUsername("stella")).thenReturn(Optional.of(stored));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userService.login("stella", "gym1234"));

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

    private AppUser userWithPassword(String password) {
        AppUser user = new AppUser();
        user.setUsername("stella");
        user.setPassword(password);
        return user;
    }
}
