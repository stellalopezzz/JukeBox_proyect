package com.gymstream.gymstream_api.user;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;

// Un enlace de un solo uso que se manda por correo. Se guarda el hash del token, no el token:
// si alguien lee la base, no puede usar los enlaces (igual que con las contraseñas).
@Data
@Entity
@Table(name = "email_tokens")
public class EmailToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // SHA-256 del token en hexadecimal (64 caracteres)
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EmailTokenType type;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    // null mientras no se usó
    @Column(name = "used_at")
    private Instant usedAt;
}
