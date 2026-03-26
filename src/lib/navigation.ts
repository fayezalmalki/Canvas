/**
 * Build a URL for a site page using the crawl ID.
 * pagePath should be the pathname from the URL (e.g., "/about", "/products/shoes").
 * Returns the app route path.
 */
export function siteUrl(crawlId: string, pagePath?: string): string {
  if (!pagePath || pagePath === "/") return `/site/${crawlId}`;
  const cleaned = pagePath.startsWith("/") ? pagePath.slice(1) : pagePath;
  return `/site/${crawlId}/${cleaned}`;
}

/**
 * Build a URL for the root page detail view.
 */
export function siteRootPageUrl(crawlId: string): string {
  return `/site/${crawlId}/_root`;
}

/**
 * Build a URL for the analysis page.
 */
export function siteAnalysisUrl(crawlId: string, pagePath: string): string {
  const cleaned = pagePath.startsWith("/") ? pagePath.slice(1) : pagePath;
  return `/site/${crawlId}/analysis/${cleaned || "_root"}`;
}

/**
 * Given a full page URL, extract the pathname and build a navigation URL.
 */
export function sitePageUrl(crawlId: string, fullPageUrl: string): string {
  try {
    const parsed = new URL(fullPageUrl);
    const pagePath = parsed.pathname === "/" ? "" : parsed.pathname;
    if (pagePath) {
      return `/site/${crawlId}/${pagePath.slice(1)}`;
    }
    return siteRootPageUrl(crawlId);
  } catch {
    return `/site/${crawlId}`;
  }
}
