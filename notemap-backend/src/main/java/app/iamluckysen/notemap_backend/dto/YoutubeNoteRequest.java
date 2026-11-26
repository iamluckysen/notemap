package app.iamluckysen.notemap_backend.dto;

import jakarta.validation.constraints.NotBlank;

public record YoutubeNoteRequest (
    @NotBlank(message = "YouTube URL cannot be empty")
    String youtubeUrl
){}
