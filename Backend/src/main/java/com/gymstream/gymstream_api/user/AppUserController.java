package com.gymstream.gymstream_api.user;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class AppUserController {

    private final AppUserService userService;
    private final EmailVerificationService emailVerificationService;
    private final PasswordResetService passwordResetService;

    public AppUserController(AppUserService userService, EmailVerificationService emailVerificationService,
                             PasswordResetService passwordResetService) {
        this.userService = userService;
        this.emailVerificationService = emailVerificationService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/rooms/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest request) {
        AppUser user = userService.login(request.email(), request.password());

        return ResponseEntity.ok(Map.of(
                "token", user.getSessionToken(),
                "userId", user.getId(),
                "username", user.getUsername()
        ));
    }

    @PostMapping("/rooms/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest request) {
        AppUser user = userService.register(request.email(), request.username(), request.password());

        return ResponseEntity.ok(Map.of(
                "token", user.getSessionToken(),
                "userId", user.getId(),
                "username", user.getUsername()
        ));
    }

    // Unirse a una sala. Solo puede hacerlo alguien que ya inicio sesion.
    @PostMapping("/rooms/join")
    public ResponseEntity<Map<String, Object>> joinRoom(
            @RequestHeader("X-Session-Token") String sessionToken,
            @Valid @RequestBody JoinRoomRequest request) {
        AppUser user = userService.joinRoom(request.code(), sessionToken);

        return ResponseEntity.ok(Map.of(
                "token", user.getSessionToken(),
                "userId", user.getId(),
                "roomId", user.getRoom().getId(),
                "roomCode", user.getRoom().getCode()
        ));
    }

    // Lo llama la página /verificar del frontend con el token que venía en el enlace del correo
    @PostMapping("/users/verify-email")
    public ResponseEntity<Map<String, Object>> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        emailVerificationService.verify(request.token());
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/users/resend-verification")
    public ResponseEntity<Map<String, Object>> resendVerification(@RequestHeader("X-Session-Token") String sessionToken) {
        AppUser user = userService.getUserBySessionToken(sessionToken);
        emailVerificationService.resend(user);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // Siempre responde lo mismo, exista o no el correo
    @PostMapping("/users/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request.email());
        return ResponseEntity.ok(Map.of("success", true));
    }

    // Lo llama la página /restablecer con el token del enlace y la contraseña nueva
    @PostMapping("/users/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.token(), request.password());
        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping("/users/me")
    public ResponseEntity<Map<String, Object>> me(@RequestHeader("X-Session-Token") String sessionToken) {
        Map<String, Object> result = userService.getMe(sessionToken);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/users/logout")
    public ResponseEntity<Map<String, Object>> logout(@RequestHeader("X-Session-Token") String sessionToken) {
        userService.logout(sessionToken);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
