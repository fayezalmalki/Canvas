import * as cheerio from "cheerio";
import type {
  CrawlResult,
  CrawlPageResult,
  OutgoingLink,
  PageSeoData,
  PagePerformance,
  I18nData,
  BrokenLink,
  RedirectChain,
  CrawlProgressEvent,
} from "@/types/canvas";
import { validateStructuredData } from "./schema-validator";
import { extractProducts } from "./ecommerce-extractor";

const BROWSER_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function detectBotProtection(html: string, status: number): string | null {
  const lower = html.toLowerCase();

  if (lower.includes("vercel security checkpoint")) return "Vercel Security Checkpoint";
  if (lower.includes("attention required! | cloudflare") || lower.includes("checking if the site connection is secure")) return "Cloudflare Challenge";
  if (lower.includes("just a moment...") && lower.includes("cloudflare")) return "Cloudflare Challenge";
  if (lower.includes("please verify you are a human")) return "Bot Verification";
  if (lower.includes("enable javascript and cookies to continue")) return "JavaScript Challenge";
  if (lower.includes("access denied") && status === 403) return "Access Denied";

  // Short body with 403 status
  if (status === 403) {
    const textLength = html.replace(/<[^>]*>/g, "").trim().length;
    if (textLength < 500) return "Access Denied";
  }

  return null;
}

/**
 * Capture a screenshot URL using microlink API.
 * Returns a URL string (not base64) or "" on failure.
 */
