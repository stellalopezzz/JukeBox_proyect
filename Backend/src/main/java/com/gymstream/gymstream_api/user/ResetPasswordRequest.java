package com.gymstream.gymstream_api.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// JSON que manda la página /restablecer: el token del enlace y la contraseña nueva
public record ResetPasswordRequest(
        @NotBlank(message = "El token no puede estar vacio")
        String token,

        @NotBlank(message = "El password no puede estar vacio")
        @Size(min = 8, max = 64, message = "El password debe tener entre 8 y 64 caracteres")
        String password
) {
}
