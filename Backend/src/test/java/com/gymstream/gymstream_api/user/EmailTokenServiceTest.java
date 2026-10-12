package com.gymstream.gymstream_api.user;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EmailTokenServiceTest {

    // Reloj fijo: así "ahora" es siempre el mismo instante y se puede probar el vencimiento
    private static final Instant NOW = Instant.parse("2026-10-12T12:00:00Z");

    private final EmailTokenRepository tokenRepository = mock(EmailTokenRepository.class);
    private final EmailTokenService service = new EmailTokenService(tokenRepository, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void createStoresOnlyTheHash() {
        String rawToken = service.create(new AppUser(), EmailTokenType.RESET_PASSWORD, Duration.ofHours(1));

        ArgumentCaptor<EmailToken> saved = ArgumentCaptor.forClass(EmailToken.class);
        verify(tokenRepository).save(saved.capture());
        assertNotEquals(rawToken, saved.getValue().getTokenHash());
        assertEquals(EmailTokenService.hash(rawToken), saved.getValue().getTokenHash());
        assertEquals(EmailTokenType.RESET_PASSWORD, saved.getValue().getType());
        assertEquals(NOW.plus(Duration.ofHours(1)), saved.getValue().getExpiresAt());
    }

    @Test
    void consumeReturnsTheOwner() {
        EmailToken token = token(NOW.plusSeconds(60), null);
        when(tokenRepository.findByTokenHashAndType(EmailTokenService.hash("abc"), EmailTokenType.VERIFY_EMAIL))
                .thenReturn(Optional.of(token));
        when(tokenRepository.markUsed(any(), eq(NOW))).thenReturn(1);

        assertSame(token.getUser(), service.consume("abc", EmailTokenType.VERIFY_EMAIL));
    }

    @Test
    void consumeRejectsTokenUsedByAConcurrentRequest() {
        EmailToken token = token(NOW.plusSeconds(60), null);
        when(tokenRepository.findByTokenHashAndType(any(), any())).thenReturn(Optional.of(token));
        // Al leerlo parecia sin usar, pero el UPDATE no cambio ninguna fila: otro pedido gano
        when(tokenRepository.markUsed(any(), any())).thenReturn(0);

        assertInvalid("abc");
    }

    @Test
    void consumeRejectsExpiredToken() {
        when(tokenRepository.findByTokenHashAndType(any(), any())).thenReturn(Optional.of(token(NOW.minusSeconds(1), null)));

        assertInvalid("abc");
    }

    @Test
    void consumeRejectsUsedToken() {
        when(tokenRepository.findByTokenHashAndType(any(), any()))
                .thenReturn(Optional.of(token(NOW.plusSeconds(60), NOW.minusSeconds(60))));

        assertInvalid("abc");
    }

    @Test
    void consumeRejectsUnknownToken() {
        when(tokenRepository.findByTokenHashAndType(any(), any())).thenReturn(Optional.empty());

        assertInvalid("inventado");
    }

    private void assertInvalid(String rawToken) {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.consume(rawToken, EmailTokenType.VERIFY_EMAIL));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    private EmailToken token(Instant expiresAt, Instant usedAt) {
        EmailToken token = new EmailToken();
        token.setUser(new AppUser());
        token.setType(EmailTokenType.VERIFY_EMAIL);
        token.setExpiresAt(expiresAt);
        token.setUsedAt(usedAt);
        return token;
    }
}
