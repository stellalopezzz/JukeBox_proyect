package com.gymstream.gymstream_api.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface EmailTokenRepository extends JpaRepository<EmailToken, Long> {
    Optional<EmailToken> findByTokenHashAndType(String tokenHash, EmailTokenType type);

    // Marca el token como usado solo si nadie lo uso antes, en un solo UPDATE.
    // Devuelve cuantas filas cambio: 0 significa que otro pedido lo uso primero.
    @Modifying
    @Query("update EmailToken t set t.usedAt = :now where t.id = :id and t.usedAt is null")
    int markUsed(@Param("id") Long id, @Param("now") Instant now);
}
