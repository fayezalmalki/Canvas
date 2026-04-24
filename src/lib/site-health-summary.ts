import { analyzeContent } from "@/lib/content-analysis";
import { deduplicatePages } from "@/lib/dedup-pages";
import { scoreSeo } from "@/lib/seo-scorer";
import type {
  AiReadinessSummary,
  CrawlResult,
  PriorityAction,
  ProductData,
  SiteHealthSummary,
} from "@/types/canvas";

export interface SearchIndexingSummary {
  score: number;
  summary: string;
  actions: PriorityAction[];
  metaCoverage: number;
  indexablePages: number;
  brokenLinksCount: number;
  sitemapCoverage: number;
}

export interface StoreReadinessSummary {
  score: number | null;
  summary: string;
  productCount: number;
  pagesWithProducts: number;
  productDataCoverage: number;
  schemaBackedCoverage: number;
  actions: PriorityAction[];
}

export interface SiteWorkspaceSummary {
  health: SiteHealthSummary;
  ai: AiReadinessSummary;
  search: SearchIndexingSummary;
  store: StoreReadinessSummary;
}

interface ProductWithPage extends ProductData {
  pageUrl: string;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function priorityWeight(priority: PriorityAction["priority"]) {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function buildStatus(score: number): SiteHealthSummary["status"] {
  if (score >= 80) return "strong";
  if (score >= 55) return "steady";
  return "at-risk";
}

function productDataCoverage(product: ProductData) {
  const fields: (keyof ProductData)[] = ["price", "currency", "availability", "imageUrl", "brand", "description"];
  const filled = fields.filter((field) => {
    const value = product[field];
    return value !== undefined && value !== null && value !== "";
  }).length;
  return Math.round((filled / fields.length) * 100);
}

function pushAction(
  list: PriorityAction[],
  action: PriorityAction | null
) {
  if (action) list.push(action);
}

export function buildSiteWorkspaceSummary(crawlResult: CrawlResult): SiteWorkspaceSummary {
  const pages = deduplicatePages(crawlResult.pages);
  const content = analyzeContent(pages);
  const pageCount = pages.length || 1;
  const avgSeoScore = Math.round(
    pages.reduce((sum, page) => sum + scoreSeo({ url: page.url, title: page.title, seo: page.seo }).score, 0) / pageCount
  );

  const brokenLinksCount = crawlResult.brokenLinks?.length ?? 0;
  const redirectChainsCount = crawlResult.redirectChains?.length ?? 0;
  const botProtectedPages = pages.filter((page) => page.botProtection).length;
  const extractablePages = pages.filter((page) => !page.botProtection && page.bodyText.trim().length >= 250).length;
  const pagesWithStructuredData = pages.filter((page) => page.seo.hasStructuredData).length;
  const pagesWithLanguage = pages.filter((page) => !!page.seo.meta.language).length;
  const llmReadablePages = pages.filter((page) => !page.botProtection && page.seo.wordCount >= 150 && page.seo.headings.length > 0).length;
  const missingMetaPages = pages.filter((page) => !page.seo.meta.description).length;
  const weakTitlePages = pages.filter((page) => !page.title || page.title.length < 30 || page.title.length > 60).length;
  const pagesWithoutInternalLinks = pages.filter((page) => page.seo.internalLinkCount === 0).length;
  const indexablePages = pages.filter((page) => page.seo.statusCode === 200 && !page.botProtection).length;
  const robotsSitemap = crawlResult.robotsSitemap;
  const robotsIssues = robotsSitemap?.robotsTxt.issues ?? [];
  const sitemapIssues = robotsSitemap?.sitemap.issues ?? [];
  const robotsBlocksAll = robotsSitemap?.robotsTxt.blockedPaths.includes("/") ?? false;
  const sitemapCoverage = robotsSitemap?.sitemap.found
    ? clampScore(
      ((indexablePages - (robotsSitemap.coverage.crawledNotInSitemap.length || 0)) / Math.max(indexablePages, 1)) * 100
    )
    : 0;

  const products: ProductWithPage[] = pages.flatMap((page) =>
    (page.products ?? []).map((product) => ({ ...product, pageUrl: page.url }))
  );
  const pagesWithProducts = pages.filter((page) => (page.products?.length ?? 0) > 0).length;
  const avgProductCoverage = products.length > 0
    ? Math.round(products.reduce((sum, product) => sum + productDataCoverage(product), 0) / products.length)
    : 0;
  const schemaBackedProducts = products.filter((product) => product.source === "json-ld" || product.source === "microdata").length;
  const schemaBackedCoverage = products.length > 0
    ? Math.round((schemaBackedProducts / products.length) * 100)
    : 0;
  const productsMissingPrice = products.filter((product) => !product.price || !product.currency).length;
  const productsMissingAvailability = products.filter((product) => !product.availability).length;

  const healthActions: PriorityAction[] = [];
  const aiActions: PriorityAction[] = [];
  const searchActions: PriorityAction[] = [];
  const storeActions: PriorityAction[] = [];

  pushAction(aiActions, botProtectedPages > 0 ? {
    id: "ai-bot-protection",
    area: "ai",
    priority: "high",
    title: "AI tools may not reach some pages",
    whyItMatters: "If crawlers hit challenge pages instead of content, AI agents and some audit tools can miss key information.",
    howToFix: "Review bot protection rules, allow trusted crawlers where appropriate, and make sure important pages return the real page HTML.",
    affectedCount: botProtectedPages,
    metric: `${botProtectedPages}/${pages.length}`,
  } : null);

  pushAction(aiActions, pagesWithStructuredData / pageCount < 0.5 ? {
    id: "ai-structured-data",
    area: "ai",
    priority: "high",
    title: "Important pages lack structured context",
    whyItMatters: "Structured data helps search engines and AI systems understand products, organizations, and page meaning faster.",
    howToFix: "Add schema markup on high-value pages first, especially product, organization, and content pages users care about most.",
    affectedCount: pageCount - pagesWithStructuredData,
    metric: `${pagesWithStructuredData}/${pages.length}`,
  } : null);

  pushAction(aiActions, llmReadablePages / pageCount < 0.65 ? {
    id: "ai-readability",
    area: "ai",
    priority: "medium",
    title: "Many pages are hard for AI to summarize well",
    whyItMatters: "Thin or structure-light pages are harder for LLMs to extract, quote, and explain accurately.",
    howToFix: "Strengthen headings, clarify page purpose early, and add more useful body copy to thin pages.",
    affectedCount: pageCount - llmReadablePages,
    metric: `${llmReadablePages}/${pages.length}`,
  } : null);

  const languageClarityCoverage = clampScore(
    (pages.filter((page) => {
      if (!page.seo.meta.language) return false;
      if (page.seo.i18n?.hasArabicContent) {
        return page.seo.i18n.dir === "rtl";
      }
      return true;
    }).length / pageCount) * 100
  );

  pushAction(aiActions, languageClarityCoverage < 80 ? {
    id: "ai-language-clarity",
    area: "ai",
    priority: "medium",
    title: "Language signals are inconsistent",
    whyItMatters: "Missing language or direction hints can confuse crawlers and reduce confidence in multilingual or Arabic pages.",
    howToFix: "Set the correct page language, use RTL where needed, and add hreflang only when alternate language versions exist.",
    metric: `${languageClarityCoverage}%`,
  } : null);

  pushAction(searchActions, robotsBlocksAll ? {
    id: "search-robots-block-all",
    area: "search",
    priority: "high",
    title: "robots.txt appears to block crawlers",
    whyItMatters: "If important pages are blocked, Google and other crawlers may not index them properly.",
    howToFix: "Review robots.txt immediately and make sure key public sections are crawlable.",
    metric: "Disallow: /",
  } : null);

  pushAction(searchActions, !robotsSitemap?.sitemap.found ? {
    id: "search-missing-sitemap",
    area: "search",
    priority: "high",
    title: "The site does not expose a clear sitemap",
    whyItMatters: "A sitemap helps search engines discover important URLs faster and understand site coverage.",
    howToFix: "Publish a valid sitemap.xml and reference it from robots.txt.",
  } : null);

  pushAction(searchActions, missingMetaPages / pageCount >= 0.2 ? {
    id: "search-meta-gaps",
    area: "search",
    priority: "high",
    title: "Too many pages are missing search snippets",
    whyItMatters: "Without titles or descriptions, Google has less control over how your pages appear in results.",
    howToFix: "Write unique titles and descriptions for the most important landing and product pages first.",
    affectedCount: missingMetaPages,
    metric: `${missingMetaPages}/${pages.length}`,
  } : null);

  pushAction(searchActions, brokenLinksCount > 0 || redirectChainsCount > 0 ? {
    id: "search-link-health",
    area: "search",
    priority: brokenLinksCount > 0 ? "high" : "medium",
    title: "Link health is hurting discoverability",
    whyItMatters: "Broken links and long redirects waste crawl budget and create dead ends for users and bots.",
    howToFix: "Fix broken destinations, update old references, and simplify redirect chains on key paths.",
    metric: `${brokenLinksCount} broken / ${redirectChainsCount} redirect chains`,
  } : null);

  pushAction(searchActions, content.duplicateTitles.length > 0 || content.duplicateDescriptions.length > 0 ? {
    id: "search-duplicate-signals",
    area: "search",
    priority: "medium",
    title: "Search signals are duplicated across pages",
    whyItMatters: "Repeated titles or descriptions make it harder for search engines to tell pages apart.",
    howToFix: "Make metadata unique for pages with similar templates, categories, or product variations.",
    metric: `${content.duplicateTitles.length} title groups`,
  } : null);

  pushAction(searchActions, pagesWithoutInternalLinks > 0 ? {
    id: "search-orphan-pages",
    area: "search",
    priority: "medium",
    title: "Some pages are hard to reach from the rest of the site",
    whyItMatters: "Pages with no internal linking support are easier to miss during crawling and less likely to perform well.",
    howToFix: "Link important pages from navigation, hubs, and related-content sections.",
    affectedCount: pagesWithoutInternalLinks,
    metric: `${pagesWithoutInternalLinks}/${pages.length}`,
  } : null);

  if (products.length > 0) {
    pushAction(storeActions, avgProductCoverage < 70 ? {
      id: "store-product-data",
      area: "store",
      priority: "high",
      title: "Product data is incomplete on many items",
      whyItMatters: "Missing price, availability, or images makes it harder for search engines and AI tools to trust store details.",
      howToFix: "Standardize product templates so price, currency, availability, image, and brand details are always present.",
      metric: `${avgProductCoverage}%`,
    } : null);

    pushAction(storeActions, schemaBackedCoverage < 50 ? {
      id: "store-schema-coverage",
      area: "store",
      priority: "medium",
      title: "Most products are not backed by product schema",
      whyItMatters: "Schema-backed product data improves extraction quality for search, AI tools, and store-focused crawlers.",
      howToFix: "Add Product and Offer schema on category and product pages, starting with best sellers.",
      metric: `${schemaBackedCoverage}%`,
    } : null);

    pushAction(storeActions, productsMissingPrice > 0 ? {
      id: "store-price-gaps",
      area: "store",
      priority: "medium",
      title: "Some products are missing price or currency details",
      whyItMatters: "Missing pricing reduces merchant clarity and weakens product extraction across channels.",
      howToFix: "Expose machine-readable price and currency data in page HTML and structured data.",
      affectedCount: productsMissingPrice,
      metric: `${productsMissingPrice}/${products.length}`,
    } : null);

    pushAction(storeActions, productsMissingAvailability > 0 ? {
      id: "store-stock-gaps",
      area: "store",
      priority: "low",
      title: "Stock status is unclear on part of the catalog",
      whyItMatters: "Availability helps users, search engines, and future monitoring features understand store state.",
      howToFix: "Publish clear in-stock or out-of-stock states on the page and in structured data.",
      affectedCount: productsMissingAvailability,
      metric: `${productsMissingAvailability}/${products.length}`,
    } : null);
  }

  healthActions.push(...aiActions, ...searchActions, ...storeActions);
  healthActions.sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority));

