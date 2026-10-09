# JukeBox — Estado del proyecto

## Objetivo del proyecto

JukeBox permite que usuarios de un gimnasio se conecten a una sala, busquen canciones, las agreguen a una cola, voten y reproduzcan la música de forma sincronizada.

## Estado actual

El proyecto tiene un MVP funcional.

### Backend
- Java + Spring Boot
- API REST
- PostgreSQL 17 (con Docker Compose)
- Arquitectura organizada por feature
- Controller / Service / Repository
- Entities y DTOs
- Manejo global de excepciones

### Frontend
- React + Vite
- Cliente de usuario
- Vista Host / reproductor

### Realtime
- Node.js
- Socket.io
- Actualización de la cola en tiempo real

## Funcionalidades actuales

- Registro y login
- Crear sala
- Unirse a una sala mediante código
- Buscar canciones en YouTube
- Agregar canciones a la cola
- Votar y quitar voto
- Ordenamiento de la cola
- Avanzar a la siguiente canción
- Reproducción sincronizada

## Problemas conocidos

- La autenticación/sesiones necesitan mejoras.
- La validación del usuario Host necesita revisarse.
- El manejo global de excepciones puede mejorarse.
- Hay mejoras pendientes de arquitectura y seguridad.

## Funcionalidades futuras

- Cooldown por artista
- Historial de canciones
- Estadísticas
- Roles adicionales
- Playlists
- Shuffle

## En qué estamos trabajando actualmente

Login con correo, por fases. La fase 0 (exigir el token de sesión para entrar a una sala) está en el PR #8, que reemplaza al PR #7.

## Último trabajo realizado

- Migración de MySQL a PostgreSQL 17 con Docker Compose (PR #6).
- El host recibe las canciones nuevas y se puede volver a entrar como host (PR #5).
- Contraseñas hasheadas con BCrypt (PR #1).

## Próximo paso

- Revisar y mergear el PR #8, y cerrar el PR #7.
- Seguir con las siguientes fases del login con correo.

## Decisiones importantes

- El backend está organizado por feature.
- QueueItem relaciona Room, Song y AppUser.
- Vote relaciona QueueItem y AppUser.
- El realtime está separado del backend Spring Boot.