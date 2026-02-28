/**
 * buildResumePdf.ts
 * Converts Claude's structured resume text into a clean, single-column PDF
 * using pdf-lib (pure JS, no native dependencies).
 *
 * Expected input format uses [SECTION] markers:
 *   [NAME], [CONTACT], [SUMMARY], [EXPERIENCE], [EDUCATION], [SKILLS]
 */

import { PDFDocument, PDFFont, PDFPage, RGB, StandardFonts, rgb } from "pdf-lib";

// ── Page constants ────────────────────────────────────────────────────────────
const PAGE_W = 612; // US Letter
const PAGE_H = 792;
const MARGIN_X = 58;
const MARGIN_Y = 54;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

// ── Font sizes ────────────────────────────────────────────────────────────────
const SZ_NAME = 22;
const SZ_SUBTITLE = 11;
const SZ_CONTACT = 8.5;
const SZ_SECTION_HDR = 9.5;
const SZ_BODY = 9.5;
const SZ_BULLET = 9;

// ── Colors (all values 0–1) ───────────────────────────────────────────────────
const C_BLACK = rgb(0.07, 0.07, 0.12);
const C_VIOLET = rgb(0.38, 0.18, 0.72);
const C_GRAY = rgb(0.42, 0.42, 0.47);
const C_RULE = rgb(0.83, 0.83, 0.87);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Replace characters outside WinAnsiEncoding (Latin-1) so pdf-lib's
 * standard Helvetica font doesn't throw on encode.
 */
function sanitize(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")  // smart single quotes
    .replace(/[\u201C\u201D]/g, '"')  // smart double quotes
    .replace(/\u2014/g, " - ")        // em dash
    .replace(/\u2013/g, "-")          // en dash
    .replace(/\u2022|\u00B7/g, "-")   // bullet / middle dot
    .replace(/\u2026/g, "...")        // ellipsis
    .replace(/\u2122/g, "(TM)")       // trademark
    .replace(/\u00AE/g, "(R)")        // registered
    .replace(/[^\x00-\xFF]/g, "");    // drop any remaining non-latin1
}

