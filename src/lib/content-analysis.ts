import type { CrawlPageResult } from "@/types/canvas";

export interface ThinPage {
  url: string;
  title: string;
  wordCount: number;
}

export interface DuplicateGroup {
  value: string;
  pages: { url: string; title: string }[];
}

export interface SimilarPair {
  urlA: string;
  urlB: string;
  titleA: string;
  titleB: string;
  similarity: number;
}

export interface ContentAnalysisResult {
  thinPages: ThinPage[];
  duplicateTitles: DuplicateGroup[];
  duplicateDescriptions: DuplicateGroup[];
  similarContent: SimilarPair[];
}

export function detectThinPages(pages: CrawlPageResult[], threshold = 100): ThinPage[] {
  return pages
    .filter((p) => p.seo.wordCount < threshold)
    .map((p) => ({ url: p.url, title: p.title, wordCount: p.seo.wordCount }))
    .sort((a, b) => a.wordCount - b.wordCount);
}

export function detectDuplicateTitles(pages: CrawlPageResult[]): DuplicateGroup[] {
  const groups = new Map<string, { url: string; title: string }[]>();
  for (const page of pages) {
    const key = page.title.trim().toLowerCase();
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ url: page.url, title: page.title });
  }
  return [...groups.entries()]
    .filter(([, v]) => v.length > 1)
    .map(([value, pages]) => ({ value, pages }));
}

export function detectDuplicateDescriptions(pages: CrawlPageResult[]): DuplicateGroup[] {
  const groups = new Map<string, { url: string; title: string }[]>();
  for (const page of pages) {
    const desc = page.seo.meta.description?.trim().toLowerCase();
    if (!desc) continue;
    if (!groups.has(desc)) groups.set(desc, []);
    groups.get(desc)!.push({ url: page.url, title: page.title });
  }
  return [...groups.entries()]
    .filter(([, v]) => v.length > 1)
    .map(([value, pages]) => ({ value, pages }));
}

/**
 * Detect similar content using word trigram Jaccard similarity.
 * Only compares pages with sufficient content (>50 words).
 */
export function detectSimilarContent(
  pages: CrawlPageResult[],
  threshold = 0.8
): SimilarPair[] {
  const contentPages = pages.filter((p) => p.seo.wordCount > 50);
  if (contentPages.length > 200) {
    // Too many pages for O(n^2) — skip to avoid perf issues
    return [];
  }

  const trigramSets = contentPages.map((p) => ({
    page: p,
    trigrams: buildTrigrams(p.bodyText),
  }));

  const pairs: SimilarPair[] = [];
  for (let i = 0; i < trigramSets.length; i++) {
    for (let j = i + 1; j < trigramSets.length; j++) {
      const sim = jaccardSimilarity(trigramSets[i].trigrams, trigramSets[j].trigrams);
      if (sim >= threshold) {
        pairs.push({
          urlA: trigramSets[i].page.url,
          urlB: trigramSets[j].page.url,
          titleA: trigramSets[i].page.title,
          titleB: trigramSets[j].page.title,
          similarity: Math.round(sim * 100),
        });
      }
    }
  }

  return pairs.sort((a, b) => b.similarity - a.similarity);
}

function buildTrigrams(text: string): Set<string> {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const trigrams = new Set<string>();
  for (let i = 0; i <= words.length - 3; i++) {
    trigrams.add(words.slice(i, i + 3).join(" "));
  }
  return trigrams;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function analyzeContent(pages: CrawlPageResult[]): ContentAnalysisResult {
  return {
    thinPages: detectThinPages(pages),
    duplicateTitles: detectDuplicateTitles(pages),
    duplicateDescriptions: detectDuplicateDescriptions(pages),
    similarContent: detectSimilarContent(pages),
  };
}
