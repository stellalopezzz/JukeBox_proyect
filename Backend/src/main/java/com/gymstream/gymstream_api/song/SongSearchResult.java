package com.gymstream.gymstream_api.song;

import lombok.Data;
import lombok.AllArgsConstructor;

@Data
@AllArgsConstructor
public class SongSearchResult {
    private String ytId;       
    private String title;      
    private String artist;     
    private String thumb;     
    private Integer durationSeconds; // duración en segundos, para mostrarla en la cola
}