package com.gymstream.gymstream_api.user;

import com.gymstream.gymstream_api.mail.MailService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;

// Manda el enlace para confirmar el correo y lo valida cuando el usuario hace clic.
@Service
public class EmailVerificationService {

    static final Duration TOKEN_LIFETIME = Duration.ofHours(24);

    private final EmailTokenService tokenService;
    private final AppUserRepository userRepository;
    private final MailService mailService;
    private final String frontendUrl;

    public EmailVerificationService(EmailTokenService tokenService,
                                    AppUserRepository userRepository,
                                    MailService mailService,
                                    @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl) {
        this.tokenService = tokenService;
        this.userRepository = userRepository;
        this.mailService = mailService;
        this.frontendUrl = frontendUrl;
    }

    public void sendVerificationEmail(AppUser user) {
        String rawToken = tokenService.create(user, EmailTokenType.VERIFY_EMAIL, TOKEN_LIFETIME);
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
        AppUser user = tokenService.consume(rawToken, EmailTokenType.VERIFY_EMAIL);
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
}
