package com.gymstream.gymstream_api.user;

import jakarta.validation.constraints.NotBlank;

public record JoinRoomRequest(
        @NotBlank(message = "El codigo de la sala no puede estar vacio")
        String code
) {
}
