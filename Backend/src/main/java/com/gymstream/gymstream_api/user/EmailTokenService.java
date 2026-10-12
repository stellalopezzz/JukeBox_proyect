package com.gymstream.gymstream_api.user;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

// Crea y valida los tokens de un solo uso que viajan en los enlaces de los correos.
// Lo usan la verificación del correo y la recuperación de contraseña.
@Service
public class EmailTokenService {

    private final EmailTokenRepository tokenRepository;
    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();

    public EmailTokenService(EmailTokenRepository tokenRepository, Clock clock) {
        this.tokenRepository = tokenRepository;
        this.clock = clock;
    }

    // Devuelve el token para armar el enlace; en la base solo queda su hash
    public String create(AppUser user, EmailTokenType type, Duration lifetime) {
        // SecureRandom, no Random: el token tiene que ser imposible de adivinar
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        EmailToken token = new EmailToken();
        token.setTokenHash(hash(rawToken));
        token.setUser(user);
        token.setType(type);
        token.setExpiresAt(Instant.now(clock).plus(lifetime));
        tokenRepository.save(token);
        return rawToken;
    }

    // Comprueba el token y devuelve a su dueño, sin marcarlo como usado
    public AppUser findOwner(String rawToken, EmailTokenType type) {
        return findValid(rawToken, type).getUser();
    }

    // Comprueba el token, lo marca como usado y devuelve a su dueño
    @Transactional
    public AppUser consume(String rawToken, EmailTokenType type) {
        EmailToken token = findValid(rawToken, type);
        // Si dos pedidos llegan a la vez con el mismo enlace, solo uno logra marcarlo
        if (tokenRepository.markUsed(token.getId(), Instant.now(clock)) == 0) {
            throw invalidLink();
        }
        return token.getUser();
    }

    // true si se creó un token de ese tipo hace menos de "window".
    // No guardamos la fecha de creación, pero es expiresAt - lifetime.
    public boolean createdWithin(AppUser user, EmailTokenType type, Duration lifetime, Duration window) {
        Instant limit = Instant.now(clock).plus(lifetime).minus(window);
        return tokenRepository.existsByUserAndTypeAndExpiresAtAfter(user, type, limit);
    }

    private EmailToken findValid(String rawToken, EmailTokenType type) {
        if (rawToken == null || rawToken.isBlank()) {
            throw invalidLink();
        }
        EmailToken token = tokenRepository.findByTokenHashAndType(hash(rawToken.trim()), type)
                .orElseThrow(this::invalidLink);
        if (token.getUsedAt() != null || Instant.now(clock).isAfter(token.getExpiresAt())) {
            throw invalidLink();
        }
        return token;
    }

    // Anula los enlaces de ese tipo que el usuario todavía no usó
    @Transactional
    public void invalidateAll(AppUser user, EmailTokenType type) {
        tokenRepository.markAllUsed(user, type, Instant.now(clock));
    }

    // Mismo mensaje para enlace inexistente, usado o vencido: no hace falta dar más pistas
    private ResponseStatusException invalidLink() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "El enlace no es valido o ya vencio");
    }

    static String hash(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            // Toda JVM trae SHA-256, así que esto no debería pasar nunca
            throw new IllegalStateException(e);
        }
    }
}
