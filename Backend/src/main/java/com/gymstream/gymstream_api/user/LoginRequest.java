package com.gymstream.gymstream_api.user;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "El correo no puede estar vacio")
        String email,

        @NotBlank(message = "El password no puede estar vacio")
        String password
) {
}
