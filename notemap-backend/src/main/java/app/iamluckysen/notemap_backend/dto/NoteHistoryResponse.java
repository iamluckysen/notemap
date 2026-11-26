package app.iamluckysen.notemap_backend.dto;



import app.iamluckysen.notemap_backend.entity.Note;
import app.iamluckysen.notemap_backend.entity.SourceType;

import java.time.LocalDateTime;

public record NoteHistoryResponse(
        Long id,
        SourceType sourceType,
        String title,
        LocalDateTime createdAt
) {
    public static NoteHistoryResponse fromEntity(Note note) {
        return new NoteHistoryResponse(
                note.getId(),
                note.getSourceType(),
                note.getTitle(),
                note.getCreatedAt()
        );
    }
}
