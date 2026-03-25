import type { PageSeoData, SeoIssue, SeoScoreResult } from "@/types/canvas";

interface ScorerInput {
  url: string;
  title: string;
  seo: PageSeoData;
}

export function scoreSeo(page: ScorerInput): SeoScoreResult {
  let score = 100;
  const issues: SeoIssue[] = [];
  const checksPassed: string[] = [];

  function deduct(
    points: number,
    severity: SeoIssue["severity"],
    category: string,
    title: string,
    description: string
  ) {
    score -= points;
    issues.push({ severity, category, title, description, pointsDeducted: points });
  }

  const { seo, title } = page;

  // --- Status Code ---
  if (seo.statusCode !== 200) {
    deduct(15, "error", "HTTP", "Non-200 status code", `Page returned status ${seo.statusCode}`);
  } else {
    checksPassed.push("HTTP status 200");
  }

  // --- Title ---
  if (!title || title.trim().length === 0) {
    deduct(10, "error", "Meta Tags", "Page title missing", "No <title> tag found on the page");
  } else if (title.length < 30) {
    deduct(3, "warning", "Meta Tags", "Title too short", `Title is ${title.length} characters (recommended: 30-60)`);
  } else if (title.length > 60) {
    deduct(3, "warning", "Meta Tags", "Title too long", `Title is ${title.length} characters (recommended: 30-60)`);
  } else {
    checksPassed.push("Title length OK");
  }

  // --- Meta Description ---
  const desc = seo.meta.description;
  if (!desc) {
    deduct(10, "error", "Meta Tags", "Meta description missing", "No meta description found");
  } else if (desc.length < 70) {
    deduct(5, "warning", "Meta Tags", "Meta description too short", `Description is ${desc.length} characters (recommended: 70-160)`);
  } else if (desc.length > 160) {
    deduct(3, "warning", "Meta Tags", "Meta description too long", `Description is ${desc.length} characters (recommended: 70-160)`);
  } else {
    checksPassed.push("Meta description length OK");
  }

  // --- H1 Tags ---
  const h1Count = seo.headings.filter((h) => h.tag === "h1").length;
  if (h1Count === 0) {
    deduct(10, "error", "Content", "No H1 tag", "Page has no H1 heading element");
  } else if (h1Count > 1) {
    deduct(5, "warning", "Content", "Multiple H1 tags", `Found ${h1Count} H1 tags (recommended: exactly 1)`);
  } else {
    checksPassed.push("Single H1 tag");
  }

  // --- Images ---
  if (seo.imageCount > 0) {
    if (seo.imagesWithoutAlt > 0) {
      const ratio = seo.imagesWithoutAlt / seo.imageCount;
      const severity = ratio > 0.5 ? "error" : "warning";
      deduct(8, severity, "Images", "Images missing alt text", `${seo.imagesWithoutAlt} of ${seo.imageCount} images have no alt attribute`);
    } else {
      checksPassed.push("All images have alt text");
    }
  } else {
    checksPassed.push("No images to check");
  }

  // --- Canonical URL ---
  if (!seo.meta.canonical) {
    deduct(5, "warning", "Meta Tags", "No canonical URL", "No <link rel='canonical'> found");
  } else {
    checksPassed.push("Canonical URL set");
  }

  // --- Open Graph ---
  if (!seo.meta.ogTitle && !seo.meta.ogDescription) {
    deduct(5, "warning", "Social", "No Open Graph tags", "Missing og:title and og:description");
  } else {
    checksPassed.push("Open Graph tags present");
  }

  // --- Structured Data ---
  if (!seo.hasStructuredData) {
    deduct(5, "info", "Structured Data", "No structured data", "No JSON-LD structured data found");
  } else {
    checksPassed.push("Structured data present");
  }

  // --- Word Count ---
  if (seo.wordCount < 300) {
    deduct(8, "warning", "Content", "Low word count", `Only ${seo.wordCount} words (recommended: 300+)`);
  } else {
    checksPassed.push(`Word count OK (${seo.wordCount})`);
  }

  // --- Viewport ---
  if (!seo.meta.viewport) {
    deduct(5, "warning", "Mobile", "No viewport meta", "Missing <meta name='viewport'> tag");
  } else {
    checksPassed.push("Viewport meta set");
  }

  // --- Language ---
  if (!seo.meta.language) {
    deduct(3, "info", "Accessibility", "No language attribute", "Missing lang attribute on <html>");
  } else {
    checksPassed.push("Language attribute set");
  }

  // --- URL Length ---
  try {
    const pathname = new URL(page.url).pathname;
    if (pathname.length > 75) {
      deduct(3, "warning", "URL", "URL too long", `URL path is ${pathname.length} characters (recommended: under 75)`);
    } else {
      checksPassed.push("URL length OK");
    }
    if (pathname.includes("_")) {
      deduct(2, "warning", "URL", "URL contains underscores", "Use hyphens instead of underscores for better SEO");
    }
  } catch {
    // skip URL checks for invalid URLs
  }

  // --- OG Image ---
  if (!seo.meta.ogImage) {
    deduct(3, "warning", "Social", "No OG image", "Missing og:image — social shares will lack a preview image");
  } else {
    checksPassed.push("OG image set");
  }

  // --- Orphan page (no internal links) ---
  if (seo.internalLinkCount === 0) {
    deduct(5, "warning", "Content", "No internal links", "Page has no internal links — potential orphan page");
  }

  // --- Heading hierarchy gaps ---
  if (seo.headings.length > 1) {
    const levels = seo.headings.map((h) => parseInt(h.tag.slice(1)));
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] - levels[i - 1] > 1) {
        deduct(3, "warning", "Content", "Heading hierarchy gap", `Skipped heading level: H${levels[i - 1]} → H${levels[i]}`);
        break;
      }
    }
  }

  // --- Title matches H1 exactly ---
  if (title && h1Count === 1) {
    const h1Text = seo.headings.find((h) => h.tag === "h1")?.text;
    if (h1Text && h1Text.trim().toLowerCase() === title.trim().toLowerCase()) {
      deduct(0, "info", "Content", "Title matches H1", "Title and H1 are identical — consider differentiating for better SEO");
    }
  }

  // --- Performance checks ---
  if (seo.performance) {
    if (seo.performance.htmlSizeBytes > 200 * 1024) {
      const sizeKb = Math.round(seo.performance.htmlSizeBytes / 1024);
      deduct(5, "warning", "Performance", "Large HTML size", `HTML is ${sizeKb}KB (recommended: under 200KB)`);
    } else {
      checksPassed.push("HTML size OK");
    }

    if (seo.performance.responseTimeMs > 3000) {
      deduct(5, "warning", "Performance", "Slow response", `Response took ${Math.round(seo.performance.responseTimeMs / 1000)}s (recommended: under 3s)`);
    } else {
      checksPassed.push("Response time OK");
    }

    if (!seo.performance.hasCompression) {
      deduct(3, "warning", "Performance", "No compression", "Response lacks content-encoding (gzip/brotli)");
    }

    if (!seo.performance.cacheControl) {
      deduct(2, "info", "Performance", "No cache-control", "No Cache-Control header set");
    }
  }

  // --- i18n / RTL checks ---
  if (seo.i18n) {
    if (seo.i18n.hasArabicContent && seo.i18n.dir !== "rtl") {
      deduct(8, "error", "i18n", "Arabic content without RTL", "Page has Arabic content but lacks dir=\"rtl\" attribute");
    }

    if (seo.i18n.hasArabicContent && seo.meta.language && !seo.meta.language.startsWith("ar")) {
      deduct(5, "warning", "i18n", "Language mismatch", `Arabic content detected but lang="${seo.meta.language}"`);
    }

    if (seo.i18n.hreflangLinks.length > 0) {
      checksPassed.push(`Hreflang tags present (${seo.i18n.hreflangLinks.length} alternates)`);
    } else if (seo.i18n.hasArabicContent) {
      deduct(3, "warning", "i18n", "Missing hreflang", "Arabic content without hreflang alternate links");
    }
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  const parts = [];
  if (errorCount > 0) parts.push(`${errorCount} error${errorCount > 1 ? "s" : ""}`);
  if (warningCount > 0) parts.push(`${warningCount} warning${warningCount > 1 ? "s" : ""}`);
  if (infoCount > 0) parts.push(`${infoCount} info`);
  const summary = `Score: ${score}/100${parts.length > 0 ? ` — ${parts.join(", ")}` : " — All checks passed"}`;

  return { score, issues, checksPassed, summary };
}

