package com.gymstream.gymstream_api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class PasswordConfig {

    // Un único encoder para toda la app. Quien lo usa depende de la interfaz PasswordEncoder,
    // así que cambiar de algoritmo (por ejemplo a Argon2) solo requiere tocar este método.
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
