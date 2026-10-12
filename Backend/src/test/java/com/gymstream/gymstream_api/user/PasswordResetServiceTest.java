package com.gymstream.gymstream_api.user;

import com.gymstream.gymstream_api.mail.MailService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class PasswordResetServiceTest {

    private final EmailTokenService tokenService = mock(EmailTokenService.class);
    private final AppUserRepository userRepository = mock(AppUserRepository.class);
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final MailService mailService = mock(MailService.class);
    private final PasswordResetService service = new PasswordResetService(
            tokenService, userRepository, passwordEncoder, mailService, "http://localhost:5173");

    @Test
    void requestMailsTheLinkForAKnownEmail() {
        AppUser user = user();
        when(userRepository.findByEmail("stella@gmail.com")).thenReturn(Optional.of(user));
        when(tokenService.create(user, EmailTokenType.RESET_PASSWORD, PasswordResetService.TOKEN_LIFETIME)).thenReturn("abc");

        // Con mayúsculas y espacios: se normaliza igual que en el login
        service.requestReset(" Stella@Gmail.com ");

        verify(mailService).send(eq("stella@gmail.com"), anyString(), contains("http://localhost:5173/restablecer?token=abc"));
    }

    @Test
    void requestDoesNothingForAnUnknownEmail() {
        when(userRepository.findByEmail(any())).thenReturn(Optional.empty());

        service.requestReset("nadie@gmail.com");

        verifyNoInteractions(tokenService, mailService);
    }

    @Test
    void resetChangesThePasswordAndClosesTheSession() {
        AppUser user = user();
        when(tokenService.consume("abc", EmailTokenType.RESET_PASSWORD)).thenReturn(user);

        service.resetPassword("abc", "nueva-clave-123");

        assertTrue(passwordEncoder.matches("nueva-clave-123", user.getPassword()));
        assertNull(user.getSessionToken());
        assertTrue(user.getEmailVerified());
        verify(tokenService).invalidateAll(user, EmailTokenType.RESET_PASSWORD);
        verify(userRepository).save(user);
    }

    @Test
    void resetRejectsAShortPasswordWithoutSpendingTheLink() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.resetPassword("abc", "corta"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verify(tokenService, never()).consume(any(), any());
    }

    private AppUser user() {
        AppUser user = new AppUser();
        user.setUsername("stella");
        user.setEmail("stella@gmail.com");
        user.setPassword(passwordEncoder.encode("vieja-clave-123"));
        user.setSessionToken("sesion-vieja");
        user.setEmailVerified(false);
        return user;
    }
}
