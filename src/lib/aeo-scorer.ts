import type { CrawlPageResult, PriorityAction } from "@/types/canvas";

// Schema.org types that help AI assistants understand & cite a page.
const CITATION_TYPES = [
  "Organization", "Article", "Product", "FAQPage", "WebPage",
  "WebSite", "LocalBusiness", "BreadcrumbList", "HowTo", "Recipe",
];

const EN_INTERROGATIVE = /\b(how|what|why|when|where|who|which|can|does|do|is|are|should)\b/i;
const AR_INTERROGATIVE = /(كيف|ماذا|لماذا|متى|أين|هل|كم|ما)/;

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function isQuestion(text: string): boolean {
  const t = text.trim();
  if (t.endsWith("?") || t.endsWith("؟")) return true;
  return EN_INTERROGATIVE.test(t) || AR_INTERROGATIVE.test(t);
}

export interface AeoResult {
  score: number;
  schemaCoverage: number;
  clarityCoverage: number;
  extractableCoverage: number;
  hasFaq: boolean;
  faqCount: number;
  citablePages: number;
  pageCount: number;
  actions: PriorityAction[];
}

/**
 * Deterministic "AI visibility" (AEO) score — how easily answer engines like
 * ChatGPT / Perplexity / Google AI can read, understand, and cite the site.
 * Pure; computed entirely from data the crawler already captures.
 */
export function scoreAeo(pages: CrawlPageResult[]): AeoResult {
  const pageCount = Math.max(1, pages.length);

  const citable = pages.filter((p) =>
    (p.seo.structuredData ?? []).some((s) => CITATION_TYPES.includes(s.type) && s.issues.length === 0)
  );
  const schemaCoverage = clamp((citable.length / pageCount) * 100);

  const faqPages = pages.filter((p) =>
    (p.seo.structuredData ?? []).some((s) => s.type === "FAQPage") ||
    p.seo.headings.filter((h) => isQuestion(h.text)).length >= 2
  );
  const hasFaq = faqPages.length > 0;

  const clarityPages = pages.filter((p) => {
    const h1 = p.seo.headings.filter((h) => h.tag === "h1").length;
    return h1 === 1 && p.seo.wordCount >= 150 && p.seo.headings.length >= 2;
  });
  const clarityCoverage = clamp((clarityPages.length / pageCount) * 100);

  const extractablePages = pages.filter((p) => !p.botProtection && p.seo.wordCount >= 200);
  const extractableCoverage = clamp((extractablePages.length / pageCount) * 100);

  const score = clamp(
    schemaCoverage * 0.35 +
    clarityCoverage * 0.3 +
    extractableCoverage * 0.25 +
    (hasFaq ? 100 : 35) * 0.1
  );

  const actions: PriorityAction[] = [];
  if (schemaCoverage < 60) {
    actions.push({
      id: "aeo-schema", area: "ai", priority: schemaCoverage < 30 ? "high" : "medium",
      title: "Add structured data so AI can cite your pages",
      whyItMatters: "Assistants like ChatGPT, Perplexity, and Google AI rely on Schema.org markup to understand what a page is about and quote it confidently.",
      howToFix: "Add JSON-LD (Organization, Article, Product, or FAQPage) to key pages with all required fields filled in.",
      metric: `${schemaCoverage}%`,
    });
  }
  if (!hasFaq) {
    actions.push({
      id: "aeo-faq", area: "ai", priority: "medium",
      title: "Expose answers with FAQ / Q&A structure",
      whyItMatters: "Question-and-answer content is the format AI answer engines pull from most directly.",
      howToFix: "Add an FAQ section with FAQPage schema, or structure key pages around clear questions and concise answers.",
    });
  }
  if (clarityCoverage < 60) {
    actions.push({
      id: "aeo-clarity", area: "ai", priority: "medium",
      title: "Make pages clearer for machine reading",
      whyItMatters: "A single H1, a real heading hierarchy, and enough text help AI extract a page's purpose and entities.",
      howToFix: "Use one H1 per page, logical headings, and at least a few hundred words of substantive content.",
      metric: `${clarityCoverage}%`,
    });
  }
  if (extractableCoverage < 70) {
    actions.push({
      id: "aeo-extractable", area: "ai", priority: extractableCoverage < 40 ? "high" : "medium",
      title: "Some pages are hard for AI to read",
      whyItMatters: "Bot protection and thin or JS-rendered content leave AI tools with little or nothing to extract.",
      howToFix: "Reduce aggressive bot blocking on public pages and keep key content in the served HTML, not loaded only via JavaScript.",
      metric: `${extractableCoverage}%`,
    });
  }

  return {
    score, schemaCoverage, clarityCoverage, extractableCoverage,
    hasFaq, faqCount: faqPages.length, citablePages: citable.length,
    pageCount: pages.length, actions,
  };
}
