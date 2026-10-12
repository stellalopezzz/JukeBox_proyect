package com.gymstream.gymstream_api.user;

import com.gymstream.gymstream_api.mail.MailService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

// Recuperar la contraseña: manda un enlace al correo y, con ese enlace, deja elegir una nueva.
@Service
public class PasswordResetService {

    // Más corto que el de verificación: este enlace da acceso a la cuenta
    static final Duration TOKEN_LIFETIME = Duration.ofHours(1);

    private final EmailTokenService tokenService;
    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final String frontendUrl;

    public PasswordResetService(EmailTokenService tokenService,
                                AppUserRepository userRepository,
                                PasswordEncoder passwordEncoder,
                                MailService mailService,
                                @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl) {
        this.tokenService = tokenService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
        this.frontendUrl = frontendUrl;
    }

    // No avisa si el correo no existe: así nadie puede averiguar quién tiene cuenta
    public void requestReset(String email) {
        if (email == null || email.isBlank()) {
            return;
        }
        userRepository.findByEmail(AppUserService.normalizeEmail(email)).ifPresent(user -> {
            String rawToken = tokenService.create(user, EmailTokenType.RESET_PASSWORD, TOKEN_LIFETIME);
            String link = frontendUrl + "/restablecer?token=" + rawToken;
            mailService.send(user.getEmail(), "Recupera tu contraseña de JukeBox",
                    "Hola " + user.getUsername() + ",\n\n"
                            + "Para elegir una contraseña nueva abre este enlace (vence en 1 hora):\n"
                            + link + "\n\n"
                            + "Si no lo pediste, ignora este mensaje: tu contraseña no cambia.");
        });
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        // Se valida antes de usar el token, para que una contraseña inválida no gaste el enlace
        AppUserService.validatePassword(newPassword);
        AppUser user = tokenService.consume(rawToken, EmailTokenType.RESET_PASSWORD);
        // Si pidió varios enlaces, los demás dejan de servir
        tokenService.invalidateAll(user, EmailTokenType.RESET_PASSWORD);

        user.setPassword(passwordEncoder.encode(newPassword));
        // Cierra la sesión abierta: si alguien más estaba usando la cuenta, queda afuera
        user.setSessionToken(null);
        // Abrir el enlace demuestra que el correo es suyo
        user.setEmailVerified(true);
        userRepository.save(user);
    }
}
