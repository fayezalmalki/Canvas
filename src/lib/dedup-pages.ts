import type { CrawlPageResult } from "@/types/canvas";

/**
 * Normalize a URL for deduplication: strip trailing slashes, lowercase hostname.
 */
function normalizeKey(url: string): string {
  try {
    const u = new URL(url);
    u.pathname = u.pathname.replace(/\/+$/, "") || "/";
    u.hash = "";
    u.search = "";
    return u.origin.toLowerCase() + u.pathname;
  } catch {
    return url.replace(/\/+$/, "");
  }
}

/**
 * Deduplicate pages by normalized URL. Keeps the first occurrence.
 */
export function deduplicatePages(pages: CrawlPageResult[]): CrawlPageResult[] {
  const seen = new Set<string>();
  return pages.filter((p) => {
    const key = normalizeKey(p.url);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
