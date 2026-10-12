package com.gymstream.gymstream_api.song;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SongService {

    @Value("${youtube.api.key}")
    private String apiKey;

    private final RestClient restClient = RestClient.create();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
    private static final String YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

    public List<SongSearchResult> searchSongs(String query) {
        validateApiKey();

        // Detectamos si el texto que llegó es un link de YouTube
        // Si es un link, extraemos el videoId y buscamos ese video específico
        // Si no es un link, buscamos normalmente por texto
        String videoId = extractVideoId(query);

        if (videoId != null) {
            // ES UN LINK → buscamos el video específico por ID
            return searchByVideoId(videoId);
        } else {
            // NO ES UN LINK → búsqueda normal por texto
            return searchByQuery(query);
        }
    }

    // Detecta si el texto es un link de YouTube y extrae el videoId
    // Soporta estos formatos:
    // - https://www.youtube.com/watch?v=yKNxeF4KMsY
    // - https://youtu.be/yKNxeF4KMsY
    // - https://www.youtube.com/watch?v=yKNxeF4KMsY&t=30s (con parámetros extra)
    // Devuelve null si no es un link de YouTube
    private String extractVideoId(String text) {

        if (text == null || text.trim().isEmpty()) {
            return null;
        }

        // Formato largo: youtube.com/watch?v=ID
        if (text.contains("youtube.com/watch")) {
            // Buscamos el parámetro "v=" en la URL
            int vIndex = text.indexOf("v=");
            if (vIndex != -1) {
                // Tomamos todo lo que viene después de "v="
                String afterV = text.substring(vIndex + 2);
                // El ID termina en "&" si hay más parámetros, o en el final del string
                // Por ejemplo: "yKNxeF4KMsY&t=30s" → tomamos solo "yKNxeF4KMsY"
                int ampIndex = afterV.indexOf("&");
                if (ampIndex != -1) {
                    return afterV.substring(0, ampIndex);
                }
                return afterV;
            }
        }

        // Formato corto: youtu.be/ID
        if (text.contains("youtu.be/")) {
            int slashIndex = text.indexOf("youtu.be/") + 9;
            String afterSlash = text.substring(slashIndex);
            // El ID puede tener parámetros después: "yKNxeF4KMsY?t=30"
            int queryIndex = afterSlash.indexOf("?");
            if (queryIndex != -1) {
                return afterSlash.substring(0, queryIndex);
            }
            return afterSlash;
        }

        // No es un link de YouTube
        return null;
    }

    // Busca un video específico por su ID usando el endpoint /videos de YouTube
    // Esto se usa cuando el usuario pega un link directamente
    private List<SongSearchResult> searchByVideoId(String videoId) {

        List<SongSearchResult> results = new ArrayList<>();

        try {
            String responseBody = restClient.get()
                    .uri(YOUTUBE_VIDEOS_URL +
                            "?part=snippet,contentDetails" +
                            "&id=" + videoId +
                            "&key=" + apiKey)
                    .retrieve()
                    .body(String.class);

            JsonNode response = objectMapper.readTree(responseBody);

            if (response != null && response.has("items") && 
                response.get("items").size() > 0) {

                JsonNode item = response.get("items").get(0);
                JsonNode snippet = item.get("snippet");
                JsonNode contentDetails = item.get("contentDetails");

                String title = snippet.get("title").asText();
                String channelTitle = snippet.get("channelTitle").asText();
                String thumbnail = snippet
                        .get("thumbnails")
                        .get("medium")
                        .get("url")
                        .asText();
                String categoryId = snippet.has("categoryId") ? snippet.get("categoryId").asText("") : "";
                String duration = contentDetails != null && contentDetails.has("duration")
                        ? contentDetails.get("duration").asText("")
                        : "";

                if (isValidMusicVideo(categoryId, duration)) {
                    // Solo devolvemos ese video específico si es música y < 10 minutos
                    results.add(new SongSearchResult(videoId, title, cleanArtistName(channelTitle),
                            thumbnail, toSeconds(duration)));
                }
            }

        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "No se pudo consultar YouTube. Revisa YOUTUBE_API_KEY o la cuota de la API.",
                    e
            );
        }

        return results;
    }

    private List<SongSearchResult> searchByQuery(String query) {

    List<SongSearchResult> results = new ArrayList<>();

    try {
        // URLEncoder convierte caracteres especiales a formato válido para URLs
        // Por ejemplo: "rock en español" → "rock+en+espa%C3%B1ol"
        // Sin esto, los espacios y tildes rompen la URL y YouTube no responde bien
        String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);

        String responseBody = restClient.get()
                .uri(YOUTUBE_SEARCH_URL +
                        "?part=snippet" +
                        "&q=" + encodedQuery +
                        "&type=video" +
                        "&videoEmbeddable=true" +
                        "&maxResults=8" +
                        "&key=" + apiKey)
                .retrieve()
                .body(String.class);

        JsonNode response = objectMapper.readTree(responseBody);

        if (response != null && response.has("items")) {
            List<String> videoIds = new ArrayList<>();
            response.get("items").forEach(item -> {
                try {
                    String videoId = item.get("id").get("videoId").asText();
                    if (videoId != null && !videoId.isBlank()) {
                        videoIds.add(videoId);
                    }
                } catch (Exception e) {
                    System.err.println("Error al procesar item: " + e.getMessage());
                }
            });

            if (!videoIds.isEmpty()) {
                String idsCsv = videoIds.stream().collect(Collectors.joining(","));
                String detailsBody = restClient.get()
                        .uri(YOUTUBE_VIDEOS_URL +
                                "?part=snippet,contentDetails" +
                                "&id=" + idsCsv +
                                "&key=" + apiKey)
                        .retrieve()
                        .body(String.class);

                JsonNode detailsResponse = objectMapper.readTree(detailsBody);
                if (detailsResponse != null && detailsResponse.has("items")) {
                    detailsResponse.get("items").forEach(item -> {
                        try {
                            JsonNode snippet = item.get("snippet");
                            JsonNode contentDetails = item.get("contentDetails");
                            String categoryId = snippet.has("categoryId") ? snippet.get("categoryId").asText("") : "";
                            String duration = contentDetails != null && contentDetails.has("duration")
                                    ? contentDetails.get("duration").asText("")
                                    : "";

                            if (!isValidMusicVideo(categoryId, duration)) {
                                return;
                            }

                            String videoId = item.get("id").asText();
                            String title = snippet.get("title").asText();
                            String channelTitle = snippet.get("channelTitle").asText();
                            String thumbnail = snippet
                                    .get("thumbnails")
                                    .get("medium")
                                    .get("url")
                                    .asText();

                            results.add(new SongSearchResult(videoId, title, cleanArtistName(channelTitle),
                                    thumbnail, toSeconds(duration)));
                        } catch (Exception e) {
                            System.err.println("Error al procesar detalle de video: " + e.getMessage());
                        }
                    });
                }
            }
        }

    } catch (Exception e) {
        throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "No se pudo consultar YouTube. Revisa YOUTUBE_API_KEY o la cuota de la API.",
                e
        );
    }

    return results;
    }

    private boolean isValidMusicVideo(String categoryId, String durationIso8601) {
        if (!"10".equals(categoryId)) {
            return false;
        }
        try {
            Duration duration = Duration.parse(durationIso8601);
            return duration.toMinutes() < 10;
        } catch (DateTimeParseException ex) {
            return false;
        }
    }

    // YouTube da la duración en formato ISO 8601 ("PT3M45S"); la pasamos a segundos (225)
    private Integer toSeconds(String durationIso8601) {
        try {
            return (int) Duration.parse(durationIso8601).getSeconds();
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    // El "artista" es el nombre del canal de YouTube, que suele traer agregados
    // como "AviciiOfficialVEVO" o "Bad Bunny - Topic". Los quitamos para que se lea mejor.
    String cleanArtistName(String channelTitle) {
        if (channelTitle == null) {
            return null;
        }
        String name = channelTitle.trim()
                .replaceAll("(?i)\\s*-\\s*Topic$", "")
                .replaceAll("VEVO$", "")
                .replaceAll("(?i)\\s*(Official|Oficial)$", "")
                .trim();
        // Si al limpiar no queda nada (un canal llamado solo "VEVO"), dejamos el original
        return name.isEmpty() ? channelTitle : name;
    }

    private void validateApiKey() {
        if (apiKey == null || apiKey.isBlank() || "TU_API_KEY_REAL".equals(apiKey)) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "YOUTUBE_API_KEY no esta configurada correctamente"
            );
        }
    }
}
