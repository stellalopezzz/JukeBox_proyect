package com.gymstream.gymstream_api.user;

import com.gymstream.gymstream_api.mail.MailService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EmailVerificationServiceTest {

    private final EmailTokenService tokenService = mock(EmailTokenService.class);
    private final AppUserRepository userRepository = mock(AppUserRepository.class);
    private final MailService mailService = mock(MailService.class);
    private final EmailVerificationService service = new EmailVerificationService(
            tokenService, userRepository, mailService, "http://localhost:5173");

    @Test
    void sendMailsTheLinkWithTheToken() {
        AppUser user = user();
        when(tokenService.create(user, EmailTokenType.VERIFY_EMAIL, EmailVerificationService.TOKEN_LIFETIME))
                .thenReturn("abc");

        service.sendVerificationEmail(user);

        verify(mailService).send(eq("stella@gmail.com"), anyString(), contains("http://localhost:5173/verificar?token=abc"));
    }

    @Test
    void verifyMarksTheUser() {
        AppUser user = user();
        when(tokenService.consume("abc", EmailTokenType.VERIFY_EMAIL)).thenReturn(user);

        service.verify("abc");

        assertTrue(user.getEmailVerified());
        verify(userRepository).save(user);
    }

    @Test
    void verifyDoesNotSaveWhenTheLinkIsInvalid() {
        when(tokenService.consume(any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "El enlace no es valido o ya vencio"));

        assertThrows(ResponseStatusException.class, () -> service.verify("abc"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void resendRejectsAlreadyVerifiedUser() {
        AppUser user = user();
        user.setEmailVerified(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.resend(user));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verify(mailService, never()).send(any(), any(), any());
    }

    private AppUser user() {
        AppUser user = new AppUser();
        user.setUsername("stella");
        user.setEmail("stella@gmail.com");
        user.setEmailVerified(false);
        return user;
    }
}
