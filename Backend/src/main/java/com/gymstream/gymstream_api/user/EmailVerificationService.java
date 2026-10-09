package com.gymstream.gymstream_api.user;

import com.gymstream.gymstream_api.mail.MailService;
import org.springframework.beans.factory.annotation.Value;
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

// Manda el enlace para confirmar el correo y lo valida cuando el usuario hace clic.
@Service
public class EmailVerificationService {

    static final Duration TOKEN_LIFETIME = Duration.ofHours(24);

    private final EmailTokenRepository tokenRepository;
    private final AppUserRepository userRepository;
    private final MailService mailService;
    private final String frontendUrl;
    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();

    public EmailVerificationService(EmailTokenRepository tokenRepository,
                                    AppUserRepository userRepository,
                                    MailService mailService,
                                    @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl,
                                    Clock clock) {
        this.tokenRepository = tokenRepository;
        this.userRepository = userRepository;
        this.mailService = mailService;
        this.frontendUrl = frontendUrl;
        this.clock = clock;
    }

    public void sendVerificationEmail(AppUser user) {
        // SecureRandom, no Random: el token tiene que ser imposible de adivinar
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        EmailToken token = new EmailToken();
        token.setTokenHash(hash(rawToken));
        token.setUser(user);
        token.setType(EmailTokenType.VERIFY_EMAIL);
        token.setExpiresAt(Instant.now(clock).plus(TOKEN_LIFETIME));
        tokenRepository.save(token);

        String link = frontendUrl + "/verificar?token=" + rawToken;
        mailService.send(user.getEmail(), "Confirma tu correo en JukeBox",
                "Hola " + user.getUsername() + ",\n\n"
                        + "Para confirmar tu correo abre este enlace (vence en 24 horas):\n"
                        + link + "\n\n"
                        + "Si no creaste una cuenta en JukeBox, ignora este mensaje.");
    }

    // @Transactional: el usuario y el token se guardan juntos, o ninguno de los dos
    @Transactional
    public void verify(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw invalidLink();
        }
        EmailToken token = tokenRepository.findByTokenHashAndType(hash(rawToken.trim()), EmailTokenType.VERIFY_EMAIL)
                .orElseThrow(this::invalidLink);
        Instant now = Instant.now(clock);
        if (token.getUsedAt() != null || now.isAfter(token.getExpiresAt())) {
            throw invalidLink();
        }

        token.setUsedAt(now);
        tokenRepository.save(token);
        AppUser user = token.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);
    }

    public void resend(AppUser user) {
        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tu correo ya esta verificado");
        }
        if (user.getEmail() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tu cuenta no tiene correo");
        }
        sendVerificationEmail(user);
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
