package com.gymstream.gymstream_api.user;

import com.gymstream.gymstream_api.room.Room;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
@Entity
@Table(name = "users")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Relación con la sala, se asigna al unirse a una sala
    @ManyToOne
    @JoinColumn(name = "room_id", nullable = true)
    private Room room;

    // Nombre de usuario, obligatorio y máximo 50 caracteres
    @NotBlank(message = "El nombre de usuario no puede estar vacío")
    @Size(min = 1, max = 50, message = "El nombre debe tener entre 1 y 30 caracteres")
    @Column(nullable = false, length = 50, unique = true)
    private String username;

    // Correo para iniciar sesión, en minúsculas. Admite null para no romper la tabla con usuarios viejos.
    @Column(unique = true, length = 254)
    private String email;

    // true cuando el usuario abrió el enlace del correo. Boolean (no boolean) para que
    // la tabla con usuarios viejos acepte la columna: null cuenta como no verificado.
    @Column(name = "email_verified")
    private Boolean emailVerified;

    // Hash BCrypt del password (~60 caracteres), nunca el texto original.
    // La regla de 4 a 15 caracteres vive en RegisterRequest/LoginRequest, que validan lo que escribe el usuario.
    @NotBlank(message = "La contraseña no puede estar vacía")
    @Column(nullable = false)
    private String password;

    // Token de sesión único para autenticación
    @Column(name = "session_token", unique = true)
    private String sessionToken;

    // Dirección IP del usuario, máximo 45 caracteres (IPv6)
    @Size(max = 45, message = "La dirección IP no puede exceder 45 caracteres")
    @Column(name = "ip_address", length = 45)
    private String ipAddress;
}