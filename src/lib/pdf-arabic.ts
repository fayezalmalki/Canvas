import type { jsPDF } from "jspdf";
import { convertArabic } from "arabic-reshaper";
import bidiFactory from "bidi-js";
import {
  IBM_PLEX_SANS_ARABIC_REGULAR,
  IBM_PLEX_SANS_ARABIC_SEMIBOLD,
} from "@/lib/pdf-fonts";

const bidi = bidiFactory();

// IBM Plex Sans Arabic — covers Latin + Arabic, registered as one family so the
// whole PDF (English and Arabic) uses consistent typography.
export const PDF_FONT = "IBMPlexArabic";

const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

export function hasArabic(text: string): boolean {
  return ARABIC_RE.test(text);
}

/**
 * jsPDF does no OpenType shaping or bidi reordering. For Arabic to render
 * correctly we must (1) reshape letters into their connected presentation
 * forms, then (2) reorder to visual order so drawing left-to-right looks right.
 * Latin-only strings pass through untouched.
 */
export function shapeText(text: string): string {
  if (!text || !hasArabic(text)) return text;
  const reshaped = convertArabic(text);
  const embeddingLevels = bidi.getEmbeddingLevels(reshaped, "auto");
  return bidi.getReorderedString(reshaped, embeddingLevels);
}

export function registerPdfFonts(doc: jsPDF): void {
  doc.addFileToVFS("IBMPlexArabic-Regular.ttf", IBM_PLEX_SANS_ARABIC_REGULAR);
  doc.addFont("IBMPlexArabic-Regular.ttf", PDF_FONT, "normal");
  doc.addFileToVFS("IBMPlexArabic-SemiBold.ttf", IBM_PLEX_SANS_ARABIC_SEMIBOLD);
  doc.addFont("IBMPlexArabic-SemiBold.ttf", PDF_FONT, "bold");
  doc.setFont(PDF_FONT, "normal");
}
