# Jukebox Project - Guía de Instalación y Uso

## Estructura del proyecto

- **Backend/**: API en Spring Boot (Java) para lógica de negocio y búsqueda de canciones.
- **realtime-service/**: Microservicio Node.js (Express + Socket.io) para comunicación en tiempo real entre backend y clientes.
- **frontend-client/**: Web app para usuarios (React + Tailwind CSS). Permite buscar, agregar y votar canciones.
- **Host (Reproductor)**: Se sirve desde `frontend-client` en la ruta `/host/<roomId>`.

## Instalación rápida (Windows)

1. Abre PowerShell en la carpeta raíz del proyecto.
2. Ejecuta el script de instalación:

```powershell
./setup-all.ps1
```

Esto instalará todas las dependencias necesarias en cada carpeta.

## Ejecución rápida (todos los servicios)

Para iniciar todos los servicios con un solo comando (en segundo plano):

```powershell
./start-all.ps1
```

Esto iniciará:
- Backend en http://localhost:8080
- Realtime Service en http://localhost:3000
- Frontend Client en http://localhost:5173
- Host (Reproductor) en http://localhost:5173/host/<roomId>

Asegúrate de que las dependencias estén instaladas primero con `./setup-all.ps1`.

## ¿Qué hace cada módulo?

### Backend (Spring Boot)
- Expone endpoints REST para buscar canciones (`/api/songs/search`), manejar la cola y votos.
- Debe estar corriendo para que el frontend y el realtime-service funcionen correctamente.

### realtime-service (Node.js)
- Recibe notificaciones del backend vía `POST /internal/notify`.
- Usa Socket.io para enviar eventos en tiempo real a los clientes conectados a cada sala.
- Requiere definir la variable de entorno `INTERNAL_API_KEY` antes de iniciar.

### frontend-client (React)
- Permite a los usuarios ingresar a una sala, buscar canciones, agregarlas a la cola y votar.
- Se conecta automáticamente al realtime-service para recibir actualizaciones en vivo.
- Usa Tailwind CSS para un diseño moderno y responsivo.

### Host (Reproductor)
- Pensado para el PC del gimnasio que reproduce la música.
- Se abre en `frontend-client` usando `/host/<roomId>`.

## ¿Cómo inicio cada módulo?

### Backend

Antes del primer arranque, copiá `Backend/src/main/resources/application.properties.example` como `application.properties` en la misma carpeta y completá tus claves.

```powershell
cd Backend
./mvnw spring-boot:run
```

### realtime-service

```powershell
cd realtime-service
npm start
```

### frontend-client

```powershell
cd frontend-client
npm run dev
```

### Host (Reproductor)

Inicia `frontend-client` y abre:

```powershell
http://localhost:5173/host/<roomId>
```
