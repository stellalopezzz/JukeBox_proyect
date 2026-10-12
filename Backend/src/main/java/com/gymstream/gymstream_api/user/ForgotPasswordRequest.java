package com.gymstream.gymstream_api.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

// JSON que manda la página /recuperar: {"email": "..."}
public record ForgotPasswordRequest(
        @NotBlank(message = "El correo no puede estar vacio")
        @Email(message = "El correo no tiene un formato valido")
        String email
) {
    // Quita espacios antes de validar: si no, @Email rechaza " ana@x.com "
    public ForgotPasswordRequest {
        if (email != null) {
            email = email.trim();
        }
    }
}
