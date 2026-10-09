package com.gymstream.gymstream_api.user;

import jakarta.validation.constraints.NotBlank;

// DTO (Data Transfer Object): describe la forma del JSON que manda el frontend
// al unirse a una sala, por ejemplo {"code": "ABC123"}.
// Es un "record": una clase inmutable donde Java genera solo el constructor,
// el getter code() y equals/hashCode/toString.
// Antes tambien traia "username", pero lo quitamos: quien entra se sabe por el
// token del header, no por un nombre que cualquiera puede escribir.
public record JoinRoomRequest(
        @NotBlank(message = "El codigo de la sala no puede estar vacio")
        String code
) {
}
