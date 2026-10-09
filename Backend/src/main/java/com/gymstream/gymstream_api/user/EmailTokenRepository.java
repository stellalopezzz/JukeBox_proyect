package com.gymstream.gymstream_api.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmailTokenRepository extends JpaRepository<EmailToken, Long> {
    Optional<EmailToken> findByTokenHashAndType(String tokenHash, EmailTokenType type);
}