/** Break a string into lines that fit within maxWidth at the given font/size. */
function wrapWords(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const words = sanitize(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      // If a single word exceeds the width, still emit it (avoids infinite loop)
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Split the raw resume text into named sections by `[MARKER]` patterns. */
function parseSections(text: string): Array<{ key: string; content: string }> {
  const sections: Array<{ key: string; content: string }> = [];
  const regex = /\[([A-Z]+)\]/g;
  let match: RegExpExecArray | null;
  let prevKey = "";
  let prevEnd = 0;

  while ((match = regex.exec(text)) !== null) {
    if (prevKey) {
      sections.push({ key: prevKey, content: text.slice(prevEnd, match.index).trim() });
    }
    prevKey = match[1];
    prevEnd = match.index + match[0].length;
  }
  if (prevKey) {
    sections.push({ key: prevKey, content: text.slice(prevEnd).trim() });
  }
  return sections;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function buildResumePdf(tailoredText: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Mutable rendering state — helpers close over these via let bindings
  let page: PDFPage = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN_Y;

  /** Ensure at least `needed` vertical points remain; start a new page if not. */
  function needSpace(needed: number) {
    if (y - needed < MARGIN_Y) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN_Y;
    }
  }

  /**
   * Draw a single pre-wrapped line of text.
   * `y` represents the top of the line slot; baseline is placed at y - size.
   */
  function addLine(
    text: string,
    font: PDFFont,
    size: number,
    color: RGB,
    x = MARGIN_X,
    lineHeightMult = 1.5,
  ) {
    const lineH = size * lineHeightMult;
    needSpace(lineH);
    page.drawText(sanitize(text), { x, y: y - size, size, font, color });
    y -= lineH;
  }

  /** Word-wrap `text` and draw each resulting line. */
  function addWrapped(
    text: string,
    font: PDFFont,
    size: number,
    color: RGB,
    indent = 0,
    lineHeightMult = 1.55,
  ) {
    const maxW = CONTENT_W - indent;
    const lines = wrapWords(text, font, size, maxW);
    for (const line of lines) {
      addLine(line, font, size, color, MARGIN_X + indent, lineHeightMult);
    }
  }

  /** Draw a section header (bold label + full-width rule). */
  function addSectionHeader(label: string) {
    y -= 8; // breathing room above each section
    needSpace(SZ_SECTION_HDR + 10);
    page.drawText(label.toUpperCase(), {
      x: MARGIN_X,
      y: y - SZ_SECTION_HDR,
      size: SZ_SECTION_HDR,
      font: bold,
      color: C_VIOLET,
    });
    y -= SZ_SECTION_HDR + 4;
    // Horizontal rule
    page.drawLine({
      start: { x: MARGIN_X, y },
      end: { x: PAGE_W - MARGIN_X, y },
      thickness: 0.6,
      color: C_RULE,
    });
    y -= 7;
  }

  // ── Render sections ─────────────────────────────────────────────────────────
  const sections = parseSections(tailoredText);

  for (const { key, content } of sections) {
    const lines = content.split("\n").map((l) => l.trim());

    if (key === "NAME") {
      // Line 0: candidate's name (large bold)
      // Line 1 (optional): target job title
      const name = lines.find((l) => l.length > 0) ?? "";
      const title = lines.filter((l) => l.length > 0)[1] ?? "";
      if (name) addLine(name, bold, SZ_NAME, C_BLACK, MARGIN_X, 1.3);
      if (title) addLine(title, regular, SZ_SUBTITLE, C_GRAY, MARGIN_X, 1.4);
      y -= 2;

    } else if (key === "CONTACT") {
      // Single italic line, pipe-separated
      const contactLine = lines.filter((l) => l.length > 0).join(" | ");
      addWrapped(contactLine, italic, SZ_CONTACT, C_GRAY, 0, 1.5);
      y -= 4;

    } else if (key === "SUMMARY") {
      addSectionHeader("Summary");
      for (const line of lines) {
        if (!line) { y -= SZ_BODY * 0.4; continue; }
        addWrapped(line, regular, SZ_BODY, C_BLACK);
      }

    } else if (key === "EXPERIENCE") {
      addSectionHeader("Experience");
      for (const line of lines) {
        if (!line) { y -= SZ_BODY * 0.5; continue; }

        if (line.startsWith("-") || line.startsWith("*")) {
          // Bullet point
          const text = line.replace(/^[-*]\s*/, "");
          addWrapped(`- ${text}`, regular, SZ_BULLET, C_BLACK, 14, 1.5);
        } else {
          // Job title / company line — bold, with a small gap above
          y -= 5;
          addWrapped(line, bold, SZ_BODY, C_BLACK);
        }
      }

    } else if (key === "EDUCATION") {
      addSectionHeader("Education");
      for (const line of lines) {
        if (!line) { y -= SZ_BODY * 0.4; continue; }

        if (line.startsWith("-") || line.startsWith("*")) {
          const text = line.replace(/^[-*]\s*/, "");
          addWrapped(`- ${text}`, regular, SZ_BULLET, C_BLACK, 14, 1.5);
        } else {
          addWrapped(line, bold, SZ_BODY, C_BLACK);
        }
      }

    } else if (key === "SKILLS") {
      addSectionHeader("Skills");
      for (const line of lines) {
        if (!line) { y -= SZ_BODY * 0.3; continue; }
        // "Category: val, val" — bold the category label
        const colonIdx = line.indexOf(":");
        if (colonIdx !== -1) {
          const label = line.slice(0, colonIdx + 1);
          const rest = line.slice(colonIdx + 1).trim();
          // Draw label bold, then rest regular on the same base y
          needSpace(SZ_BODY * 1.55);
          const labelW = bold.widthOfTextAtSize(sanitize(label) + " ", SZ_BODY);
          page.drawText(sanitize(label), { x: MARGIN_X, y: y - SZ_BODY, size: SZ_BODY, font: bold, color: C_BLACK });
          // Wrap remaining text after the label
          const restLines = wrapWords(rest, regular, SZ_BODY, CONTENT_W - labelW);
          page.drawText(sanitize(restLines[0] ?? ""), { x: MARGIN_X + labelW, y: y - SZ_BODY, size: SZ_BODY, font: regular, color: C_BLACK });
          y -= SZ_BODY * 1.55;
          for (const extra of restLines.slice(1)) {
            addLine(extra, regular, SZ_BODY, C_BLACK);
          }
        } else {
          addWrapped(line, regular, SZ_BODY, C_BLACK);
        }
        y -= 1;
      }

    } else {
      // Fallback for any unrecognised section
      addSectionHeader(key);
      for (const line of lines) {
        if (!line) { y -= SZ_BODY * 0.4; continue; }
        addWrapped(line, regular, SZ_BODY, C_BLACK);
      }
    }
  }

  return doc.save();
}
