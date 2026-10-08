package com.gymstream.gymstream_api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import java.util.TimeZone;

@SpringBootApplication
public class JukeBoxApp {

    public static void main(String[] args) {
        TimeZone.setDefault(TimeZone.getTimeZone("America/Argentina/Buenos_Aires"));
        SpringApplication.run(JukeBoxApp.class, args);
    }
}