  const aiScore = clampScore(
    100
    - (botProtectedPages / pageCount) * 40
    - ((pageCount - pagesWithStructuredData) / pageCount) * 20
    - ((pageCount - llmReadablePages) / pageCount) * 20
    - ((100 - languageClarityCoverage) * 0.2)
  );

  const searchScore = clampScore(
    avgSeoScore
    - (robotsIssues.length * 8)
    - (sitemapIssues.length * 6)
    - Math.min(brokenLinksCount * 2, 18)
    - Math.min(content.duplicateTitles.length * 3, 10)
  );

  const storeScore = products.length > 0
    ? clampScore((avgProductCoverage * 0.6) + (schemaBackedCoverage * 0.25) + ((100 - Math.min(productsMissingAvailability / products.length * 100, 100)) * 0.15))
    : null;

  const overallScore = clampScore(
    products.length > 0
      ? (avgSeoScore * 0.45) + (aiScore * 0.3) + (searchScore * 0.15) + ((storeScore ?? 0) * 0.1)
      : (avgSeoScore * 0.5) + (aiScore * 0.3) + (searchScore * 0.2)
  );

  const strengths: string[] = [];
  if (avgSeoScore >= 75) strengths.push("The site already has a strong overall SEO baseline.");
  if (pagesWithStructuredData / pageCount >= 0.65) strengths.push("Structured context is present across much of the site.");
  if (brokenLinksCount === 0 && redirectChainsCount === 0) strengths.push("Link health looks clean, with no major crawl dead ends found.");
  if (products.length > 0 && avgProductCoverage >= 75) strengths.push("Product pages expose solid core commerce data.");
  if (strengths.length === 0) strengths.push("The site has enough crawlable content to build on quickly.");

