import * as cheerio from "cheerio";
import type {
  CrawlResult,
  CrawlPageResult,
  OutgoingLink,
  PageSeoData,
  CrawlProgressEvent,
} from "@/types/canvas";

interface CrawlOptions {
  maxDepth: number;
  maxPages: number;
  onProgress?: (event: CrawlProgressEvent) => void;
}

export async function crawlSite(
  startUrl: string,
  options: CrawlOptions = { maxDepth: 2, maxPages: 20 }
): Promise<CrawlResult> {
  const { maxDepth, maxPages, onProgress } = options;
  const pages: CrawlPageResult[] = [];
  const visited = new Set<string>();
  const baseOrigin = new URL(startUrl).origin;

  // Queue: [url, depth]
  const queue: [string, number][] = [[normalizeUrl(startUrl), 0]];
  visited.add(normalizeUrl(startUrl));

  while (queue.length > 0 && pages.length < maxPages) {
    const [url, depth] = queue.shift()!;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; SiteAnalyzer/1.0; +https://github.com/fayezalmalki/Canvas)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
      clearTimeout(timeout);

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) continue;

      const html = await res.text();
      const $ = cheerio.load(html);
      const statusCode = res.status;

      // Title
      const title = $("title").first().text().trim();

      // Extract links
      const links: OutgoingLink[] = [];
      const seen = new Set<string>();
      let internalLinkCount = 0;
      let externalLinkCount = 0;

      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        try {
          const resolved = new URL(href, url);
          if (resolved.origin === baseOrigin) {
            internalLinkCount++;
          } else {
            externalLinkCount++;
          }
          // Only collect internal links for crawling
          if (resolved.origin !== baseOrigin) return;
          resolved.hash = "";
          const normalized = normalizeUrl(resolved.toString());
          if (seen.has(normalized)) return;
          seen.add(normalized);

          let context: OutgoingLink["context"] = "other";
          const parent = $(el).closest("nav, header, footer, main, article, section");
          if (parent.length) {
            const tag = parent.prop("tagName")?.toLowerCase();
            if (tag === "nav") context = "nav";
            else if (tag === "header") context = "header";
            else if (tag === "footer") context = "footer";
            else context = "main";
          }

          links.push({
            url: normalized,
            anchorText: $(el).text().trim().slice(0, 100),
            context,
          });
        } catch {
          // skip invalid URLs
        }
      });

      // Meta tags
      const getMeta = (name: string): string | null => {
        const el =
          $(`meta[name="${name}"]`).attr("content") ||
          $(`meta[property="${name}"]`).attr("content");
        return el || null;
      };

      const canonical =
        $('link[rel="canonical"]').attr("href") || null;

      const meta = {
        description: getMeta("description"),
        keywords: getMeta("keywords"),
        canonical,
        ogTitle: getMeta("og:title"),
        ogDescription: getMeta("og:description"),
        ogImage: getMeta("og:image"),
        robots: getMeta("robots"),
        viewport: getMeta("viewport"),
        language: $("html").attr("lang") || null,
      };

      // Headings
      const headings: PageSeoData["headings"] = [];
      $("h1, h2, h3, h4, h5, h6").each((_, el) => {
        headings.push({
          tag: $(el).prop("tagName")!.toLowerCase() as any,
          text: $(el).text().trim().slice(0, 200),
        });
      });

      // Images
      const images = $("img");
      const imageCount = images.length;
      let imagesWithoutAlt = 0;
      images.each((_, el) => {
        if (!$(el).attr("alt")?.trim()) imagesWithoutAlt++;
      });

      // Body text
      $("script, style, noscript").remove();
      const bodyText = $("body").text().replace(/\s+/g, " ").trim();
      const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

      // Structured data
      const hasStructuredData =
        $('script[type="application/ld+json"]').length > 0;

      const seo: PageSeoData = {
        meta,
        headings,
        imageCount,
        imagesWithoutAlt,
        wordCount,
        internalLinkCount,
        externalLinkCount,
        hasStructuredData,
        statusCode,
      };

      pages.push({
        url: res.url || url,
        title,
        screenshot: "", // no screenshots in serverless mode
        outgoingLinks: links,
        seo,
        bodyText: bodyText.slice(0, 3000),
      });

      onProgress?.({
        type: "page_crawled",
        url: res.url || url,
        title,
        index: pages.length,
        total: maxPages,
        discovered: visited.size + queue.length,
      });

      // Enqueue discovered links
      if (depth < maxDepth) {
        for (const link of links) {
          if (!visited.has(link.url) && visited.size < maxPages * 2) {
            visited.add(link.url);
            queue.push([link.url, depth + 1]);
          }
        }
      }
    } catch (err: any) {
      // Skip pages that fail to fetch (timeout, DNS errors, etc.)
      console.warn(`Failed to crawl ${url}: ${err.message}`);
    }
  }

  // Collect discovered but uncrawled URLs
  const crawledUrls = new Set(pages.map((p) => p.url));
  const discoveredUrls = [...visited, ...queue.map(([u]) => u)]
    .filter((u) => !crawledUrls.has(u));

  const result: CrawlResult = {
    pages,
    rootUrl: startUrl,
    discoveredUrls,
  };
  onProgress?.({ type: "complete", result });
  return result;
}

