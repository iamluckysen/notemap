package app.iamluckysen.notemap_backend.controller;

import app.iamluckysen.notemap_backend.dto.NoteHistoryResponse;
import app.iamluckysen.notemap_backend.dto.NoteResponse;
import app.iamluckysen.notemap_backend.dto.TextNoteRequest;
import app.iamluckysen.notemap_backend.dto.UpdateNoteRequest;
import app.iamluckysen.notemap_backend.service.NoteService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notes")
public class NoteController {
    private final NoteService noteService;

    NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    @PostMapping("/generate/text")
    public ResponseEntity<NoteResponse> generateFromText(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody TextNoteRequest request
    ) {
        NoteResponse response = noteService.createFromText(userId, request.text(),request.diagramType());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/history")
    public ResponseEntity<List<NoteHistoryResponse>> getHistory(
            @RequestHeader("X-User-Id") String userId
    ) {
        return ResponseEntity.ok(noteService.getUserHistory(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<NoteResponse> getNoteById(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(noteService.getNoteById(userId, id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NoteResponse> updateNote(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable Long id,
            @Valid @RequestBody UpdateNoteRequest request
    ) {
        return ResponseEntity.ok(noteService.updateNote(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNote(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable Long id
    ) {
        noteService.deleteNote(userId, id);
        return ResponseEntity.noContent().build();
    }
}
