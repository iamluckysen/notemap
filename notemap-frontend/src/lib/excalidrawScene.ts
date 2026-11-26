import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { BinaryFiles } from "@excalidraw/excalidraw/types";
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";

export interface DiagramPaletteEntry {
  background: string;
  stroke: string;
}

/**
 * Vibrant but readable pastel pairs. Shape fills cycle through these so an
 * auto-generated diagram looks colorful without compromising text contrast.
 */
export const DIAGRAM_PALETTE: DiagramPaletteEntry[] = [
  { background: "#a5d8ff", stroke: "#1971c2" },
  { background: "#b2f2bb", stroke: "#2f9e44" },
  { background: "#ffec99", stroke: "#f08c00" },
  { background: "#d0bfff", stroke: "#6741d9" },
  { background: "#ffc9c9", stroke: "#e03131" },
];

const SHAPE_TYPES = new Set(["rectangle", "diamond", "ellipse"]);

/**
 * Applies the palette to every generated shape. Text, arrows, and lines are
 * left untouched so labels and connectors remain easy to read.
 */
export function styleDiagramElements(
  elements: readonly ExcalidrawElement[],
): ExcalidrawElement[] {
  let shapeIndex = 0;

  return elements.map((element) => {
    if (!SHAPE_TYPES.has(element.type)) {
      return element;
    }

    const palette = DIAGRAM_PALETTE[shapeIndex % DIAGRAM_PALETTE.length];
    shapeIndex += 1;

    return {
      ...element,
      backgroundColor: palette.background,
      strokeColor: palette.stroke,
      fillStyle: "solid",
      strokeStyle: "solid",
      opacity: 100,
    };
  });
}

export async function mermaidToScene(
  mermaidCode: string,
): Promise<{ elements: ExcalidrawElement[]; files: BinaryFiles | null }> {
  const { elements, files } = await parseMermaidToExcalidraw(mermaidCode, {
    themeVariables: { fontSize: "18px" },
  });

  const converted = convertToExcalidrawElements(elements);

  return {
    elements: styleDiagramElements(converted),
    files: files && Object.keys(files).length > 0 ? files : null,
  };
}

interface SavedScene {
  elements?: unknown;
  files?: unknown;
}

function isElementArray(value: unknown): value is ExcalidrawElement[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "type" in item &&
        "id" in item,
    )
  );
}

/**
 * Accepts both the `{ elements }` envelope we save and a raw elements array.
 * Returns null when the payload is missing, malformed, or empty so the caller
 * can fall back to generating a fresh Mermaid diagram.
 */
export function parseSavedScene(
  excalidrawJson: string | null,
): { elements: ExcalidrawElement[]; files: BinaryFiles | null } | null {
  if (!excalidrawJson) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(excalidrawJson);

    if (isElementArray(parsed)) {
      return { elements: parsed, files: null };
    }

    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const saved = parsed as SavedScene;
    if (!isElementArray(saved.elements)) {
      return null;
    }

    const files =
      typeof saved.files === "object" && saved.files !== null
        ? (saved.files as BinaryFiles)
        : null;

    return { elements: saved.elements, files };
  } catch {
    return null;
  }
}
