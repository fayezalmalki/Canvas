export type LinkContext = "nav" | "header" | "footer" | "main" | "other";

export interface OutgoingLink {
  url: string;
  anchorText: string;
  context: LinkContext;
}

export interface PageMetadata {
  description: string | null;
  keywords: string | null;
  canonical: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  robots: string | null;
  viewport: string | null;
  language: string | null;
}

export interface HeadingEntry {
  tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  text: string;
}

export interface PagePerformance {
  responseTimeMs: number;
  htmlSizeBytes: number;
  hasCompression: boolean;
  cacheControl: string | null;
  serverHeader: string | null;
}

export interface I18nData {
  dir: string | null; // "rtl" | "ltr" | null
  hreflangLinks: { lang: string; url: string }[];
  hasArabicContent: boolean;
  arabicRatio: number; // 0-1
}

export interface StructuredDataEntry {
  type: string; // e.g. "Product", "Article", "Organization"
  data: Record<string, unknown>;
  issues: string[];
}

export interface PageSeoData {
  meta: PageMetadata;
  headings: HeadingEntry[];
  imageCount: number;
  imagesWithoutAlt: number;
  wordCount: number;
  internalLinkCount: number;
  externalLinkCount: number;
  hasStructuredData: boolean;
  structuredData?: StructuredDataEntry[];
  statusCode: number;
  performance?: PagePerformance;
  i18n?: I18nData;
}

export type ProductSource = "json-ld" | "microdata" | "html-patterns" | "og-tags";

export interface ProductData {
  name: string;
  price?: string;
  currency?: string;
  availability?: string;
  originalPrice?: string;
  discountPercent?: number;
  imageUrl?: string;
  brand?: string;
  sku?: string;
  rating?: string;
  reviewCount?: number;
  description?: string;
  category?: string;
  productUrl?: string;
  source: ProductSource;
}

export interface CrawlPageResult {
  url: string;
  title: string;
  screenshot: string; // base64 data URL
  outgoingLinks: OutgoingLink[];
  seo: PageSeoData;
  bodyText: string; // first ~3000 chars for LLM analysis
  products?: ProductData[];
  botProtection?: string;
}

export interface BrokenLink {
  url: string;
  statusCode: number;
  referringPages: string[];
}

export interface RedirectChain {
  from: string;
  to: string;
  hops: number;
  statusCodes: number[];
}

export interface RobotsSitemapResult {
  robotsTxt: {
    found: boolean;
    sitemapUrls: string[];
    blockedPaths: string[];
    issues: string[];
  };
  sitemap: {
    found: boolean;
    urls: { loc: string; lastmod?: string }[];
    issues: string[];
  };
  coverage: {
    inSitemapNotCrawled: string[];
    crawledNotInSitemap: string[];
  };
}

export interface CrawlResult {
  _id?: string;
  pages: CrawlPageResult[];
  rootUrl: string;
  discoveredUrls: string[];
  brokenLinks?: BrokenLink[];
  redirectChains?: RedirectChain[];
  robotsSitemap?: RobotsSitemapResult;
}

export interface SeoIssue {
  severity: "error" | "warning" | "info";
  category: string;
  title: string;
  description: string;
  pointsDeducted: number;
}

export interface SeoScoreResult {
  score: number;
  issues: SeoIssue[];
  checksPassed: string[];
  summary: string;
}

export interface Recommendation {
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
}

export interface PriorityAction {
  id: string;
  area: "overview" | "ai" | "search" | "store";
  priority: "high" | "medium" | "low";
  title: string;
  whyItMatters: string;
  howToFix: string;
  affectedCount?: number;
  metric?: string;
}

export interface SiteHealthSummary {
  overallScore: number;
  status: "strong" | "steady" | "at-risk";
  summary: string;
  strengths: string[];
  topPriorities: PriorityAction[];
  quickWins: PriorityAction[];
  pagesAnalyzed: number;
  averageSeoScore: number;
  brokenLinksCount: number;
  sitewideIssuesCount: number;
}

export interface AiReadinessSummary {
  score: number;
  summary: string;
  extractablePageCount: number;
  botProtectedPageCount: number;
  structuredDataCoverage: number;
  languageClarityCoverage: number;
  llmReadabilityCoverage: number;
  topPriorities: PriorityAction[];
}

export interface PageAnalysis {
  seoScore: number;
  seoIssues: SeoIssue[];
  contentAnalysis: {
    summary: string;
    readabilityScore: number;
    keyTopics: string[];
    contentGaps: string[];
  };
  features: {
    detected: string[];
    technologies: string[];
  };
  recommendations: Recommendation[];
}

export interface CrawlProgressEvent {
  type: "page_crawled" | "complete" | "error";
  url?: string;
  title?: string;
  index?: number;
  total?: number;
  discovered?: number; // total discovered URLs (crawled + uncrawled)
  result?: CrawlResult;
  message?: string;
}
