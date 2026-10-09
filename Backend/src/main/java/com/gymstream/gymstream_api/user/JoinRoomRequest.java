package com.gymstream.gymstream_api.user;

import jakarta.validation.constraints.NotBlank;

// JSON que manda el frontend al unirse a una sala: {"code": "ABC123"}.
// Quien entra se sabe por el token del header, no por un username en el body.
public record JoinRoomRequest(
        @NotBlank(message = "El codigo de la sala no puede estar vacio")
        String code
) {
}
