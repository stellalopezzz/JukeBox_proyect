package com.gymstream.gymstream_api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

// Reloj del sistema como bean: en los tests se reemplaza por uno fijo para probar vencimientos.
@Configuration
public class ClockConfig {

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
