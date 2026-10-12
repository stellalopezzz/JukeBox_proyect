package com.gymstream.gymstream_api.song;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SongServiceTest {

    private final SongService songService = new SongService();

    @Test
    void cleanArtistNameRemovesYouTubeChannelSuffixes() {
        assertEquals("Avicii", songService.cleanArtistName("AviciiOfficialVEVO"));
        assertEquals("Bad Bunny", songService.cleanArtistName("Bad Bunny - Topic"));
        assertEquals("Shakira", songService.cleanArtistName("Shakira Oficial"));
        assertEquals("Coldplay", songService.cleanArtistName("Coldplay"));
    }

    @Test
    void cleanArtistNameKeepsOriginalWhenNothingIsLeft() {
        assertEquals("VEVO", songService.cleanArtistName("VEVO"));
    }
}
