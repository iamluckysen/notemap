package app.iamluckysen.notemap_backend.service;

import app.iamluckysen.notemap_backend.exception.ContentExtractionException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GroqAiService {
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${groq.model}")
    private String model;

    public record GeneratedNoteContent(
            String title,
            String summary,
            String mermaidCode
    ) {}

    private static final String SYSTEM_PROMPT = """
        You are an expert study assistant that converts raw learning material into structured visual notes.
        Return ONLY a valid JSON object with exactly three string fields:
        1. "title": A concise, descriptive title for the topic (max 80 characters).
        2. "summary": A clear, well-structured summary of the key concepts in Markdown bullet points.
        3. "mermaidCode": Valid Mermaid.js flowchart syntax starting with "flowchart TD".
        
        Strict rules for "mermaidCode":
        - Use simple alphanumeric node IDs like A, B, C1, D2.
        - Always wrap node labels in double quotes, e.g., A["Main Concept"] --> B["Sub Concept"].
        - Never put double quotes or parentheses inside node label text.
        - Keep the diagram clean with 6 to 12 nodes so it converts cleanly to Excalidraw.
        - Do not include markdown code fences (```mermaid) inside the JSON string.
        """;

    public GeneratedNoteContent generateStructuredNote(String studyText) {
        Map<String, Object> requestBody = Map.of(
                "model", model,
                "temperature", 0.3,
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(
                        Map.of("role", "system", "content", SYSTEM_PROMPT),
                        Map.of("role", "user", "content", "Create study notes and a flowchart from this material:\n\n" + studyText)
                )
        );

        try {
            String rawApiResponse = restClient.post()
                    .uri("/chat/completions")
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(rawApiResponse);
            String messageContent = root.path("choices")
                    .get(0)
                    .path("message")
                    .path("content")
                    .asText();

            String cleanJson = sanitizeAiOutput(messageContent);
            GeneratedNoteContent parsed = objectMapper.readValue(cleanJson, GeneratedNoteContent.class);

            if (parsed.title() == null || parsed.summary() == null || parsed.mermaidCode() == null) {
                throw new ContentExtractionException("AI response missed required fields");
            }

            return new GeneratedNoteContent(
                    parsed.title().trim(),
                    parsed.summary().trim(),
                    sanitizeMermaid(parsed.mermaidCode())
            );
        } catch (ContentExtractionException e) {
            throw e;
        } catch (Exception e) {
            throw new ContentExtractionException("Failed to generate AI notes from Groq: " + e.getMessage(), e);
        }
    }

    private String sanitizeAiOutput(String content) {
        String withoutThink = content.replaceAll("(?s)<think>.*?</think>", "").trim();
        if (withoutThink.startsWith("```")) {
            withoutThink = withoutThink.replaceAll("^```[a-zA-Z]*\\s*", "").replaceAll("```$", "").trim();
        }
        return withoutThink;
    }

    private String sanitizeMermaid(String mermaid) {
        String cleaned = mermaid
                .replaceAll("^```[a-zA-Z]*\\s*", "")
                .replaceAll("```$", "")
                .trim();

        if (!cleaned.startsWith("flowchart") && !cleaned.startsWith("graph")) {
            cleaned = "flowchart TD\n" + cleaned;
        }
        return cleaned;
    }
}
