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