  const quickWins = healthActions.filter((action) => action.priority !== "high").slice(0, 3);
  const summaryStatus = buildStatus(overallScore);
  const sitewideIssuesCount =
    robotsIssues.length
    + sitemapIssues.length
    + brokenLinksCount
    + redirectChainsCount
    + content.duplicateTitles.length
    + content.duplicateDescriptions.length;

  const healthSummary: SiteHealthSummary = {
    overallScore,
    status: summaryStatus,
    summary:
      summaryStatus === "strong"
        ? "The site has a solid foundation. The biggest opportunity is refining visibility signals and simplifying a few weak spots."
        : summaryStatus === "steady"
          ? "The site is understandable, but a few gaps are likely holding back search visibility and AI friendliness."
          : "Core discoverability signals need attention before the site can consistently perform well in search and AI tools.",
    strengths: strengths.slice(0, 3),
    topPriorities: healthActions.slice(0, 3),
    quickWins,
    pagesAnalyzed: pages.length,
    averageSeoScore: avgSeoScore,
    brokenLinksCount,
    sitewideIssuesCount,
  };

  const aiSummary: AiReadinessSummary = {
    score: aiScore,
    summary:
      aiScore >= 80
        ? "AI systems should be able to read and summarize most important pages with good confidence."
        : aiScore >= 55
          ? "AI visibility is workable, but some pages still lack the structure or access signals that help agents understand them."
          : "AI tools are likely to struggle with parts of the site because of access, structure, or readability gaps.",
    extractablePageCount: extractablePages,
    botProtectedPageCount: botProtectedPages,
    structuredDataCoverage: clampScore((pagesWithStructuredData / pageCount) * 100),
    languageClarityCoverage,
    llmReadabilityCoverage: clampScore((llmReadablePages / pageCount) * 100),
    topPriorities: aiActions.slice(0, 3),
  };

