package com.gymstream.gymstream_api.user;

import com.gymstream.gymstream_api.mail.MailService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EmailVerificationServiceTest {

    // Reloj fijo: así "ahora" es siempre el mismo instante y se puede probar el vencimiento
    private static final Instant NOW = Instant.parse("2026-10-09T12:00:00Z");

    private final EmailTokenRepository tokenRepository = mock(EmailTokenRepository.class);
    private final AppUserRepository userRepository = mock(AppUserRepository.class);
    private final MailService mailService = mock(MailService.class);
    private final EmailVerificationService service = new EmailVerificationService(
            tokenRepository, userRepository, mailService, "http://localhost:5173", Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void sendStoresHashAndMailsTheRawToken() {
        AppUser user = user();

        service.sendVerificationEmail(user);

        ArgumentCaptor<EmailToken> saved = ArgumentCaptor.forClass(EmailToken.class);
        verify(tokenRepository).save(saved.capture());
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(mailService).send(eq("stella@gmail.com"), anyString(), body.capture());

        String rawToken = body.getValue().split("token=")[1].split("\\s")[0];
        // En la base queda el hash, y el hash corresponde al token del enlace
        assertNotEquals(rawToken, saved.getValue().getTokenHash());
        assertEquals(EmailVerificationService.hash(rawToken), saved.getValue().getTokenHash());
        assertEquals(NOW.plus(EmailVerificationService.TOKEN_LIFETIME), saved.getValue().getExpiresAt());
    }

    @Test
    void verifyMarksUserAndToken() {
        EmailToken token = token(NOW.plusSeconds(60), null);
        when(tokenRepository.findByTokenHashAndType(EmailVerificationService.hash("abc"), EmailTokenType.VERIFY_EMAIL))
                .thenReturn(Optional.of(token));
        when(tokenRepository.markUsed(any(), eq(NOW))).thenReturn(1);

        service.verify("abc");

        assertTrue(token.getUser().getEmailVerified());
    }

    @Test
    void verifyRejectsTokenUsedByAConcurrentRequest() {
        EmailToken token = token(NOW.plusSeconds(60), null);
        when(tokenRepository.findByTokenHashAndType(any(), eq(EmailTokenType.VERIFY_EMAIL))).thenReturn(Optional.of(token));
        // Al leerlo parecia sin usar, pero el UPDATE no cambio ninguna fila: otro pedido gano
        when(tokenRepository.markUsed(any(), any())).thenReturn(0);

        assertInvalid("abc");
    }

    @Test
    void verifyRejectsExpiredToken() {
        EmailToken token = token(NOW.minusSeconds(1), null);
        when(tokenRepository.findByTokenHashAndType(any(), eq(EmailTokenType.VERIFY_EMAIL))).thenReturn(Optional.of(token));

        assertInvalid("abc");
    }

    @Test
    void verifyRejectsUsedToken() {
        EmailToken token = token(NOW.plusSeconds(60), NOW.minusSeconds(60));
        when(tokenRepository.findByTokenHashAndType(any(), eq(EmailTokenType.VERIFY_EMAIL))).thenReturn(Optional.of(token));

        assertInvalid("abc");
    }

    @Test
    void verifyRejectsUnknownToken() {
        when(tokenRepository.findByTokenHashAndType(any(), any())).thenReturn(Optional.empty());

        assertInvalid("inventado");
    }

    @Test
    void resendRejectsAlreadyVerifiedUser() {
        AppUser user = user();
        user.setEmailVerified(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.resend(user));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verify(mailService, never()).send(any(), any(), any());
    }

    private void assertInvalid(String rawToken) {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.verify(rawToken));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verify(userRepository, never()).save(any());
    }

    private AppUser user() {
        AppUser user = new AppUser();
        user.setUsername("stella");
        user.setEmail("stella@gmail.com");
        user.setEmailVerified(false);
        return user;
    }

    private EmailToken token(Instant expiresAt, Instant usedAt) {
        EmailToken token = new EmailToken();
        token.setUser(user());
        token.setType(EmailTokenType.VERIFY_EMAIL);
        token.setExpiresAt(expiresAt);
        token.setUsedAt(usedAt);
        return token;
    }
}