async function captureScreenshot(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    // Use microlink API without embed to get the screenshot URL
    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false`;
    const res = await fetch(apiUrl, {
      signal: controller.signal,
      headers: { "User-Agent": BROWSER_USER_AGENT },
    });
    clearTimeout(timeout);

    if (!res.ok) return "";

    const data = await res.json();
    const screenshotUrl = data?.data?.screenshot?.url;
    return screenshotUrl || "";
  } catch {
    return "";
  }
}

/**
 * Use OG image as fallback screenshot when microlink fails.
 */
function getOgImageFallback(ogImage: string | null): string {
  // OG images are already URLs, we'll store as-is (not base64) for efficiency
  if (ogImage && ogImage.startsWith("http")) return ogImage;
  return "";
}

interface CrawlOptions {
  maxDepth: number;
  maxPages: number;
  screenshots?: boolean;
  onProgress?: (event: CrawlProgressEvent) => void;
}

export async function crawlSite(
  startUrl: string,
  options: CrawlOptions = { maxDepth: 2, maxPages: 20 }
): Promise<CrawlResult> {
  const { maxDepth, maxPages, screenshots = true, onProgress } = options;
  const pages: CrawlPageResult[] = [];
  const visited = new Set<string>();
  const baseOrigin = new URL(startUrl).origin;
  const brokenLinks = new Map<string, BrokenLink>();
  const redirectChains: RedirectChain[] = [];

  // Queue: [url, depth, referrer]
  const queue: [string, number, string | null][] = [[normalizeUrl(startUrl), 0, null]];
  visited.add(normalizeUrl(startUrl));

  while (queue.length > 0 && pages.length < maxPages) {
    const [url, depth, referrer] = queue.shift()!;

    try {
      const startTime = Date.now();

      // Manual redirect tracking
      const { response: res, chain } = await fetchWithRedirectTracking(url);
      const responseTimeMs = Date.now() - startTime;

      if (chain.length > 1) {
        redirectChains.push({
          from: chain[0].url,
          to: chain[chain.length - 1].url,
          hops: chain.length - 1,
          statusCodes: chain.map((c) => c.status),
        });
      }

      // Track broken links (non-200 responses)
      if (res.status >= 400) {
        const key = res.url || url;
        if (!brokenLinks.has(key)) {
          brokenLinks.set(key, { url: key, statusCode: res.status, referringPages: [] });
        }
        if (referrer) {
          brokenLinks.get(key)!.referringPages.push(referrer);
        }
        continue;
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) continue;

      const html = await res.text();
      const htmlSizeBytes = new TextEncoder().encode(html).length;
      const $ = cheerio.load(html);
      const statusCode = res.status;

      // Check for bot protection
      const botProtection = detectBotProtection(html, statusCode);

      // Performance data
      const performance: PagePerformance = {
        responseTimeMs,
        htmlSizeBytes,
        hasCompression: !!res.headers.get("content-encoding"),
        cacheControl: res.headers.get("cache-control"),
        serverHeader: res.headers.get("server") || res.headers.get("x-powered-by"),
      };

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

      // i18n data
      const i18n: I18nData = extractI18nData($, html);

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

      // Structured data extraction
      const jsonLdScripts: string[] = [];
      $('script[type="application/ld+json"]').each((_, el) => {
        const content = $(el).html();
        if (content) jsonLdScripts.push(content);
      });
      const structuredData = jsonLdScripts.length > 0
        ? validateStructuredData(jsonLdScripts)
        : undefined;

      // Extract products BEFORE removing scripts (microdata/HTML patterns need full DOM)
      const products = extractProducts($, structuredData);

      // Body text
      $("script, style, noscript").remove();
      const bodyText = $("body").text().replace(/\s+/g, " ").trim();
      const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

      const seo: PageSeoData = {
        meta,
        headings,
        imageCount,
        imagesWithoutAlt,
        wordCount,
        internalLinkCount,
        externalLinkCount,
        hasStructuredData: jsonLdScripts.length > 0,
        structuredData,
        statusCode,
        performance,
        i18n,
      };

      // Capture screenshot (non-blocking — falls back to OG image or "")
      let screenshot = "";
      if (screenshots && !botProtection) {
        screenshot = await captureScreenshot(res.url || url);
        if (!screenshot) {
          screenshot = getOgImageFallback(seo.meta.ogImage);
        }
      }

      pages.push({
        url: res.url || url,
        title,
        screenshot,
        outgoingLinks: botProtection ? [] : links,
        seo,
        bodyText: botProtection ? "" : bodyText.slice(0, 3000),
        products: !botProtection && products.length > 0 ? products : undefined,
        botProtection: botProtection || undefined,
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
            queue.push([link.url, depth + 1, res.url || url]);
          }
        }
      }
    } catch (err: any) {
      // Track as broken if it's a fetch failure
      if (referrer) {
        const key = url;
        if (!brokenLinks.has(key)) {
          brokenLinks.set(key, { url: key, statusCode: 0, referringPages: [] });
        }
        brokenLinks.get(key)!.referringPages.push(referrer);
      }
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
    brokenLinks: [...brokenLinks.values()].filter((b) => b.referringPages.length > 0),
    redirectChains: redirectChains.filter((r) => r.hops > 0),
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
      const startTime = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            BROWSER_USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
      clearTimeout(timeout);
      const responseTimeMs = Date.now() - startTime;

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) continue;

      const html = await res.text();
      const htmlSizeBytes = new TextEncoder().encode(html).length;
      const $ = cheerio.load(html);
      const statusCode = res.status;
      const title = $("title").first().text().trim();

      // Check for bot protection
      const botProtection = detectBotProtection(html, statusCode);

      const performance: PagePerformance = {
        responseTimeMs,
        htmlSizeBytes,
        hasCompression: !!res.headers.get("content-encoding"),
        cacheControl: res.headers.get("cache-control"),
        serverHeader: res.headers.get("server") || res.headers.get("x-powered-by"),
      };

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

      const i18n: I18nData = extractI18nData($, html);

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

      const jsonLdScripts: string[] = [];
      $('script[type="application/ld+json"]').each((_, el) => {
        const content = $(el).html();
        if (content) jsonLdScripts.push(content);
      });
      const structuredData = jsonLdScripts.length > 0
        ? validateStructuredData(jsonLdScripts)
        : undefined;

      // Extract products BEFORE removing scripts
      const products = extractProducts($, structuredData);

      $("script, style, noscript").remove();
      const bodyText = $("body").text().replace(/\s+/g, " ").trim();
      const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

      const seo: PageSeoData = {
        meta,
        headings,
        imageCount,
        imagesWithoutAlt,
        wordCount,
        internalLinkCount,
        externalLinkCount,
        hasStructuredData: jsonLdScripts.length > 0,
        structuredData,
        statusCode,
        performance,
        i18n,
      };

      // Capture screenshot (non-blocking)
      let screenshot = "";
      if (!botProtection) {
        screenshot = await captureScreenshot(res.url || url);
        if (!screenshot) {
          screenshot = getOgImageFallback(seo.meta.ogImage);
        }
      }

      pages.push({
        url: res.url || url,
        title,
        screenshot,
        outgoingLinks: botProtection ? [] : links,
        seo,
        bodyText: botProtection ? "" : bodyText.slice(0, 3000),
        products: !botProtection && products.length > 0 ? products : undefined,
        botProtection: botProtection || undefined,
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

/**
 * Follow redirects manually to track the redirect chain.
 */
async function fetchWithRedirectTracking(
  url: string,
  maxRedirects = 10
): Promise<{
  response: Response;
  chain: { url: string; status: number }[];
}> {
  const chain: { url: string; status: number }[] = [];
  let currentUrl = url;

  for (let i = 0; i < maxRedirects; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(currentUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          BROWSER_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "manual",
    });
    clearTimeout(timeout);

    chain.push({ url: currentUrl, status: res.status });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) break;
      try {
        currentUrl = new URL(location, currentUrl).toString();
      } catch {
        break;
      }
    } else {
      return { response: res, chain };
    }
  }

  // Final fetch with redirect: follow as fallback
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const finalRes = await fetch(currentUrl, {
    signal: controller.signal,
    headers: {
      "User-Agent":
        BROWSER_USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });
  clearTimeout(timeout);

  return { response: finalRes, chain };
}

/**
 * Extract i18n/RTL data from the page.
 */
function extractI18nData($: cheerio.CheerioAPI, html: string): I18nData {
  const dir = $("html").attr("dir") || $("body").attr("dir") || null;

  const hreflangLinks: I18nData["hreflangLinks"] = [];
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const lang = $(el).attr("hreflang");
    const href = $(el).attr("href");
    if (lang && href) {
      hreflangLinks.push({ lang, url: href });
    }
  });

  // Detect Arabic content
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
  const latinRegex = /[A-Za-z]/g;
  const bodyText = $("body").text();
  const arabicChars = (bodyText.match(arabicRegex) || []).length;
  const latinChars = (bodyText.match(latinRegex) || []).length;
  const total = arabicChars + latinChars;
  const arabicRatio = total > 0 ? arabicChars / total : 0;

  return {
    dir,
    hreflangLinks,
    hasArabicContent: arabicRatio > 0.1,
    arabicRatio: Math.round(arabicRatio * 100) / 100,
  };
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
