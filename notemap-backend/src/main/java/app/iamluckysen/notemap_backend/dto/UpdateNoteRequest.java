package app.iamluckysen.notemap_backend.dto;
import jakarta.validation.constraints.NotBlank;

public record UpdateNoteRequest(
        @NotBlank(message = "Title cannot be empty")
        String title,

        @NotBlank(message = "Summary cannot be empty")
        String summary,

        @NotBlank(message = "Mermaid code cannot be empty")
        String mermaidCode,

        String excalidrawJson
) {}