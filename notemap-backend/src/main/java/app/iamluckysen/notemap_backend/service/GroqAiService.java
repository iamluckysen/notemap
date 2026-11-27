    package app.iamluckysen.notemap_backend.service;

    import app.iamluckysen.notemap_backend.exception.ContentExtractionException;
    import com.flagsmith.FlagsmithClient;
    import com.flagsmith.models.Flags;
    import lombok.RequiredArgsConstructor;
    import org.slf4j.Logger;
    import org.slf4j.LoggerFactory;
    import org.springframework.beans.factory.annotation.Autowired;
    import org.springframework.beans.factory.annotation.Value;
    import org.springframework.stereotype.Service;
    import org.springframework.web.client.RestClient;
    import tools.jackson.databind.JsonNode;
    import tools.jackson.databind.ObjectMapper;
    import java.util.List;
    import java.util.Map;
    import java.util.Optional;

    @Service
    @RequiredArgsConstructor
    public class GroqAiService {
        private static final Logger log = LoggerFactory.getLogger(GroqAiService.class);
        private final RestClient restClient;
        private final ObjectMapper objectMapper;
        private final Optional<FlagsmithClient> flagsmithClient;

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



        public GeneratedNoteContent generateStructuredNote(String studyText, String userId) {

            String style = resolveNoteGenerationStyle(userId);
            boolean isDetailed = "detailed".equalsIgnoreCase(style);
            log.info("Generating note for userId={} using note_generation_style={}", userId, style);
            String systemPrompt = buildSystemPrompt(isDetailed);
            int maxTokens = isDetailed ? 2048 : 450;

            String userInstruction = isDetailed
                    ? """
                  Create an IN-DEPTH, COMPREHENSIVE study guide and a 12-to-15-node multi-branch flowchart from this material.
                  In "summary", include 4 bold uppercase sections (**CORE OVERVIEW**, **KEY MECHANISMS**, **STEP-BY-STEP BREAKDOWN**, **REAL-WORLD EXAMPLE**) with 2 to 3 multi-sentence bullets under each section:

                  """ + studyText
                    : """
                  Create an ULTRA-BRIEF TL;DR and a 4-node linear flowchart from this material.
                  In "summary", write ONLY 3 single-line bullets (max 12 words each, no sections, no examples):

                  """ + studyText;

            Map<String, Object> requestBody = Map.of(
                    "model", model,
                    "temperature", 0.3,
                    "max_tokens", maxTokens,
                    "response_format", Map.of("type", "json_object"),
                    "messages", List.of(
                            Map.of("role", "system", "content", systemPrompt),
                            Map.of("role", "user", "content", userInstruction)
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
        private String resolveNoteGenerationStyle(String userId) {
            if (flagsmithClient.isEmpty() || userId == null || userId.isBlank()) {
                return "concise";
            }
            try {
                Flags flags = flagsmithClient.get().getIdentityFlags(userId);
                Object value = flags.getFeatureValue("note_generation_style");
                return value != null ? value.toString().trim() : "concise";
            } catch (Exception e) {
                log.warn("Flagsmith flag lookup failed for userId={}, defaulting to concise: {}", userId, e.getMessage());
                return "concise";
            }
        }

        private String buildSystemPrompt(boolean isDetailed) {
            if (isDetailed) {
                return SYSTEM_PROMPT.formatted(
                        "An exhaustive study guide organized under **CORE OVERVIEW**, **KEY MECHANISMS**, **STEP-BY-STEP BREAKDOWN**, and **REAL-WORLD EXAMPLE** with 8 to 12 detailed bullets.",
                        "Build a rich multi-branch diagram with 12 to 15 nodes and descriptive edge labels like A[\"Topic\"] -->|\"drives\"| B[\"Result\"]."
                );
            }
            return SYSTEM_PROMPT.formatted(
                    "Exactly 3 short one-line bullet points (under 12 words each) with no subheadings.",
                    "Keep the diagram strictly minimal with only 4 nodes and no sub-branches."
            );
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
