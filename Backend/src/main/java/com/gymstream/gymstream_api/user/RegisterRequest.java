package com.gymstream.gymstream_api.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        // 254 es el largo máximo de una dirección de correo
        @NotBlank(message = "El correo no puede estar vacio")
        @Email(message = "El correo no tiene un formato valido")
        @Size(max = 254, message = "El correo no puede superar 254 caracteres")
        String email,

        @NotBlank(message = "El username no puede estar vacio")
        @Size(min = 3, max = 50, message = "El username debe tener entre 3 y 50 caracteres")
        String username,

        // BCrypt solo usa los primeros 72 bytes, por eso el máximo es 64
        @NotBlank(message = "El password no puede estar vacio")
        @Size(min = 8, max = 64, message = "El password debe tener entre 8 y 64 caracteres")
        String password
) {
    // Quita espacios antes de validar: si no, @Email rechaza " ana@x.com "
    public RegisterRequest {
        if (email != null) {
            email = email.trim();
        }
    }
}
