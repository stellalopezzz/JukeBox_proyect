package com.gymstream.gymstream_api.realtime;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.util.Map;

@Service
public class RealtimeNotifier {

    private final RestClient restClient;
    private final String apiKey;
    private final boolean enabled;

    public RealtimeNotifier(
            @Value("${realtime.service.url:http://localhost:3000}") String realtimeUrl,
            @Value("${realtime.api.key:${INTERNAL_API_KEY:}}") String apiKey,
            @Value("${realtime.enabled:true}") boolean enabled) {
        // Forzamos HTTP/1.1: el cliente HTTP de Java intenta por defecto pasar a HTTP/2
        // (header "Upgrade: h2c"), y Socket.io corta cualquier upgrade que no sea suyo,
        // asi que el aviso nunca llegaba al realtime-service.
        HttpClient httpClient = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).build();
        this.restClient = RestClient.builder()
                .baseUrl(realtimeUrl)
                .requestFactory(new JdkClientHttpRequestFactory(httpClient))
                .build();
        this.apiKey = apiKey;
        this.enabled = enabled;
        if (enabled && (apiKey == null || apiKey.isBlank())) {
            System.err.println("INTERNAL_API_KEY no configurada: el backend no va a avisar al realtime-service"
                    + " y el host no se va a enterar de las canciones nuevas.");
        }
    }

    public void notifyQueueRefreshed(Long roomId, Object queue) {
        notifyRoom(roomId, "refresh_queue", Map.of("queue", queue));
    }

    private void notifyRoom(Long roomId, String event, Object payload) {
        if (!enabled || apiKey == null || apiKey.isBlank()) {
            return;
        }

        try {
            restClient.post()
                    .uri("/internal/notify")
                    .header("x-api-key", apiKey)
                    .body(Map.of(
                            "roomId", String.valueOf(roomId),
                            "event", event,
                            "payload", payload
                    ))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ex) {
            System.err.println("No se pudo notificar al realtime-service: " + ex.getMessage());
        }
    }
}
