import type { RobotsSitemapResult } from "@/types/canvas";

export async function analyzeRobotsSitemap(
  rootUrl: string,
  crawledUrls: string[]
): Promise<RobotsSitemapResult> {
  const origin = new URL(rootUrl).origin;
  const robotsResult = await fetchRobotsTxt(origin);
  const sitemapResult = await fetchSitemap(origin, robotsResult.sitemapUrls);

  // Cross-reference
  const crawledSet = new Set(crawledUrls.map((u) => normalizeForComparison(u)));
  const sitemapSet = new Set(sitemapResult.urls.map((u) => normalizeForComparison(u.loc)));

  const inSitemapNotCrawled = sitemapResult.urls
    .filter((u) => !crawledSet.has(normalizeForComparison(u.loc)))
    .map((u) => u.loc)
    .slice(0, 50);

  const crawledNotInSitemap = crawledUrls
    .filter((u) => !sitemapSet.has(normalizeForComparison(u)))
    .slice(0, 50);

  return {
    robotsTxt: {
      found: robotsResult.found,
      sitemapUrls: robotsResult.sitemapUrls,
      blockedPaths: robotsResult.blockedPaths,
      issues: robotsResult.issues,
    },
    sitemap: {
      found: sitemapResult.found,
      urls: sitemapResult.urls.slice(0, 500),
      issues: sitemapResult.issues,
    },
    coverage: {
      inSitemapNotCrawled,
      crawledNotInSitemap,
    },
  };
}

async function fetchRobotsTxt(origin: string): Promise<{
  found: boolean;
  sitemapUrls: string[];
  blockedPaths: string[];
  issues: string[];
}> {
  const issues: string[] = [];
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "SiteAnalyzer/1.0" },
    });

    if (!res.ok) {
      return { found: false, sitemapUrls: [], blockedPaths: [], issues: ["robots.txt not found (HTTP " + res.status + ")"] };
    }

    const text = await res.text();
    const sitemapUrls: string[] = [];
    const blockedPaths: string[] = [];

    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().startsWith("sitemap:")) {
        sitemapUrls.push(trimmed.slice(8).trim());
      }
      if (trimmed.toLowerCase().startsWith("disallow:")) {
        const path = trimmed.slice(9).trim();
        if (path) blockedPaths.push(path);
      }
    }

    if (blockedPaths.includes("/")) {
      issues.push("robots.txt blocks all crawlers (Disallow: /)");
    }

    if (sitemapUrls.length === 0) {
      issues.push("No sitemap URL declared in robots.txt");
    }

    return { found: true, sitemapUrls, blockedPaths, issues };
  } catch {
    return { found: false, sitemapUrls: [], blockedPaths: [], issues: ["Could not fetch robots.txt"] };
  }
}

async function fetchSitemap(
  origin: string,
  declaredUrls: string[]
): Promise<{
  found: boolean;
  urls: { loc: string; lastmod?: string }[];
  issues: string[];
}> {
  const issues: string[] = [];
  const candidates = declaredUrls.length > 0
    ? declaredUrls
    : [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`];

  for (const sitemapUrl of candidates) {
    try {
      const res = await fetch(sitemapUrl, {
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "SiteAnalyzer/1.0" },
      });

      if (!res.ok) continue;

      const text = await res.text();
      if (!text.includes("<urlset") && !text.includes("<sitemapindex")) {
        issues.push(`${sitemapUrl} does not appear to be valid XML sitemap`);
        continue;
      }

      const urls = parseSitemapUrls(text);
      if (urls.length === 0 && text.includes("<sitemapindex")) {
        // It's a sitemap index — try to fetch child sitemaps
        const childUrls = parseSitemapIndexUrls(text);
        const allUrls: { loc: string; lastmod?: string }[] = [];
        for (const childUrl of childUrls.slice(0, 5)) {
          try {
            const childRes = await fetch(childUrl, {
              signal: AbortSignal.timeout(10000),
              headers: { "User-Agent": "SiteAnalyzer/1.0" },
            });
            if (childRes.ok) {
              const childText = await childRes.text();
              allUrls.push(...parseSitemapUrls(childText));
            }
          } catch {
            // skip failed child sitemaps
          }
        }
        return { found: true, urls: allUrls, issues };
      }

      return { found: true, urls, issues };
    } catch {
      // try next candidate
    }
  }

  issues.push("No sitemap.xml found");
  return { found: false, urls: [], issues };
}

function parseSitemapUrls(xml: string): { loc: string; lastmod?: string }[] {
  const urls: { loc: string; lastmod?: string }[] = [];
  const locRegex = /<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g;
  let match;
  while ((match = locRegex.exec(xml)) !== null) {
    urls.push({ loc: match[1].trim(), lastmod: match[2]?.trim() });
  }
  // Fallback: simpler regex if no matches
  if (urls.length === 0) {
    const simpleLoc = /<loc>([^<]+)<\/loc>/g;
    while ((match = simpleLoc.exec(xml)) !== null) {
      urls.push({ loc: match[1].trim() });
    }
  }
  return urls;
}

function parseSitemapIndexUrls(xml: string): string[] {
  const urls: string[] = [];
  const locRegex = /<sitemap>\s*<loc>([^<]+)<\/loc>/g;
  let match;
  while ((match = locRegex.exec(xml)) !== null) {
    urls.push(match[1].trim());
  }
  return urls;
}

function normalizeForComparison(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    u.search = "";
    u.pathname = u.pathname.replace(/\/+$/, "") || "/";
    return u.origin.toLowerCase() + u.pathname;
  } catch {
    return url.replace(/\/+$/, "");
  }
}
