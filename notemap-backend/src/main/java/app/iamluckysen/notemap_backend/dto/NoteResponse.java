package app.iamluckysen.notemap_backend.dto;

import app.iamluckysen.notemap_backend.entity.Note;
import app.iamluckysen.notemap_backend.entity.SourceType;

import java.time.LocalDateTime;

public record NoteResponse(
        Long id,
        SourceType sourceType,
        String title,
        String summary,
        String mermaidCode,
        String excalidrawJson,
        LocalDateTime createdAt
) {
    public static NoteResponse fromEntity(Note note) {
        return new NoteResponse(
                note.getId(),
                note.getSourceType(),
                note.getTitle(),
                note.getSummary(),
                note.getMermaidCode(),
                note.getExcalidrawJson(),
                note.getCreatedAt()
        );
    }
}