/**
 * Crawl a specific list of URLs (for "continue crawl" of previously discovered pages).
 */
export async function crawlSpecificUrls(
  rootUrl: string,
  urls: string[],
  options: { onProgress?: (event: CrawlProgressEvent) => void }
): Promise<CrawlResult> {
  const { onProgress } = options;
  const pages: CrawlPageResult[] = [];
  const baseOrigin = new URL(rootUrl).origin;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; SiteAnalyzer/1.0; +https://github.com/fayezalmalki/Canvas)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
      clearTimeout(timeout);

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) continue;

      const html = await res.text();
      const $ = cheerio.load(html);
      const statusCode = res.status;
      const title = $("title").first().text().trim();

      const links: OutgoingLink[] = [];
      const seen = new Set<string>();
      let internalLinkCount = 0;
      let externalLinkCount = 0;

      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        try {
          const resolved = new URL(href, url);
          if (resolved.origin === baseOrigin) {
            internalLinkCount++;
          } else {
            externalLinkCount++;
          }
          if (resolved.origin !== baseOrigin) return;
          resolved.hash = "";
          const normalized = normalizeUrl(resolved.toString());
          if (seen.has(normalized)) return;
          seen.add(normalized);

          let context: OutgoingLink["context"] = "other";
          const parent = $(el).closest("nav, header, footer, main, article, section");
          if (parent.length) {
            const tag = parent.prop("tagName")?.toLowerCase();
            if (tag === "nav") context = "nav";
            else if (tag === "header") context = "header";
            else if (tag === "footer") context = "footer";
            else context = "main";
          }

          links.push({
            url: normalized,
            anchorText: $(el).text().trim().slice(0, 100),
            context,
          });
        } catch {
          // skip
        }
      });

      const getMeta = (name: string): string | null => {
        const el =
          $(`meta[name="${name}"]`).attr("content") ||
          $(`meta[property="${name}"]`).attr("content");
        return el || null;
      };

      const canonical = $('link[rel="canonical"]').attr("href") || null;

      const meta = {
        description: getMeta("description"),
        keywords: getMeta("keywords"),
        canonical,
        ogTitle: getMeta("og:title"),
        ogDescription: getMeta("og:description"),
        ogImage: getMeta("og:image"),
        robots: getMeta("robots"),
        viewport: getMeta("viewport"),
        language: $("html").attr("lang") || null,
      };

      const headings: PageSeoData["headings"] = [];
      $("h1, h2, h3, h4, h5, h6").each((_, el) => {
        headings.push({
          tag: $(el).prop("tagName")!.toLowerCase() as any,
          text: $(el).text().trim().slice(0, 200),
        });
      });

      const images = $("img");
      const imageCount = images.length;
      let imagesWithoutAlt = 0;
      images.each((_, el) => {
        if (!$(el).attr("alt")?.trim()) imagesWithoutAlt++;
      });

      $("script, style, noscript").remove();
      const bodyText = $("body").text().replace(/\s+/g, " ").trim();
      const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
      const hasStructuredData = $('script[type="application/ld+json"]').length > 0;

      const seo: PageSeoData = {
        meta,
        headings,
        imageCount,
        imagesWithoutAlt,
        wordCount,
        internalLinkCount,
        externalLinkCount,
        hasStructuredData,
        statusCode,
      };

      pages.push({
        url: res.url || url,
        title,
        screenshot: "",
        outgoingLinks: links,
        seo,
        bodyText: bodyText.slice(0, 3000),
      });

      onProgress?.({
        type: "page_crawled",
        url: res.url || url,
        title,
        index: pages.length,
        total: urls.length,
      });
    } catch (err: any) {
      console.warn(`Failed to crawl ${url}: ${err.message}`);
    }
  }

  const result: CrawlResult = {
    pages,
    rootUrl,
    discoveredUrls: [],
  };
  onProgress?.({ type: "complete", result });
  return result;
}

function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    u.pathname = u.pathname.replace(/\/+$/, "") || "/";
    return u.toString();
  } catch {
    return raw;
  }
}
