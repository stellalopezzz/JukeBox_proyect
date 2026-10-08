package com.gymstream.gymstream_api.room;

import com.gymstream.gymstream_api.user.AppUser;
import com.gymstream.gymstream_api.user.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
public class RoomService {

    private final RoomRepository roomRepository;
    private final AppUserRepository userRepository;

    public RoomService(RoomRepository roomRepository, AppUserRepository userRepository) {
        this.roomRepository = roomRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Room createRoom(String name, Long ownerId) {
        // Validar que el nombre no sea nulo o vacío
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre de la sala no puede estar vacío");
        }
        
        // Validar longitud máxima
        if (name.length() > 100) {
            throw new IllegalArgumentException("El nombre no puede exceder 100 caracteres");
        }
        
        Room room = new Room();
        room.setName(name.trim());
        room.setCode(generateUniqueCode());

        if (ownerId != null) {
            AppUser owner = userRepository.findById(ownerId).orElse(null);
            if (owner != null) {
                room.setOwner(owner);
            }
        }

        return roomRepository.save(room);
    }

     public Room getRoomByCode(String code) {
        // Validar que el código no sea nulo o vacío
        if (code == null || code.trim().isEmpty()) {
            throw new IllegalArgumentException("El código de la sala no puede estar vacío");
        }

        String normalizedCode = code.trim().toUpperCase();

        return roomRepository.findByCode(normalizedCode)
                .orElseThrow(() -> new RuntimeException("Sala no encontrada con código: " + normalizedCode));
    }

    // Generar código único de 6 caracteres alfanuméricos (uppercase)
    // Usado para que los usuarios puedan unirse fácilmente a una sala
    // Ejemplo: "A3F9K2"
    private String generateUniqueCode() {
        String code;
        do {
            code = generateCode();
        } while (roomRepository.findByCode(code).isPresent());
        return code;
    }

    private String generateCode() {
        return UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 6)
                .toUpperCase();
    }
}
