export interface PdfTextBlock {
  text: string;
  bullet: boolean;
  heading: boolean;
  blank: boolean;
}

function cleanInlineMarkdown(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/`{1,3}([^`]*)`{1,3}/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/, "")
    .replace(/\|/g, " · ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Converts a markdown summary into simple, PDF-friendly blocks. This keeps
 * bullets and headings legible without requiring a markdown-to-PDF renderer.
 */
export function markdownToPdfBlocks(markdown: string): PdfTextBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: PdfTextBlock[] = [];
  let inCodeFence = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (trimmed.startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }

    if (!trimmed) {
      blocks.push({ text: "", bullet: false, heading: false, blank: true });
      continue;
    }

    if (/^([-*_])\1{2,}$/.test(trimmed)) {
      continue;
    }

    if (inCodeFence) {
      blocks.push({
        text: rawLine.replace(/\s+$/g, ""),
        bullet: false,
        heading: false,
        blank: false,
      });
      continue;
    }

    const headingMatch = trimmed.match(/^#{1,6}\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        text: cleanInlineMarkdown(headingMatch[1]),
        bullet: false,
        heading: true,
        blank: false,
      });
      continue;
    }

    const bulletMatch = trimmed.match(/^(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (bulletMatch) {
      blocks.push({
        text: cleanInlineMarkdown(bulletMatch[1]),
        bullet: true,
        heading: false,
        blank: false,
      });
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      blocks.push({
        text: cleanInlineMarkdown(quoteMatch[1]),
        bullet: false,
        heading: false,
        blank: false,
      });
      continue;
    }

    const text = cleanInlineMarkdown(trimmed);
    if (text) {
      blocks.push({ text, bullet: false, heading: false, blank: false });
    }
  }

  while (blocks.length > 0 && blocks[0].blank) {
    blocks.shift();
  }
  while (blocks.length > 0 && blocks[blocks.length - 1].blank) {
    blocks.pop();
  }

  return blocks;
}

/**
 * jsPDF's built-in fonts use WinAnsi encoding. Normalise common typographic
 * characters and drop unsupported glyphs so exported PDFs stay readable.
 */
export function toPdfSafeText(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ")
    .replace(/[\u2022\u25cf]/g, "-")
    .replace(/[^\x20-\x7E\n]/g, "");
}
