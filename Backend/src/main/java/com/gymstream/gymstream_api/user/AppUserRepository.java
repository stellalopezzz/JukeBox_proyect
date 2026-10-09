package com.gymstream.gymstream_api.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    // para encontrar por token
    Optional<AppUser> findBySessionToken(String sessionToken);

    // para encontrar por username
    Optional<AppUser> findByUsername(String username);

    // para verificar duplicados
    boolean existsByUsername(String username);

    // para el login y para verificar duplicados de correo
    Optional<AppUser> findByEmail(String email);

    boolean existsByEmail(String email);
}