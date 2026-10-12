package com.gymstream.gymstream_api.user;

// Para qué sirve un EmailToken: un enlace de verificar el correo no sirve para cambiar la contraseña.
public enum EmailTokenType {
    VERIFY_EMAIL,
    RESET_PASSWORD
}
