package app.iamluckysen.notemap_backend.repository;

import app.iamluckysen.notemap_backend.entity.Note;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NoteRepository extends JpaRepository<Note, Long> {

    List<Note> findByUserIdOrderByCreatedAtDesc(String userId);

    Optional<Note> findByIdAndUserId(Long id, String userId);
}