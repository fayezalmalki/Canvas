import type { CrawlResult } from "@/types/canvas";

const store = new Map<string, CrawlResult>();

export function setCrawlResult(rootUrl: string, result: CrawlResult) {
  store.set(rootUrl, result);
}

export function getCrawlResult(rootUrl: string): CrawlResult | null {
  return store.get(rootUrl) ?? null;
}

export function hasCrawlResult(rootUrl: string): boolean {
  return store.has(rootUrl);
}
