import type { CrawlPageResult } from "@/types/canvas";
import { scoreSeo } from "@/lib/seo-scorer";

export interface SeoGuideItem {
  id: string;
  category: string;
  severity: "critical" | "important" | "nice-to-have";
  title: string;
  description: string;
  affectedPages: { url: string; title: string }[];
  actionSteps: string[];
}

export interface SeoGuide {
  items: SeoGuideItem[];
  totalIssues: number;
  criticalCount: number;
  importantCount: number;
  niceToHaveCount: number;
  overallScore: number;
}

function severity(
  affectedCount: number,
  totalCount: number,
  forceCritical = false
): "critical" | "important" | "nice-to-have" {
  if (forceCritical) return "critical";
  const ratio = affectedCount / totalCount;
  if (ratio > 0.5) return "critical";
  if (ratio >= 0.2) return "important";
  return "nice-to-have";
}

function pageRef(p: CrawlPageResult) {
  return { url: p.url, title: p.title || "Untitled" };
}

export function generateSeoGuide(pages: CrawlPageResult[]): SeoGuide {
  const items: SeoGuideItem[] = [];
  const total = pages.length;

  if (total === 0) {
    return {
      items: [],
      totalIssues: 0,
      criticalCount: 0,
      importantCount: 0,
      niceToHaveCount: 0,
      overallScore: 0,
    };
  }

  // ── Titles ──────────────────────────────────────────────────────────

  const missingTitles = pages.filter((p) => !p.title || p.title.trim().length === 0);
  if (missingTitles.length > 0) {
    items.push({
      id: "titles-missing",
      category: "Titles",
      severity: severity(missingTitles.length, total),
      title: "Missing page titles",
      description:
        "These pages have no <title> tag. Page titles are critical for search rankings and click-through rates in SERPs.",
      affectedPages: missingTitles.map(pageRef),
      actionSteps: [
        "Add a unique, descriptive <title> tag to each page",
        "Keep titles between 30-60 characters",
        "Include primary keywords near the beginning of the title",
      ],
    });
  }

  const longTitles = pages.filter((p) => p.title && p.title.length > 60);
  if (longTitles.length > 0) {
    items.push({
      id: "titles-too-long",
      category: "Titles",
      severity: severity(longTitles.length, total),
      title: "Titles too long (>60 chars)",
      description:
        "Long titles get truncated in search results, reducing clarity and click-through rate.",
      affectedPages: longTitles.map(pageRef),
      actionSteps: [
        "Shorten titles to 60 characters or fewer",
        "Move the most important keywords to the front",
        "Remove filler words like 'Welcome to' or 'Home Page'",
      ],
    });
  }

  const shortTitles = pages.filter(
    (p) => p.title && p.title.trim().length > 0 && p.title.length < 30
  );
  if (shortTitles.length > 0) {
    items.push({
      id: "titles-too-short",
      category: "Titles",
      severity: severity(shortTitles.length, total),
      title: "Titles too short (<30 chars)",
      description:
        "Very short titles miss opportunities to rank for relevant keywords and may look incomplete in SERPs.",
      affectedPages: shortTitles.map(pageRef),
      actionSteps: [
        "Expand titles to at least 30 characters",
        "Include primary and secondary keywords",
        "Add your brand name with a separator (e.g. ' | Brand')",
      ],
    });
  }

  // Duplicate titles
  const titleMap = new Map<string, CrawlPageResult[]>();
  for (const p of pages) {
    if (p.title && p.title.trim().length > 0) {
      const key = p.title.trim().toLowerCase();
      const arr = titleMap.get(key) ?? [];
      arr.push(p);
      titleMap.set(key, arr);
    }
  }
  const dupTitlePages = [...titleMap.values()]
    .filter((arr) => arr.length > 1)
    .flat();
  if (dupTitlePages.length > 0) {
    items.push({
      id: "titles-duplicate",
      category: "Titles",
      severity: severity(dupTitlePages.length, total),
      title: "Duplicate page titles",
      description:
        "Multiple pages share the same title, making it hard for search engines to distinguish them.",
      affectedPages: dupTitlePages.map(pageRef),
      actionSteps: [
        "Write a unique title for every page",
        "Differentiate pages with similar content by including specifics (dates, categories)",
        "Consider whether duplicate-titled pages should be consolidated",
      ],
    });
  }

  // ── Meta Descriptions ───────────────────────────────────────────────

  const missingDesc = pages.filter((p) => !p.seo.meta.description);
  if (missingDesc.length > 0) {
    items.push({
      id: "meta-desc-missing",
      category: "Meta Descriptions",
      severity: severity(missingDesc.length, total),
      title: "Missing meta descriptions",
      description:
        "Pages without meta descriptions rely on search engines to auto-generate snippets, which are often suboptimal.",
      affectedPages: missingDesc.map(pageRef),
      actionSteps: [
        "Add a unique meta description to each page",
        "Keep descriptions between 50-160 characters",
        "Include a call to action and relevant keywords",
      ],
    });
  }

  const longDesc = pages.filter(
    (p) => p.seo.meta.description && p.seo.meta.description.length > 160
  );
  if (longDesc.length > 0) {
    items.push({
      id: "meta-desc-too-long",
      category: "Meta Descriptions",
      severity: severity(longDesc.length, total),
      title: "Meta descriptions too long (>160 chars)",
      description:
        "Long meta descriptions are truncated in search results, cutting off your message.",
      affectedPages: longDesc.map(pageRef),
      actionSteps: [
        "Trim descriptions to 160 characters or fewer",
        "Front-load the most compelling information",
      ],
    });
  }

  const shortDesc = pages.filter(
    (p) =>
      p.seo.meta.description &&
      p.seo.meta.description.length > 0 &&
      p.seo.meta.description.length < 50
  );
  if (shortDesc.length > 0) {
    items.push({
      id: "meta-desc-too-short",
      category: "Meta Descriptions",
      severity: severity(shortDesc.length, total),
      title: "Meta descriptions too short (<50 chars)",
      description:
        "Very short meta descriptions waste the opportunity to attract clicks from search results.",
      affectedPages: shortDesc.map(pageRef),
      actionSteps: [
        "Expand descriptions to at least 50 characters",
        "Summarize the page value proposition clearly",
        "Include a call to action",
      ],
    });
  }

  // Duplicate descriptions
  const descMap = new Map<string, CrawlPageResult[]>();
  for (const p of pages) {
    const d = p.seo.meta.description;
    if (d && d.trim().length > 0) {
      const key = d.trim().toLowerCase();
      const arr = descMap.get(key) ?? [];
      arr.push(p);
      descMap.set(key, arr);
    }
  }
  const dupDescPages = [...descMap.values()]
    .filter((arr) => arr.length > 1)
    .flat();
  if (dupDescPages.length > 0) {
    items.push({
      id: "meta-desc-duplicate",
      category: "Meta Descriptions",
      severity: severity(dupDescPages.length, total),
      title: "Duplicate meta descriptions",
      description:
        "Identical meta descriptions across pages reduce their effectiveness and may signal thin content to search engines.",
      affectedPages: dupDescPages.map(pageRef),
      actionSteps: [
        "Write a unique description for every page",
        "Highlight what makes each page different",
      ],
    });
  }

  // ── Headings ────────────────────────────────────────────────────────

  const missingH1 = pages.filter(
    (p) => p.seo.headings.filter((h) => h.tag === "h1").length === 0
  );
  if (missingH1.length > 0) {
    items.push({
      id: "headings-missing-h1",
      category: "Headings",
      severity: severity(missingH1.length, total),
      title: "Missing H1 heading",
      description:
        "The H1 tag signals the primary topic of the page to search engines. Pages without one may rank poorly.",
      affectedPages: missingH1.map(pageRef),
      actionSteps: [
        "Add exactly one H1 heading per page",
        "Make the H1 descriptive and include your primary keyword",
        "Place the H1 early in the page content",
      ],
    });
  }

  const multipleH1 = pages.filter(
    (p) => p.seo.headings.filter((h) => h.tag === "h1").length > 1
  );
  if (multipleH1.length > 0) {
    items.push({
      id: "headings-multiple-h1",
      category: "Headings",
      severity: severity(multipleH1.length, total),
      title: "Multiple H1 headings",
      description:
        "Using more than one H1 dilutes the primary topic signal. Each page should have exactly one H1.",
      affectedPages: multipleH1.map(pageRef),
      actionSteps: [
        "Keep only one H1 per page",
        "Demote secondary H1 tags to H2 or lower",
        "Ensure the remaining H1 accurately describes the page topic",
      ],
    });
  }

  const emptyHeadings = pages.filter(
    (p) => p.seo.headings.some((h) => !h.text || h.text.trim().length === 0)
  );
  if (emptyHeadings.length > 0) {
    items.push({
      id: "headings-empty",
      category: "Headings",
      severity: severity(emptyHeadings.length, total),
      title: "Empty heading tags",
      description:
        "Empty headings provide no value to users or search engines and may indicate layout misuse of heading elements.",
      affectedPages: emptyHeadings.map(pageRef),
      actionSteps: [
        "Add descriptive text to all heading elements",
        "Remove heading tags used purely for styling — use CSS instead",
      ],
    });
  }

  // ── Image Alt ───────────────────────────────────────────────────────

  const missingAlt = pages.filter(
    (p) => p.seo.imageCount > 0 && p.seo.imagesWithoutAlt > 0
  );
  if (missingAlt.length > 0) {
    items.push({
      id: "images-missing-alt",
      category: "Image Alt",
      severity: severity(missingAlt.length, total),
      title: "Images missing alt text",
      description:
        "Alt text improves accessibility and helps search engines understand image content. Missing alt text hurts both.",
      affectedPages: missingAlt.map(pageRef),
      actionSteps: [
        "Add descriptive alt text to every <img> element",
        "Describe the image content concisely (under 125 chars)",
        "Include relevant keywords naturally — avoid keyword stuffing",
        "Use empty alt=\"\" only for purely decorative images",
      ],
    });
  }

  // ── Internal Linking ────────────────────────────────────────────────

  const orphanPages = pages.filter((p) => p.seo.internalLinkCount === 0);
  if (orphanPages.length > 0) {
    items.push({
      id: "links-orphan",
      category: "Internal Linking",
      severity: severity(orphanPages.length, total, true),
      title: "Orphan pages (no internal links)",
      description:
        "Pages with zero internal links are isolated from your site structure, making them hard to discover for both users and crawlers.",
      affectedPages: orphanPages.map(pageRef),
      actionSteps: [
        "Add contextual internal links from related pages",
        "Include these pages in navigation menus or sitemaps",
        "Consider whether orphan pages should be removed or redirected",
      ],
    });
  }

  const fewLinks = pages.filter(
    (p) => p.seo.internalLinkCount > 0 && p.seo.internalLinkCount < 3
  );
  if (fewLinks.length > 0) {
    items.push({
      id: "links-few",
      category: "Internal Linking",
      severity: severity(fewLinks.length, total),
      title: "Pages with very few internal links (<3)",
      description:
        "Pages with fewer than 3 internal links have weak connectivity, limiting PageRank flow and discoverability.",
      affectedPages: fewLinks.map(pageRef),
      actionSteps: [
        "Add relevant internal links within the page content",
        "Link to related articles, products, or categories",
        "Add breadcrumb navigation if not already present",
      ],
    });
  }

  // ── Structured Data ─────────────────────────────────────────────────

  const noStructuredData = pages.filter((p) => !p.seo.hasStructuredData);
  if (noStructuredData.length > 0) {
    items.push({
      id: "structured-data-missing",
      category: "Structured Data",
      severity: severity(noStructuredData.length, total),
      title: "No structured data (JSON-LD)",
      description:
        "Structured data enables rich snippets in search results (stars, prices, FAQs) which can dramatically increase CTR.",
      affectedPages: noStructuredData.map(pageRef),
      actionSteps: [
        "Add JSON-LD structured data appropriate for each page type",
        "Use Schema.org types like Article, Product, FAQ, or Organization",
        "Validate structured data with Google's Rich Results Test",
      ],
    });
  }

  // ── Performance ─────────────────────────────────────────────────────

  const slowPages = pages.filter(
    (p) => p.seo.performance && p.seo.performance.responseTimeMs > 3000
  );
  if (slowPages.length > 0) {
    items.push({
      id: "perf-slow",
      category: "Performance",
      severity: severity(slowPages.length, total),
      title: "Slow response time (>3s)",
      description:
        "Pages that take over 3 seconds to respond frustrate users and may be penalized by search engines (Core Web Vitals).",
      affectedPages: slowPages.map(pageRef),
      actionSteps: [
        "Optimize server response time (TTFB)",
        "Enable server-side caching for static or semi-static pages",
        "Review database queries and API calls for bottlenecks",
        "Consider a CDN for geographically distributed users",
      ],
    });
  }

  const noCompression = pages.filter(
    (p) => p.seo.performance && !p.seo.performance.hasCompression
  );
  if (noCompression.length > 0) {
    items.push({
      id: "perf-no-compression",
      category: "Performance",
      severity: severity(noCompression.length, total),
      title: "Missing response compression",
      description:
        "Pages served without gzip or Brotli compression use more bandwidth and load slower than necessary.",
      affectedPages: noCompression.map(pageRef),
      actionSteps: [
        "Enable gzip or Brotli compression on your web server",
        "Verify compression is active with curl -I or browser DevTools",
        "Ensure your CDN or reverse proxy preserves compression headers",
      ],
    });
  }

  // ── i18n ────────────────────────────────────────────────────────────

  const arabicNoRtl = pages.filter(
    (p) => p.seo.i18n?.hasArabicContent && p.seo.i18n.dir !== "rtl"
  );
  if (arabicNoRtl.length > 0) {
    items.push({
      id: "i18n-arabic-no-rtl",
      category: "i18n",
      severity: severity(arabicNoRtl.length, total),
      title: "Arabic content without RTL direction",
      description:
        "Pages containing Arabic text but lacking dir=\"rtl\" will render text incorrectly, harming readability and user experience.",
      affectedPages: arabicNoRtl.map(pageRef),
      actionSteps: [
        "Add dir=\"rtl\" to the <html> or relevant container element",
        "Set lang=\"ar\" on the <html> tag",
        "Test the page layout in RTL mode to ensure proper alignment",
      ],
    });
  }

  // ── Social / OG ─────────────────────────────────────────────────────

  const missingOgTitle = pages.filter((p) => !p.seo.meta.ogTitle);
  const missingOgDesc = pages.filter((p) => !p.seo.meta.ogDescription);
  const missingOgImage = pages.filter((p) => !p.seo.meta.ogImage);

  const ogAffected = new Map<string, CrawlPageResult>();
  for (const p of [...missingOgTitle, ...missingOgDesc, ...missingOgImage]) {
    ogAffected.set(p.url, p);
  }
  const ogPages = [...ogAffected.values()];

  if (ogPages.length > 0) {
    const parts: string[] = [];
    if (missingOgTitle.length > 0) parts.push(`${missingOgTitle.length} missing og:title`);
    if (missingOgDesc.length > 0) parts.push(`${missingOgDesc.length} missing og:description`);
    if (missingOgImage.length > 0) parts.push(`${missingOgImage.length} missing og:image`);

    items.push({
      id: "social-og-missing",
      category: "Social/OG",
      severity: severity(ogPages.length, total),
      title: "Missing Open Graph tags",
      description: `Pages are missing Open Graph metadata needed for rich social sharing previews: ${parts.join(", ")}.`,
      affectedPages: ogPages.map(pageRef),
      actionSteps: [
        "Add og:title, og:description, and og:image to every page",
        "Use compelling images (1200x630px recommended) for og:image",
        "Test previews with Facebook Sharing Debugger or Twitter Card Validator",
      ],
    });
  }

  // ── URL Structure ───────────────────────────────────────────────────

  const longUrls = pages.filter((p) => {
    try {
      return new URL(p.url).pathname.length > 100;
    } catch {
      return false;
    }
  });
  if (longUrls.length > 0) {
    items.push({
      id: "url-too-long",
      category: "URL Structure",
      severity: severity(longUrls.length, total),
      title: "Very long URLs (>100 chars in path)",
      description:
        "Excessively long URLs are harder to share, may be truncated in SERPs, and can signal poor site architecture.",
      affectedPages: longUrls.map(pageRef),
      actionSteps: [
        "Shorten URL paths to be concise and descriptive",
        "Remove unnecessary parameters and nesting",
        "Use hyphens to separate words instead of underscores or camelCase",
      ],
    });
  }

  // ── Compute overall score ───────────────────────────────────────────

  let scoreSum = 0;
  for (const p of pages) {
    const result = scoreSeo({ url: p.url, title: p.title, seo: p.seo });
    scoreSum += result.score;
  }
  const overallScore = Math.round(scoreSum / total);

  const criticalCount = items.filter((i) => i.severity === "critical").length;
  const importantCount = items.filter((i) => i.severity === "important").length;
  const niceToHaveCount = items.filter((i) => i.severity === "nice-to-have").length;

  return {
    items,
    totalIssues: items.length,
    criticalCount,
    importantCount,
    niceToHaveCount,
    overallScore,
  };
}
