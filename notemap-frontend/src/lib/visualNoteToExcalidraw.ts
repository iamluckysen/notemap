import { convertToExcalidrawElements } from "@excalidraw/excalidraw";

type ElementSkeletons = Parameters<typeof convertToExcalidrawElements>[0];
type ExcalidrawElements = ReturnType<typeof convertToExcalidrawElements>;
type AllowedShape = "rectangle" | "diamond" | "ellipse";

export interface VisualDiagramSpec {
  layoutType: "mindmap" | "comparison" | "process" | "architecture";
  centerTitle: string;
  cards: {
    id: string;
    heading: string;
    body: string;
    color?: "blue" | "green" | "purple" | "orange" | "pink" | string;
    shape?: "rectangle" | "diamond" | "ellipse" | string;
  }[];
  connections?: {
    from: string;
    to: string;
    label?: string;
  }[];
  stickyNotes?: {
    title: string;
    text: string;
  }[];
}

interface CardBox {
  x: number;
  y: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
}

const COLOR_MAP: Record<string, { fill: string; stroke: string }> = {
  blue: { fill: "#d0ebff", stroke: "#1971c2" },
  green: { fill: "#d3f9d8", stroke: "#2f9e44" },
  purple: { fill: "#e5dbff", stroke: "#6741d9" },
  orange: { fill: "#ffe8cc", stroke: "#d9480f" },
  pink: { fill: "#ffdeeb", stroke: "#c2255c" },
};

function getTheme(color?: string) {
  if (!color) return COLOR_MAP.blue;
  return COLOR_MAP[color.toLowerCase().trim()] || COLOR_MAP.blue;
}

function normalizeShape(shape?: string): AllowedShape {
  if (!shape) return "rectangle";
  const lower = shape.toLowerCase().trim();
  if (lower === "diamond") return "diamond";
  if (lower === "ellipse" || lower === "circle") return "ellipse";
  return "rectangle";
}

export function sanitizeExcalidrawElements<T extends { type?: string }>(elements: T[]): T[] {
  if (!Array.isArray(elements)) return [];
  return elements.map((el) =>
    el && el.type === "note" ? { ...el, type: "rectangle" } : el
  );
}

function computeArrowGeometry(from: CardBox, to: CardBox) {
  const dx = to.cx - from.cx;
  const dy = to.cy - from.cy;

  if (dx === 0 && dy === 0) {
    return null;
  }

  const fromScaleX = dx !== 0 ? (from.width / 2) / Math.abs(dx) : Infinity;
  const fromScaleY = dy !== 0 ? (from.height / 2) / Math.abs(dy) : Infinity;
  const tFrom = Math.min(fromScaleX, fromScaleY);

  const toScaleX = dx !== 0 ? (to.width / 2) / Math.abs(dx) : Infinity;
  const toScaleY = dy !== 0 ? (to.height / 2) / Math.abs(dy) : Infinity;
  const tTo = Math.min(toScaleX, toScaleY);

  const startX = Math.round(from.cx + dx * tFrom);
  const startY = Math.round(from.cy + dy * tFrom);
  const endX = Math.round(to.cx - dx * tTo);
  const endY = Math.round(to.cy - dy * tTo);
  const relX = endX - startX;
  const relY = endY - startY;

  return {
    x: startX,
    y: startY,
    width: Math.abs(relX) || 1,
    height: Math.abs(relY) || 1,
    points: [
      [0, 0],
      [relX, relY],
    ] as [number, number][],
  };
}

