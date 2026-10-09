# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Objetivo del proyecto

JukeBox permite que usuarios de un gimnasio se conecten a una sala, busquen canciones en YouTube, las agreguen a una cola, voten y reproduzcan la música de forma sincronizada. Es un proyecto de aprendizaje y portfolio (ver PROJECT_STATUS.md para el estado actual, funcionalidades y problemas conocidos).

## Cómo trabajar conmigo

- No asumas que conozco un concepto técnico solo porque aparece en el código.
- Explica de forma sencilla qué hace cada cosa, por qué existe y cómo se relaciona con el resto.
- Prioriza comprender el problema antes de escribir código.
- Cuando haya varias soluciones, explica brevemente cuál conviene y por qué.
- Si cometo un error, explícame primero qué está mal y ayúdame a entenderlo.
- No modifiques archivos sin que te lo pida explícitamente.
- Antes de cambios importantes, explica qué vas a modificar y por qué.
- Evita cambios innecesarios o reestructuraciones grandes.
- Respeta la arquitectura existente salvo que haya una razón clara para cambiarla.
- En el código que escribas para mí, agrega comentarios que expliquen qué hace cada parte y para qué sirve, porque estoy aprendiendo.

## Commits y pull requests

- No agregues líneas `Co-Authored-By` ni textos como "Generated with Claude Code" en los mensajes de commit ni en las descripciones de los PRs.

## Al trabajar en el proyecto

Primero analiza el código existente y sus relaciones antes de proponer cambios.

Cuando implementemos algo:

1. Explica el problema.
2. Explica qué partes del proyecto intervienen.
3. Propón el cambio.
4. Implementa solo después de mi aprobación.
5. Explica qué cambió.
6. Comprueba que funcione mediante tests o ejecutando el proyecto cuando corresponda.

## Aprendizaje

Quiero entender cómo se construye un proyecto real progresivamente.

Cuando sea relevante, explícame:

- qué problema resuelve una clase,
- por qué existe,
- de qué depende,
- qué otras clases dependen de ella,
- y cómo encaja en la arquitectura general.

No quiero simplemente obtener código funcional. Quiero aprender a desarrollar criterio como programadora.

## Comandos de desarrollo

El proyecto son tres servicios independientes que hay que levantar por separado (o con los scripts de la raíz).

### Base de datos (PostgreSQL 17 con Docker Compose, puerto 5432)

`docker-compose.yml` en la raíz levanta un contenedor `postgres:17` (`jukebox-db`) con usuario, contraseña y base `jukebox`, y guarda los datos en el volumen `pgdata`.

```powershell
docker compose up -d   # levantar la base en segundo plano
docker compose down    # apagarla (los datos quedan en el volumen)
```

### Backend (Java 21 + Spring Boot + Maven, puerto 8080)

Requiere variables de entorno antes de arrancar: `SPRING_DATASOURCE_URL` (por ejemplo `jdbc:postgresql://localhost:5432/jukebox`), `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` (PostgreSQL; con el `docker-compose.yml` son `jukebox` / `jukebox`), `YOUTUBE_API_KEY`, y opcionalmente `INTERNAL_API_KEY` (si no está seteada, el backend simplemente no notifica al realtime-service).

```powershell
cd Backend
./mvnw.cmd clean install      # instalar dependencias / compilar
./mvnw.cmd spring-boot:run    # correr el servidor
./mvnw.cmd test               # correr todos los tests
./mvnw.cmd test "-Dtest=QueueServiceTest"   # correr un solo test
```

### frontend-client (React 19 + Vite + TypeScript + Tailwind, puerto 5173)

```powershell
cd frontend-client
npm install
npm run dev       # servidor de desarrollo
npm run build     # tsc -b && vite build
npm run lint
```

No hay test runner configurado en este paquete.

### realtime-service (Node + Express + Socket.io, puerto 3000)

Requiere `INTERNAL_API_KEY` en `realtime-service/.env` (debe coincidir con la que usa el backend).

```powershell
cd realtime-service
npm install
npm start
```

`npm test` es un placeholder, no hay tests reales.

### Scripts de la raíz

- `./setup-all.ps1`: instala dependencias en los tres módulos.
- `./start-all.ps1`: levanta los tres servicios en paralelo (el backend solo si `SPRING_DATASOURCE_URL` ya está seteada en la sesión de PowerShell).

## Arquitectura

### Los tres servicios y cómo se comunican

