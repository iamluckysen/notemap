import { exportToBlob } from "@excalidraw/excalidraw";
import type {
  ExcalidrawElement,
  NonDeleted,
} from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import { jsPDF } from "jspdf";
import { markdownToPdfBlocks, toPdfSafeText } from "./markdown";
import { formatNoteDate, slugify } from "./utils";

export interface PdfExportInput {
  title: string;
  summary: string;
  createdAt: string;
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
}

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_RESERVE = 14;
const PAGE_BOTTOM = PAGE_HEIGHT - MARGIN - FOOTER_RESERVE;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read the exported diagram image."));
      }
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Could not read the exported image."));
    reader.readAsDataURL(blob);
  });
}

export async function exportNoteToPdf(input: PdfExportInput): Promise<string> {
  if (input.elements.length === 0) {
    throw new Error(
      "The diagram is empty. Add a shape or reset the diagram before exporting.",
    );
  }

  const pngBlob = await exportToBlob({
    elements: input.elements as readonly NonDeleted<ExcalidrawElement>[],
    appState: {
      ...input.appState,
      exportBackground: true,
      exportWithDarkMode: false,
      viewBackgroundColor: "#ffffff",
    },
    files: input.files,
    mimeType: "image/png",
    exportPadding: 32,
    // Render at 2x for crisp text and lines when printed.
    getDimensions: (width: number, height: number) => ({
      width: Math.max(1, Math.round(width * 2)),
      height: Math.max(1, Math.round(height * 2)),
      scale: 2,
    }),
  });

  const dataUrl = await blobToDataUrl(pngBlob);
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const safeTitle = toPdfSafeText(input.title.trim() || "Untitled note");
  doc.setProperties({
    title: safeTitle,
    subject: "NoteMap study note",
    creator: "NoteMap",
  });

  const addPage = () => {
    doc.addPage();
    return MARGIN + 4;
  };

  // Top brand bar.
  doc.setFillColor(91, 62, 230);
  doc.rect(0, 0, PAGE_WIDTH, 3.5, "F");

  let y = MARGIN + 3;

  doc.setTextColor(23, 22, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  const titleLines = doc.splitTextToSize(safeTitle, CONTENT_WIDTH) as string[];
  for (const line of titleLines) {
    if (y + 9 > PAGE_BOTTOM) {
      y = addPage();
    }
    doc.text(line, MARGIN, y);
    y += 8.2;
  }

  y += 1;
  doc.setDrawColor(91, 62, 230);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y, MARGIN + 26, y);
  y += 6.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(128, 123, 113);
  doc.text(
    `NoteMap  ·  AI study note  ·  ${formatNoteDate(input.createdAt)}`,
    MARGIN,
    y,
  );
  y += 11;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(91, 62, 230);
  doc.text("STUDY SUMMARY", MARGIN, y);
  y += 5.5;

  const blocks = markdownToPdfBlocks(input.summary);
  if (blocks.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10.5);
    doc.setTextColor(120, 116, 108);
    doc.text("No summary has been written for this note yet.", MARGIN, y);
    y += 8;
  }

  for (const block of blocks) {
    if (block.blank) {
      y += 2.4;
      continue;
    }

    if (block.heading) {
      y += 1.5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30, 28, 25);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.2);
      doc.setTextColor(58, 54, 49);
    }

    const lineHeight = block.heading ? 5.4 : 4.8;
    const text = toPdfSafeText(block.text);
    if (!text) {
      continue;
    }

    if (block.bullet) {
      const wrapped = doc.splitTextToSize(
        text,
        CONTENT_WIDTH - 6,
      ) as string[];
      wrapped.forEach((line, index) => {
        if (y + lineHeight > PAGE_BOTTOM) {
          y = addPage();
        }
        if (index === 0) {
          doc.text("-", MARGIN + 1, y);
        }
        doc.text(line, MARGIN + 6, y);
        y += lineHeight;
      });
    } else {
      const wrapped = doc.splitTextToSize(text, CONTENT_WIDTH) as string[];
      for (const line of wrapped) {
        if (y + lineHeight > PAGE_BOTTOM) {
          y = addPage();
        }
        doc.text(line, MARGIN, y);
        y += lineHeight;
      }
    }

    y += block.heading ? 1.6 : 0.8;
  }

  // Diagram section. Keep enough room for a meaningful rendering; if the
  // summary filled the page, continue on a fresh one.
  y += 3;
  if (y + 95 > PAGE_BOTTOM) {
    y = addPage();
  }

  doc.setDrawColor(222, 217, 204);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(91, 62, 230);
  doc.text("DIAGRAM", MARGIN, y);
  y += 4.5;

  const image = doc.getImageProperties(dataUrl);
  const availableHeight = Math.max(40, PAGE_BOTTOM - y);
  const scale = Math.min(CONTENT_WIDTH / image.width, availableHeight / image.height);
  const renderWidth = image.width * scale;
  const renderHeight = image.height * scale;
  const imageX = MARGIN + (CONTENT_WIDTH - renderWidth) / 2;

  doc.addImage(dataUrl, "PNG", imageX, y, renderWidth, renderHeight);
  y += renderHeight + 6;

  // Footers.
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(158, 153, 143);
    doc.text("Generated with NoteMap", MARGIN, PAGE_HEIGHT - 9);
    doc.text(
      `${page} / ${pageCount}`,
      PAGE_WIDTH - MARGIN,
      PAGE_HEIGHT - 9,
      { align: "right" },
    );
  }

  const filename = `${slugify(input.title)}.pdf`;
  doc.save(filename);
  return filename;
}
