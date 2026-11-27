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


        private static final String BASE_SYSTEM_PROMPT = """
        You are an expert visual note-taker that converts study material into structured Excalidraw visual boards.
        Return ONLY a valid JSON object with exactly three fields:
        1. "title": A concise, descriptive title for the topic (max 80 characters).
        2. "summary": %s
        3. "visualDiagram": A JSON object (NOT a stringified string) with this exact schema:
           {
             "layoutType": "mindmap" | "comparison" | "process" | "architecture",
             "centerTitle": "Main Topic Title",
             "cards": [
               {
                 "id": "c1",
                 "heading": "Short Card Title",
                 "body": "1-2 line key takeaway",
                 "color": "blue" | "green" | "purple" | "orange" | "pink",
                 "shape": "rectangle" | "diamond" | "ellipse"
               }
             ],
             "connections": [
               { "from": "c1", "to": "c2", "label": "short relationship" }
             ],
             "stickyNotes": [
               { "title": "Key Tip", "text": "Important exam takeaway or formula" }
             ]
           }

        Strict rules for "visualDiagram":
        - Choose the "layoutType" that best fits the content ("mindmap", "comparison", "process", or "architecture").
        - %s
        - Every "from" and "to" in "connections" must match an existing card "id".
        - Keep each card "heading" under 35 characters and "body" under 95 characters so text fits cleanly inside shapes.
        - Vary card colors thoughtfully across related groups ("blue", "green", "purple", "orange", "pink").
        """;

        public GeneratedNoteContent generateStructuredNote(String studyText, String userId) {
            String style = resolveNoteGenerationStyle(userId);
            boolean isDetailed = "detailed".equalsIgnoreCase(style);
            log.info("Generating visual note for userId={} using note_generation_style={}", userId, style);

            String systemPrompt = buildSystemPrompt(isDetailed);
            int maxTokens = isDetailed ? 2600 : 900;

            String userInstruction = isDetailed
                    ? """
                  Create an IN-DEPTH visual study board and comprehensive summary from this material.
                  For "summary" (must be a single Markdown string), include 4 bold uppercase sections (**CORE OVERVIEW**, **KEY MECHANISMS**, **STEP-BY-STEP BREAKDOWN**, **REAL-WORLD EXAMPLE**) with 2 to 3 multi-sentence bullets under each section.
                  For "visualDiagram", create 8 to 11 richly connected cards, 6 to 10 labeled connections, and 3 stickyNotes:

                  """ + studyText
                    : """
                  Create an ULTRA-BRIEF visual overview and executive TL;DR from this material.
                  For "summary" (must be a single Markdown string), write ONLY 3 single-line bullets (max 12 words each, no sections, no examples).
                  For "visualDiagram", create 3 to 4 concise cards, 2 to 3 connections, and 1 stickyNote:

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
                JsonNode noteJson = objectMapper.readTree(cleanJson);

                String title = extractText(noteJson.path("title"));
                String summary = extractSummary(noteJson.path("summary"));
                JsonNode diagramNode = resolveDiagramNode(noteJson);

                if (title == null || title.isBlank()
                        || summary == null || summary.isBlank()
                        || !diagramNode.isObject()
                        || !diagramNode.path("cards").isArray()
                        || diagramNode.path("cards").isEmpty()) {
                    log.error("AI response missed required visual note fields. Raw JSON: {}", cleanJson);
                    throw new ContentExtractionException("AI response missed required visual note fields");
                }

                String serializedDiagram = objectMapper.writeValueAsString(diagramNode);

                return new GeneratedNoteContent(
                        title.trim(),
                        summary.trim(),
                        serializedDiagram
                );
            } catch (ContentExtractionException e) {
                throw e;
            } catch (Exception e) {
                throw new ContentExtractionException("Failed to generate AI visual notes from Groq: " + e.getMessage(), e);
            }
        }

        private JsonNode resolveDiagramNode(JsonNode noteJson) {
            JsonNode diagramNode = noteJson.path("visualDiagram");
            if (diagramNode.isMissingNode() || diagramNode.isNull()) {
                diagramNode = noteJson.path("visualDiagramJson");
            }
            if (diagramNode.isMissingNode() || diagramNode.isNull()) {
                diagramNode = noteJson.path("diagram");
            }
            if ((diagramNode.isMissingNode() || diagramNode.isNull()) && noteJson.path("cards").isArray()) {
                diagramNode = noteJson;
            }
            if (diagramNode.isString()) {
                diagramNode = objectMapper.readTree(diagramNode.asString());
            }
            return diagramNode;
        }

        private String extractText(JsonNode node) {
            if (node == null || node.isMissingNode() || node.isNull()) {
                return null;
            }
            return node.isString() ? node.asString() : node.toString();
        }

        private String extractSummary(JsonNode summaryNode) {
            if (summaryNode == null || summaryNode.isMissingNode() || summaryNode.isNull()) {
                return null;
            }
            if (summaryNode.isString()) {
                return summaryNode.asString();
            }
            if (summaryNode.isArray()) {
                StringBuilder sb = new StringBuilder();
                for (JsonNode item : summaryNode) {
                    String line = extractSummary(item);
                    if (line != null && !line.isBlank()) {
                        if (!sb.isEmpty()) {
                            sb.append("\n");
                        }
                        String trimmed = line.trim();
                        sb.append(trimmed.startsWith("-") || trimmed.startsWith("*") ? trimmed : "- " + trimmed);
                    }
                }
                return sb.toString();
            }
            if (summaryNode.isObject()) {
                StringBuilder sb = new StringBuilder();
                for (Map.Entry<String, JsonNode> entry : summaryNode.properties()) {
                    String sectionBody = extractSummary(entry.getValue());
                    if (sectionBody != null && !sectionBody.isBlank()) {
                        if (!sb.isEmpty()) {
                            sb.append("\n\n");
                        }
                        sb.append("**").append(entry.getKey()).append("**\n").append(sectionBody.trim());
                    }
                }
                return sb.toString();
            }
            return summaryNode.toString();
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
                return BASE_SYSTEM_PROMPT.formatted(
                        "An exhaustive study guide organized under **CORE OVERVIEW**, **KEY MECHANISMS**, **STEP-BY-STEP BREAKDOWN**, and **REAL-WORLD EXAMPLE** with 8 to 12 detailed bullets.",
                        "Generate 8 to 11 cards, 6 to 10 labeled connections, and 3 stickyNotes covering sub-concepts, edge cases, and examples."
                );
            }
            return BASE_SYSTEM_PROMPT.formatted(
                    "Exactly 3 short one-line bullet points (under 12 words each) with no subheadings.",
                    "Generate only 3 to 4 high-level cards, 2 to 3 connections, and 1 stickyNote."
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
