import type { BrokenLink, CrawlResult, CrawlPageResult, RedirectChain, RobotsSitemapResult } from "@/types/canvas";

const MAX_STORED_OUTGOING_LINKS = 250;
const MAX_STORED_PRODUCTS = 100;
const MAX_STORED_DISCOVERED_URLS = 200;
const MAX_STORED_SITEMAP_URLS = 200;
const MAX_PAGE_CHUNK_BYTES = 180_000;
const MAX_STORED_HEADINGS = 40;
const MAX_TEXT_FIELD_LENGTH = 300;
const MAX_META_FIELD_LENGTH = 500;

interface CrawlStorageMetadata {
  rootUrl: string;
  pagesCount: number;
  discoveredUrls: string[];
  brokenLinks: BrokenLink[];
  redirectChains: RedirectChain[];
  robotsSitemap?: RobotsSitemapResult;
}

interface CrawlStoragePlan {
  metadata: CrawlStorageMetadata;
  pageChunks: CrawlPageResult[][];
}

function withDefined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
}

function uniqueStrings(values: string[], limit: number): string[] {
  return Array.from(new Set(values)).slice(0, limit);
}

function sanitizePage(page: CrawlPageResult): CrawlPageResult {
  const products = page.products?.slice(0, MAX_STORED_PRODUCTS).map((product) => withDefined({
    name: product.name.slice(0, 250),
    price: product.price?.slice(0, 80),
    currency: product.currency?.slice(0, 20),
    availability: product.availability?.slice(0, 80),
    originalPrice: product.originalPrice?.slice(0, 80),
    discountPercent: product.discountPercent,
    imageUrl: product.imageUrl?.slice(0, 500),
    brand: product.brand?.slice(0, 120),
    sku: product.sku?.slice(0, 120),
    rating: product.rating?.slice(0, 40),
    reviewCount: product.reviewCount,
    description: product.description?.slice(0, 200),
    category: product.category?.slice(0, 120),
    productUrl: product.productUrl?.slice(0, 500),
    source: product.source,
  }));

  return withDefined({
    url: page.url,
    title: page.title.slice(0, 200),
    screenshot: page.screenshot.slice(0, 500),
    bodyText: page.bodyText.slice(0, 3000),
    outgoingLinks: page.outgoingLinks.slice(0, MAX_STORED_OUTGOING_LINKS).map((link) => ({
      url: link.url.slice(0, 500),
      anchorText: link.anchorText.slice(0, MAX_TEXT_FIELD_LENGTH),
      context: link.context,
    })),
    seo: {
      ...page.seo,
      meta: {
        description: page.seo.meta.description?.slice(0, MAX_META_FIELD_LENGTH) ?? null,
        keywords: page.seo.meta.keywords?.slice(0, MAX_META_FIELD_LENGTH) ?? null,
        canonical: page.seo.meta.canonical?.slice(0, 500) ?? null,
        ogTitle: page.seo.meta.ogTitle?.slice(0, MAX_META_FIELD_LENGTH) ?? null,
        ogDescription: page.seo.meta.ogDescription?.slice(0, MAX_META_FIELD_LENGTH) ?? null,
        ogImage: page.seo.meta.ogImage?.slice(0, 500) ?? null,
        robots: page.seo.meta.robots?.slice(0, 120) ?? null,
        viewport: page.seo.meta.viewport?.slice(0, 200) ?? null,
        language: page.seo.meta.language?.slice(0, 40) ?? null,
      },
      headings: page.seo.headings.slice(0, MAX_STORED_HEADINGS).map((heading) => ({
        tag: heading.tag,
        text: heading.text.slice(0, MAX_TEXT_FIELD_LENGTH),
      })),
      structuredData: page.seo.structuredData?.map((entry) => ({
        type: entry.type.slice(0, 120),
        issues: entry.issues.slice(0, 12),
        // The UI only needs schema type + issues, so avoid storing the raw payload.
        data: {},
      })),
      i18n: page.seo.i18n ? {
        ...page.seo.i18n,
        dir: page.seo.i18n.dir?.slice(0, 10) ?? null,
        hreflangLinks: page.seo.i18n.hreflangLinks.slice(0, 20).map((entry) => ({
          lang: entry.lang.slice(0, 20),
          url: entry.url.slice(0, 500),
        })),
      } : undefined,
      performance: page.seo.performance ? {
        ...page.seo.performance,
        cacheControl: page.seo.performance.cacheControl?.slice(0, 200) ?? null,
        serverHeader: page.seo.performance.serverHeader?.slice(0, 120) ?? null,
      } : undefined,
    },
    products: products && products.length > 0 ? products : undefined,
    botProtection: page.botProtection,
  });
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

function buildPageChunks(pages: CrawlPageResult[]): CrawlPageResult[][] {
  const chunks: CrawlPageResult[][] = [];
  let currentChunk: CrawlPageResult[] = [];
  let currentBytes = 2;

  for (const page of pages) {
    const pageBytes = new TextEncoder().encode(JSON.stringify(page)).length;
    if (currentChunk.length > 0 && currentBytes + pageBytes > MAX_PAGE_CHUNK_BYTES) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentBytes = 2;
    }

    currentChunk.push(page);
    currentBytes += pageBytes;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

export function createCrawlStorageMetadata(crawl: CrawlResult): CrawlStorageMetadata {
  return {
    rootUrl: crawl.rootUrl,
    pagesCount: crawl.pages.length,
    discoveredUrls: uniqueStrings(crawl.discoveredUrls, MAX_STORED_DISCOVERED_URLS),
    brokenLinks: crawl.brokenLinks ?? [],
    redirectChains: crawl.redirectChains ?? [],
    robotsSitemap: sanitizeRobotsSitemap(crawl.robotsSitemap),
  };
}

export function createCrawlStoragePlan(crawl: CrawlResult): CrawlStoragePlan {
  const sanitizedPages = crawl.pages.map(sanitizePage);
  return {
    metadata: createCrawlStorageMetadata({
      ...crawl,
      pages: sanitizedPages,
    }),
    pageChunks: buildPageChunks(sanitizedPages),
  };
}

export function prepareCrawlForStorage(crawl: CrawlResult) {
  const plan = createCrawlStoragePlan(crawl);
  return {
    ...plan.metadata,
    pages: plan.pageChunks.flat(),
  };
}