  const searchSummary: SearchIndexingSummary = {
    score: searchScore,
    summary:
      searchScore >= 80
        ? "Search signals are mostly healthy, with room to improve coverage and polish."
        : searchScore >= 55
          ? "Search performance is being limited by metadata, crawl, or coverage gaps."
          : "Search discoverability is at risk because core indexing signals need attention.",
    actions: searchActions.slice(0, 4),
    metaCoverage: clampScore(((pageCount - missingMetaPages) / pageCount) * 100),
    indexablePages,
    brokenLinksCount,
    sitemapCoverage,
  };

  const storeSummary: StoreReadinessSummary = {
    score: storeScore,
    summary:
      products.length === 0
        ? "No product catalog was detected in this crawl."
        : (storeScore ?? 0) >= 80
          ? "Store data looks strong enough to support discovery, extraction, and future monitoring."
          : (storeScore ?? 0) >= 55
            ? "Store pages are usable, but product data quality is still uneven."
            : "Store data needs cleanup before products can be understood reliably across search and AI systems.",
    productCount: products.length,
    pagesWithProducts,
    productDataCoverage: avgProductCoverage,
    schemaBackedCoverage,
    actions: storeActions.slice(0, 4),
  };

  return {
    health: healthSummary,
    ai: aiSummary,
    search: searchSummary,
    store: storeSummary,
  };
}
