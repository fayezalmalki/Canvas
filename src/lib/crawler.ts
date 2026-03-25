import { PlaywrightCrawler, type PlaywrightCrawlingContext } from "@crawlee/playwright";
import type { CrawlResult, CrawlPageResult, OutgoingLink, PageSeoData, CrawlProgressEvent } from "@/types/canvas";

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
  const baseOrigin = new URL(startUrl).origin;

  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: maxPages,
    maxConcurrency: 3,
    headless: true,
    launchContext: {
      launchOptions: {
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
    },
    requestHandlerTimeoutSecs: 30,

    async requestHandler({ page, request, enqueueLinks }: PlaywrightCrawlingContext) {
      let statusCode = 200;
      page.on("response", (response) => {
        if (response.url() === page.url()) {
          statusCode = response.status();
        }
      });

      await page.waitForLoadState("networkidle").catch(() => {});

      const title = await page.title();

      const screenshotBuffer = await page.screenshot({
        type: "png",
        fullPage: false,
      });
      const screenshotBase64 = `data:image/png;base64,${screenshotBuffer.toString("base64")}`;

      const extracted = await page.evaluate((origin: string) => {
        const anchors = Array.from(document.querySelectorAll("a[href]"));
        const seen = new Set<string>();
        const links: Array<{ url: string; anchorText: string; context: string }> = [];
        let internalLinkCount = 0;
        let externalLinkCount = 0;

        for (const a of anchors) {
          const href = a.getAttribute("href");
          if (!href) continue;
          try {
            const url = new URL(href, window.location.href);
            if (url.origin === origin) {
              internalLinkCount++;
            } else {
              externalLinkCount++;
            }
            if (url.origin !== origin) continue;
            url.hash = "";
            const path = url.pathname.replace(/\/+$/, "") || "/";
            url.pathname = path;
            const normalized = url.toString();
            if (seen.has(normalized)) continue;
            seen.add(normalized);

            let context: string = "other";
            if (a.closest("nav")) context = "nav";
            else if (a.closest("header")) context = "header";
            else if (a.closest("footer")) context = "footer";
            else if (a.closest("main, article, section")) context = "main";

            links.push({
              url: normalized,
              anchorText: (a.textContent || "").trim().slice(0, 100),
              context,
            });
          } catch {
            // skip invalid URLs
          }
        }

        const getMeta = (name: string): string | null => {
          const el = document.querySelector(
            `meta[name="${name}"], meta[property="${name}"]`
          );
          return el?.getAttribute("content") || null;
        };

        const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href") || null;

        const meta = {
          description: getMeta("description"),
          keywords: getMeta("keywords"),
          canonical,
          ogTitle: getMeta("og:title"),
          ogDescription: getMeta("og:description"),
          ogImage: getMeta("og:image"),
          robots: getMeta("robots"),
          viewport: getMeta("viewport"),
          language: document.documentElement.lang || null,
        };

        const headings: Array<{ tag: string; text: string }> = [];
        document.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((el) => {
          headings.push({
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || "").trim().slice(0, 200),
          });
        });

        const images = document.querySelectorAll("img");
        const imageCount = images.length;
        let imagesWithoutAlt = 0;
        images.forEach((img) => {
          if (!img.getAttribute("alt")?.trim()) imagesWithoutAlt++;
        });

        const bodyText = (document.body?.innerText || "").trim();
        const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

        const hasStructuredData =
          document.querySelectorAll('script[type="application/ld+json"]').length > 0;

        const truncatedBody = bodyText.slice(0, 3000);

        return {
          links,
          meta,
          headings,
          imageCount,
          imagesWithoutAlt,
          wordCount,
          internalLinkCount,
          externalLinkCount,
          hasStructuredData,
          bodyText: truncatedBody,
        };
      }, baseOrigin);

      const seo: PageSeoData = {
        meta: extracted.meta as PageSeoData["meta"],
        headings: extracted.headings as PageSeoData["headings"],
        imageCount: extracted.imageCount,
        imagesWithoutAlt: extracted.imagesWithoutAlt,
        wordCount: extracted.wordCount,
        internalLinkCount: extracted.internalLinkCount,
        externalLinkCount: extracted.externalLinkCount,
        hasStructuredData: extracted.hasStructuredData,
        statusCode,
      };

      pages.push({
        url: request.loadedUrl || request.url,
        title,
        screenshot: screenshotBase64,
        outgoingLinks: extracted.links as OutgoingLink[],
        seo,
        bodyText: extracted.bodyText,
      });

      // Emit progress event
      onProgress?.({
        type: "page_crawled",
        url: request.loadedUrl || request.url,
        title,
        index: pages.length,
        total: maxPages,
      });

      if ((request.userData?.depth ?? 0) < maxDepth) {
        await enqueueLinks({
          strategy: "same-origin",
          userData: { depth: (request.userData?.depth ?? 0) + 1 },
        });
      }
    },
  });

  await crawler.run([{
    url: startUrl,
    userData: { depth: 0 },
  }]);

  const result: CrawlResult = { pages, rootUrl: startUrl };

  onProgress?.({ type: "complete", result });

  return result;
}
