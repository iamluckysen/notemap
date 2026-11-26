package app.iamluckysen.notemap_backend.service;

import app.iamluckysen.notemap_backend.exception.ContentExtractionException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ContentExtractorService {
    @Value("${groq.max-chunk-chars:12000}")
    private int maxChunkChars;

    public String extractFromText(String rawText) {
        if (rawText == null || rawText.isBlank()) {
            throw new ContentExtractionException("Input text cannot be empty");
        }
        return normalizeAndTruncate(rawText);
    }
    private String normalizeAndTruncate(String text) {
        String cleaned = text.replaceAll("\\s+", " ").trim();
        if (cleaned.length() > maxChunkChars) {
            return cleaned.substring(0, maxChunkChars);
        }
        return cleaned;
    }
}
