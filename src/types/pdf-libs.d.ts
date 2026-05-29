declare module "arabic-reshaper" {
  export function convertArabic(text: string): string;
  export function convertArabicBack(text: string): string;
}

declare module "bidi-js" {
  interface EmbeddingLevels {
    levels: Uint8Array;
    paragraphs: Array<{ start: number; end: number; level: number }>;
  }
  interface Bidi {
    getEmbeddingLevels(text: string, baseDirection?: "ltr" | "rtl" | "auto"): EmbeddingLevels;
    getReorderedString(text: string, embeddingLevels: EmbeddingLevels, start?: number, end?: number): string;
    getReorderedIndices(text: string, embeddingLevels: EmbeddingLevels, start?: number, end?: number): number[];
    getReorderSegments(text: string, embeddingLevels: EmbeddingLevels, start?: number, end?: number): Array<[number, number]>;
  }
  export default function bidiFactory(): Bidi;
}
