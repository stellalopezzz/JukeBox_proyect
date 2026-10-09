package com.gymstream.gymstream_api.user;

import jakarta.validation.constraints.NotBlank;

// JSON que manda la página /verificar: {"token": "..."}
public record VerifyEmailRequest(
        @NotBlank(message = "El token no puede estar vacio")
        String token
) {
}