- **Backend (Spring Boot, :8080)** es la fuente de verdad: expone la API REST, tiene la base de datos PostgreSQL y toda la lógica de negocio.
- **realtime-service (Node, :3000)** no tiene lógica de negocio ni base de datos propia; es un puente de eventos. El backend le hace `POST /internal/notify` (protegido con header `x-api-key`, ver `RealtimeNotifier.java`) cada vez que la cola cambia, y el realtime-service reemite ese evento por Socket.io a los clientes conectados a esa `roomId` (`index.js`). Los clientes del frontend se conectan directamente al puerto 3000 vía `socket.io-client`, sin pasar por el backend.
- **frontend-client (Vite, :5173)** es una SPA sin librería de routing: `Root.tsx` decide qué renderizar leyendo `window.location.pathname` a mano — si matchea `/host/:roomId` sirve `HostPage` (vista del reproductor que corre en la PC del gimnasio), y si no sirve `App.jsx` (vista de usuario/invitado: login, buscar, votar).

### Backend organizado por feature

Bajo `Backend/src/main/java/com/gymstream/gymstream_api/`, cada paquete es un feature completo (Controller + Service + Repository + Entity + DTOs), no hay capas transversales por tipo: `room`, `user`, `queue`, `song`, `vote`, `cooldown`, `realtime`, más `config` y `exception` a nivel global.

### Autenticación (sin Spring Security)

Es un esquema de token de sesión manual: `AppUser.sessionToken` (UUID) se genera en login/register/joinRoom y el cliente lo reenvía en el header `X-Session-Token`. Cada controller que lo necesita lo resuelve a mano llamando a `AppUserService.getUserBySessionToken()`. Las contraseñas se guardan hasheadas con BCrypt: `AppUserService` usa el bean `PasswordEncoder` definido en `config/PasswordConfig.java` (`encode` al registrar, `matches` al hacer login). Solo se usa la dependencia `spring-security-crypto`, no el starter de Spring Security. Los usuarios creados antes de este cambio, con contraseña en texto plano, ya no pueden loguearse y deben registrarse de nuevo. El login es con correo + contraseña (`AppUser.email`, único, guardado en minúsculas por `AppUserService.normalizeEmail`); el `username` se pide al registrarse y queda como nombre visible. Los usuarios sin correo (creados antes de este cambio) no pueden loguearse y deben registrarse de nuevo.

### Modelo de dominio

- `Room`: sala con `code` único, `owner` (AppUser opcional) e `isActive`.
- `AppUser`: puede ser dueño de una o más `Room` (`RoomRepository.findByOwnerId`) y/o estar unido a una sala (`user.room`, seteado al hacer `joinRoom`).
- `QueueItem`: relaciona `Room` + `Song` + `AppUser` (quien la agregó) + `status` (`PENDING` / `PLAYING` / `PLAYED`).
- `Vote`: relaciona `QueueItem` + `AppUser` (un voto por usuario por canción).
- `Cooldown`: por `Room` + `identifier` (youtubeId) + tipo; impide re-agregar una canción recién reproducida.

### Algoritmo de la cola (`QueueService`)

`scorePendingItems` calcula `score = votos*10 + minutos de espera`, con penalización de `-1000` si el artista coincide con el que está sonando (evita repetir artista seguido). `nextTrack()` mueve el item con mayor score a `PLAYING`, marca el anterior como `PLAYED` y crea un `Cooldown` de 15 minutos para esa canción (bloquea que se vuelva a agregar mientras dure). Las acciones de owner (`next-track`, borrar de la cola) están protegidas por `QueueService.validateOwner`.

### Búsqueda de canciones (`SongService`)

Llama a la API de YouTube Data v3 (`search` + `videos`) usando `YOUTUBE_API_KEY`. Si el texto pegado por el usuario es un link de YouTube (`youtube.com/watch?v=` o `youtu.be/`), extrae el `videoId` y busca ese video puntual en vez de hacer una búsqueda por texto. Filtra resultados a categoría "Música" (`categoryId == "10"`) y duración menor a 10 minutos.

### Manejo de errores

`GlobalExceptionHandler` centraliza todas las excepciones en un formato JSON consistente `{timestamp, status, error, message}`. Los services lanzan `ResponseStatusException` con el status HTTP correspondiente; para `RuntimeException` genérica el status se infiere por el texto del mensaje (ej. contiene "no encontrada" → 404), lo cual es frágil — ver "mejoras pendientes" en PROJECT_STATUS.md.

### CORS

Hardcodeado a `http://localhost:5173` en `CorsConfig.java`. Si el frontend corre en otro puerto (por ejemplo porque `start-all.ps1` eligió 5174), las requests del navegador van a fallar por CORS hasta que se actualice ahí.