export function buildExcalidrawVisualNote(spec: VisualDiagramSpec): ExcalidrawElements {
  const skeletons: ElementSkeletons = [];
  const cardBoxes = new Map<string, CardBox>();
  const cards = spec.cards || [];

  // 1. Top Title Banner
  skeletons.push({
    type: "rectangle",
    id: "banner-title",
    x: 160,
    y: 24,
    width: 760,
    height: 64,
    backgroundColor: "#fff3bf",
    strokeColor: "#f08c00",
    fillStyle: "solid",
    strokeStyle: "solid",
    roughness: 1,
    roundness: { type: 3 },
    label: {
      text: spec.centerTitle || "Visual Study Board",
      fontSize: 22,
      fontFamily: 1,
    },
  });

  const cardWidth = 250;
  const cardHeight = 130;

  const registerCard = (
    card: VisualDiagramSpec["cards"][number],
    x: number,
    y: number,
    width = cardWidth,
    height = cardHeight
  ) => {
    const theme = getTheme(card.color);
    cardBoxes.set(card.id, {
      x,
      y,
      width,
      height,
      cx: x + width / 2,
      cy: y + height / 2,
    });

    skeletons.push({
      type: normalizeShape(card.shape),
      id: card.id,
      x,
      y,
      width,
      height,
      backgroundColor: theme.fill,
      strokeColor: theme.stroke,
      fillStyle: "solid",
      strokeStyle: "solid",
      roughness: 1,
      roundness: { type: 3 },
      label: {
        text: `${card.heading}\n\n${card.body}`,
        fontSize: 14,
        fontFamily: 1,
      },
    });
  };

  // 2. Layout-Aware Card Placement
  if (spec.layoutType === "mindmap" && cards.length > 0) {
    const hubX = 415;
    const hubY = 410;
    registerCard(cards[0], hubX, hubY);

    const outerCards = cards.slice(1);
    outerCards.forEach((card, idx) => {
      const angle = (idx / outerCards.length) * 2 * Math.PI - Math.PI / 2;
      const cardX = Math.round(hubX + 365 * Math.cos(angle));
      const cardY = Math.round(hubY + 250 * Math.sin(angle));
      registerCard(card, cardX, cardY);
    });
  } else if (spec.layoutType === "comparison") {
    const leftX = 120;
    const rightX = 540;
    const startY = 140;

    cards.forEach((card, idx) => {
      const x = idx % 2 === 0 ? leftX : rightX;
      const y = startY + Math.floor(idx / 2) * (cardHeight + 90);
      registerCard(card, x, y, 290, cardHeight);
    });
  } else {
    const columns = 3;
    const gapX = 95;
    const gapY = 95;
    const startX = 60;
    const startY = 145;

    cards.forEach((card, idx) => {
      const col = idx % columns;
      const row = Math.floor(idx / columns);
      const x = startX + col * (cardWidth + gapX);
      const y = startY + row * (cardHeight + gapY);
      registerCard(card, x, y);
    });
  }

  // 3. Border-to-Border Arrows (no start/end overrides)
  (spec.connections || []).forEach((conn, idx) => {
    if (!conn.from || !conn.to || conn.from === conn.to) return;
    const fromBox = cardBoxes.get(conn.from);
    const toBox = cardBoxes.get(conn.to);
    if (!fromBox || !toBox) return;

    const geom = computeArrowGeometry(fromBox, toBox);
    if (!geom) return;

    skeletons.push({
      type: "arrow",
      id: `conn-${conn.from}-${conn.to}-${idx}`,
      x: geom.x,
      y: geom.y,
      width: geom.width,
      height: geom.height,
      points: geom.points,
      strokeColor: "#495057",
      strokeWidth: 2,
      roughness: 1,
      label: conn.label
        ? {
            text: conn.label,
            fontSize: 12,
            fontFamily: 1,
          }
        : undefined,
    });
  });

  // 4. Yellow Sticky Notes on the Right Margin
  (spec.stickyNotes || []).forEach((note, idx) => {
    skeletons.push({
      type: "rectangle",
      id: `sticky-${idx}`,
      x: 1135,
      y: 145 + idx * 185,
      width: 235,
      height: 150,
      backgroundColor: "#fff9db",
      strokeColor: "#fcc419",
      fillStyle: "solid",
      strokeStyle: "solid",
      roughness: 1,
      roundness: { type: 3 },
      label: {
        text: `📌 ${note.title}\n\n${note.text}`,
        fontSize: 14,
        fontFamily: 1,
      },
    });
  });

  return sanitizeExcalidrawElements(
    convertToExcalidrawElements(skeletons, { regenerateIds: false })
  );
}