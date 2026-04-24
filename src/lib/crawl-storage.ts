import type { CrawlResult, CrawlPageResult, RobotsSitemapResult } from "@/types/canvas";

const MAX_STORED_OUTGOING_LINKS = 250;
const MAX_STORED_PRODUCTS = 100;
const MAX_STORED_DISCOVERED_URLS = 200;
const MAX_STORED_SITEMAP_URLS = 200;

function sanitizePage(page: CrawlPageResult): CrawlPageResult {
  return {
    ...page,
    outgoingLinks: page.outgoingLinks.slice(0, MAX_STORED_OUTGOING_LINKS),
    products: page.products?.slice(0, MAX_STORED_PRODUCTS).map((product) => ({
      ...product,
      name: product.name.slice(0, 250),
      description: product.description?.slice(0, 200),
      brand: product.brand?.slice(0, 120),
      category: product.category?.slice(0, 120),
    })),
    seo: {
      ...page.seo,
      structuredData: page.seo.structuredData?.map((entry) => ({
        type: entry.type,
        issues: entry.issues.slice(0, 12),
        // The UI only needs schema type + issues, so avoid storing the raw payload.
        data: {},
      })),
    },
    bodyText: page.bodyText.slice(0, 3000),
  };
}

function sanitizeRobotsSitemap(
  robotsSitemap?: RobotsSitemapResult
): RobotsSitemapResult | undefined {
  if (!robotsSitemap) return undefined;

  return {
    robotsTxt: {
      ...robotsSitemap.robotsTxt,
      sitemapUrls: robotsSitemap.robotsTxt.sitemapUrls.slice(0, 20),
      blockedPaths: robotsSitemap.robotsTxt.blockedPaths.slice(0, 50),
      issues: robotsSitemap.robotsTxt.issues.slice(0, 20),
    },
    sitemap: {
      ...robotsSitemap.sitemap,
      urls: robotsSitemap.sitemap.urls.slice(0, MAX_STORED_SITEMAP_URLS),
      issues: robotsSitemap.sitemap.issues.slice(0, 20),
    },
    coverage: {
      inSitemapNotCrawled: robotsSitemap.coverage.inSitemapNotCrawled.slice(0, 50),
      crawledNotInSitemap: robotsSitemap.coverage.crawledNotInSitemap.slice(0, 50),
    },
  };
}

export function prepareCrawlForStorage(crawl: CrawlResult) {
  return {
    rootUrl: crawl.rootUrl,
    pages: crawl.pages.map(sanitizePage),
    discoveredUrls: crawl.discoveredUrls.slice(0, MAX_STORED_DISCOVERED_URLS),
    brokenLinks: crawl.brokenLinks ?? [],
    redirectChains: crawl.redirectChains ?? [],
    robotsSitemap: sanitizeRobotsSitemap(crawl.robotsSitemap),
  };
}
