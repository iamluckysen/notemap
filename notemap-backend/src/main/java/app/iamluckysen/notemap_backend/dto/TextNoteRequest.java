package app.iamluckysen.notemap_backend.dto;

import jakarta.validation.constraints.NotBlank;

public record TextNoteRequest(
        @NotBlank(message = "Study text cannot be empty")
        String text
) {
}
