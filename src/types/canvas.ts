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

export interface PageSeoData {
  meta: PageMetadata;
  headings: HeadingEntry[];
  imageCount: number;
  imagesWithoutAlt: number;
  wordCount: number;
  internalLinkCount: number;
  externalLinkCount: number;
  hasStructuredData: boolean;
  statusCode: number;
}

export interface CrawlPageResult {
  url: string;
  title: string;
  screenshot: string; // base64 data URL
  outgoingLinks: OutgoingLink[];
  seo: PageSeoData;
  bodyText: string; // first ~3000 chars for LLM analysis
}

export interface CrawlResult {
  pages: CrawlPageResult[];
  rootUrl: string;
  discoveredUrls: string[]; // URLs found but not crawled (over the limit)
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
