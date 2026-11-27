package app.iamluckysen.notemap_backend.service;

import app.iamluckysen.notemap_backend.dto.NoteHistoryResponse;
import app.iamluckysen.notemap_backend.dto.NoteResponse;
import app.iamluckysen.notemap_backend.dto.UpdateNoteRequest;
import app.iamluckysen.notemap_backend.entity.Note;
import app.iamluckysen.notemap_backend.entity.SourceType;
import app.iamluckysen.notemap_backend.exception.ResourceNotFoundException;
import app.iamluckysen.notemap_backend.repository.NoteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;


@Service
public class NoteService {
    private final NoteRepository noteRepository;
    private final ContentExtractorService contentExtractorService;
    private final GroqAiService groqAiService;

    public NoteService(NoteRepository noteRepository,ContentExtractorService contentExtractorService, GroqAiService groqAiService) {
        this.noteRepository = noteRepository;
        this.contentExtractorService = contentExtractorService;
        this.groqAiService = groqAiService;
    }
    @Transactional
    public NoteResponse createFromText(String userId, String text) {
        return createFromText(userId, text, "visual");
    }

    @Transactional
    public NoteResponse createFromText(String userId, String text, String diagramType) {
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("Study text must not be blank");
        }
        String normalizedType = normalizeDiagramType(diagramType);
        return generateAndSaveNote(userId, SourceType.TEXT, text.trim(), normalizedType);
    }

    @Transactional(readOnly = true)
    public List<NoteHistoryResponse> getUserHistory(String userId) {
        return noteRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(NoteHistoryResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public NoteResponse getNoteById(String userId, Long noteId) {
        Note note = findOwnedNote(userId, noteId);
        return NoteResponse.fromEntity(note);
    }

    @Transactional
    public NoteResponse updateNote(String userId, Long noteId, UpdateNoteRequest request) {
        Note note = findOwnedNote(userId, noteId);
        note.setTitle(request.title().trim());
        note.setSummary(request.summary().trim());
        note.setMermaidCode(request.mermaidCode().trim());

        if (request.excalidrawJson() != null) {
            note.setExcalidrawJson(request.excalidrawJson());
        }

        Note updated = noteRepository.save(note);
        return NoteResponse.fromEntity(updated);
    }

    @Transactional
    public void deleteNote(String userId, Long noteId) {
        Note note = findOwnedNote(userId, noteId);
        noteRepository.delete(note);
    }

    private NoteResponse generateAndSaveNote(String userId, SourceType sourceType, String cleanText, String diagramType) {
        GroqAiService.GeneratedNoteContent aiContent = groqAiService.generateStructuredNote(cleanText, userId, diagramType);

        Note note = Note.builder()
                .userId(userId)
                .sourceType(sourceType)
                .title(aiContent.title())
                .summary(aiContent.summary())
                .mermaidCode(aiContent.mermaidCode())
                .excalidrawJson("{\"elements\":[]}")
                .build();

        Note savedNote = noteRepository.save(note);
        return NoteResponse.fromEntity(savedNote);
    }

    private Note findOwnedNote(String userId, Long noteId) {
        return noteRepository.findByIdAndUserId(noteId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Note not found with id: " + noteId));
    }

    private String normalizeDiagramType(String diagramType) {
        if (diagramType != null && "flowchart".equalsIgnoreCase(diagramType.trim())) {
            return "flowchart";
        }
        return "visual";
    }


}
