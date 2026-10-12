package com.gymstream.gymstream_api.user;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    // SELECT ... FOR UPDATE: otra transacción que pida la misma fila espera hasta que esta termine
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from AppUser u where u.id = :id")
    Optional<AppUser> lockById(@Param("id") Long id);
}