export function formatSeoScoreForPrompt(result: SeoScoreResult): string {
  const lines: string[] = [];
  lines.push(`=== Deterministic SEO Score: ${result.score}/100 ===`);

  const errors = result.issues.filter((i) => i.severity === "error");
  const warnings = result.issues.filter((i) => i.severity === "warning");
  const infos = result.issues.filter((i) => i.severity === "info");

  if (errors.length > 0) {
    lines.push("\nERRORS:");
    for (const e of errors) {
      lines.push(`- [${e.category}] ${e.title}: ${e.description} (-${e.pointsDeducted} pts)`);
    }
  }

  if (warnings.length > 0) {
    lines.push("\nWARNINGS:");
    for (const w of warnings) {
      lines.push(`- [${w.category}] ${w.title}: ${w.description} (-${w.pointsDeducted} pts)`);
    }
  }

  if (infos.length > 0) {
    lines.push("\nINFO:");
    for (const i of infos) {
      lines.push(`- [${i.category}] ${i.title}: ${i.description} (-${i.pointsDeducted} pts)`);
    }
  }

  if (result.checksPassed.length > 0) {
    lines.push(`\nPASSED: ${result.checksPassed.join(", ")}`);
  }

  lines.push("\nUse the above deterministic analysis as ground truth. Focus your recommendations on:");
  lines.push("1. Actionable fixes for the issues above");
  lines.push("2. Content quality analysis beyond what automated checks can detect");
  lines.push("3. Technology and feature detection");
  lines.push("4. Content gaps and strategic recommendations");

  return lines.join("\n");
}
