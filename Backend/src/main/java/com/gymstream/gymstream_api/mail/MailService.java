package com.gymstream.gymstream_api.mail;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

// Envía correos de texto por SMTP. Spring crea el JavaMailSender solo si existe la variable
// SPRING_MAIL_HOST; sin ella el correo se imprime en la consola, así se puede probar sin servidor.
@Service
public class MailService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final String from;

    public MailService(ObjectProvider<JavaMailSender> mailSenderProvider,
                       @Value("${app.mail.from:no-reply@jukebox.local}") String from) {
        this.mailSenderProvider = mailSenderProvider;
        this.from = from;
    }

    public void send(String to, String subject, String text) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            System.out.println("SMTP no configurado. Correo para " + to + " (" + subject + "):\n" + text);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        try {
            mailSender.send(message);
        } catch (MailException ex) {
            // Un correo que no sale no debe romper el registro: el usuario puede pedir que se reenvíe
            System.err.println("No se pudo enviar el correo a " + to + ": " + ex.getMessage());
        }
    }
}
