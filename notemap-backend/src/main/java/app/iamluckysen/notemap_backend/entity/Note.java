package app.iamluckysen.notemap_backend.entity;


import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "notes",
       indexes = {
        @Index(name = "idx_user_id", columnList = "user_id")
       }
    )
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Note {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="user_id", nullable = false, length=64)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type")
    private SourceType sourceType;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String summary;

    @Column(name = "mermaid_code", columnDefinition = "TEXT", nullable = false)
    private String mermaidCode;

    @Column(name = "excalidraw_json", columnDefinition = "LONGTEXT")
    private String excalidrawJson;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;





}
