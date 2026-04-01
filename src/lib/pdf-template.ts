import { jsPDF } from "jspdf";
import type { CrawlResult } from "@/types/canvas";
import { scoreSeo } from "@/lib/seo-scorer";
import type { Locale } from "@/lib/i18n";
import { t as translate } from "@/lib/i18n";

// Colors
const C = {
  primary: [99, 102, 241] as const,     // #6366f1
  green: [34, 197, 94] as const,        // #22c55e
  amber: [245, 158, 11] as const,       // #f59e0b
  red: [239, 68, 68] as const,          // #ef4444
  zinc900: [24, 24, 27] as const,       // #18181b
  zinc700: [63, 63, 70] as const,       // #3f3f46
  zinc500: [113, 113, 122] as const,    // #71717a
  zinc400: [161, 161, 170] as const,    // #a1a1aa
  zinc200: [228, 228, 231] as const,    // #e4e4e7
  zinc100: [244, 244, 245] as const,    // #f4f4f5
  zinc50: [250, 250, 250] as const,     // #fafafa
  white: [255, 255, 255] as const,
};

type RGB = readonly [number, number, number];

function scoreColor(score: number): RGB {
  if (score >= 80) return C.green;
  if (score >= 50) return C.amber;
  return C.red;
}

function scoreBgColor(score: number): RGB {
  if (score >= 80) return [220, 252, 231];
  if (score >= 50) return [254, 249, 195];
  return [254, 226, 226];
}

export function generatePdfBuffer(data: CrawlResult, locale: Locale): ArrayBuffer {
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(locale, key, params);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;  // A4 width
  const H = 297;  // A4 height
  const M = 20;   // margin
  const CW = W - 2 * M; // content width

  let domain = "";
  try { domain = new URL(data.rootUrl).hostname; } catch { domain = data.rootUrl; }

  const pages = data.pages;
  const scores = pages.map(p => scoreSeo({ url: p.url, title: p.title, seo: p.seo }));
  const avgScore = Math.round(scores.reduce((s, r) => s + r.score, 0) / (scores.length || 1));
  const totalIssues = scores.reduce((s, r) => s + r.issues.length, 0);
  const totalWords = pages.reduce((s, p) => s + p.seo.wordCount, 0);

  const missingDesc = pages.filter(p => !p.seo.meta.description).length;
  const missingAlt = pages.reduce((s, p) => s + p.seo.imagesWithoutAlt, 0);
  const slowPages = pages.filter(p => (p.seo.performance?.responseTimeMs ?? 0) > 3000).length;
  const missingOg = pages.filter(p => !p.seo.meta.ogTitle).length;
  const missingCanonical = pages.filter(p => !p.seo.meta.canonical).length;
  const botBlocked = pages.filter(p => p.botProtection).length;

  const pagesWithPerf = pages.filter(p => p.seo.performance);
  const avgResponseTime = pagesWithPerf.length > 0
    ? Math.round(pagesWithPerf.reduce((s, p) => s + (p.seo.performance?.responseTimeMs ?? 0), 0) / pagesWithPerf.length)
    : null;

  const date = new Date().toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  // --- Helper functions ---
  function setColor(c: RGB) { doc.setTextColor(c[0], c[1], c[2]); }
  function setFill(c: RGB) { doc.setFillColor(c[0], c[1], c[2]); }
  function setDraw(c: RGB) { doc.setDrawColor(c[0], c[1], c[2]); }

  function truncate(str: string, maxLen: number): string {
    return str.length > maxLen ? str.slice(0, maxLen - 1) + "…" : str;
  }

  function addFooter() {
    setDraw(C.zinc200);
    doc.line(M, H - 15, W - M, H - 15);
    doc.setFontSize(6);
    setColor(C.zinc400);
    doc.text("Baseera | baseera.xyz", M, H - 10);
    doc.text(`${domain}`, W - M, H - 10, { align: "right" });
  }

  function sectionHeader(y: number, title: string): number {
    setFill(C.primary);
    doc.rect(M, y, 2, 8, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    setColor(C.zinc900);
    doc.text(title, M + 5, y + 6);
    return y + 14;
  }

  function statBox(x: number, y: number, w: number, value: string, label: string, color?: RGB) {
    setFill(C.zinc50);
    setDraw(C.zinc200);
    doc.roundedRect(x, y, w, 24, 2, 2, "FD");
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    setColor(color || C.zinc900);
    doc.text(value, x + w / 2, y + 11, { align: "center" });
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    setColor(C.zinc500);
    doc.text(label.toUpperCase(), x + w / 2, y + 18, { align: "center" });
  }

  function findingRow(y: number, dotColor: RGB, text: string): number {
    setFill(dotColor);
    doc.circle(M + 3, y + 1.5, 1.2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setColor(C.zinc700);
    doc.text(truncate(text, 90), M + 7, y + 3);
    return y + 6;
  }

  function ensureSpace(y: number, needed: number): number {
    if (y + needed > H - 20) {
      doc.addPage();
      addFooter();
      return M;
    }
    return y;
  }

  // ==================== COVER PAGE ====================
  setFill(C.primary);
  doc.rect(0, 0, W, 6, "F");

  doc.setFontSize(36);
  doc.setFont("helvetica", "bold");
  setColor(C.primary);
  doc.text("Baseera", W / 2, 100, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setColor(C.zinc500);
  doc.text("B A S E E R A", W / 2, 112, { align: "center" });

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  setColor(C.zinc900);
  doc.text(locale === "ar" ? "SEO Analysis Report" : "SEO Analysis Report", W / 2, 140, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  setColor(C.zinc700);
  doc.text(domain, W / 2, 152, { align: "center" });

  doc.setFontSize(10);
  setColor(C.zinc500);
  doc.text(date, W / 2, 162, { align: "center" });

  doc.setFontSize(7);
  setColor(C.zinc400);
  doc.text("baseera.xyz — AI-Powered SEO Audit", W / 2, H - 20, { align: "center" });

  // ==================== EXECUTIVE SUMMARY ====================
  doc.addPage();
  addFooter();
  let y = M;

  y = sectionHeader(y, "Executive Summary");

  // Stats row
  const statW = (CW - 9) / 4;
  statBox(M, y, statW, String(avgScore), "Avg SEO Score", scoreColor(avgScore));
  statBox(M + statW + 3, y, statW, String(pages.length), "Pages Crawled");
  statBox(M + (statW + 3) * 2, y, statW, String(totalIssues), "Total Issues", totalIssues > 0 ? C.amber : C.green);
  const wordsStr = totalWords >= 1000 ? `${(totalWords / 1000).toFixed(1)}k` : String(totalWords);
  statBox(M + (statW + 3) * 3, y, statW, wordsStr, "Total Words");
  y += 30;

  // Secondary stats
  if (avgResponseTime !== null) {
    const stat2W = (CW - 3) / 2;
    statBox(M, y, stat2W, `${avgResponseTime}ms`, "Avg Response Time", avgResponseTime > 3000 ? C.red : C.zinc900);
    statBox(M + stat2W + 3, y, stat2W, String(pages.filter(p => p.seo.hasStructuredData).length), "With Schema");
    y += 30;
  }

  // Key Findings
  y = sectionHeader(y, "Key Findings");

  if (missingDesc > 0)
    y = findingRow(y, C.red, `${missingDesc} page${missingDesc > 1 ? "s" : ""} missing meta description`);
  if (missingAlt > 0)
    y = findingRow(y, C.amber, `${missingAlt} image${missingAlt > 1 ? "s" : ""} without alt text`);
  if (missingCanonical > 0)
    y = findingRow(y, C.amber, `${missingCanonical} page${missingCanonical > 1 ? "s" : ""} without canonical URL`);
  if (missingOg > 0)
    y = findingRow(y, C.amber, `${missingOg} page${missingOg > 1 ? "s" : ""} missing Open Graph tags`);
  if (slowPages > 0)
    y = findingRow(y, C.red, `${slowPages} page${slowPages > 1 ? "s" : ""} with response time over 3 seconds`);
  if (botBlocked > 0)
    y = findingRow(y, C.zinc500, `${botBlocked} page${botBlocked > 1 ? "s" : ""} blocked by bot protection`);
  if (totalIssues === 0)
    y = findingRow(y, C.green, "No critical issues found — great job!");

  y += 6;

  // Quick Wins
  const quickWins: { title: string; desc: string }[] = [];
  if (missingDesc > 0) quickWins.push({ title: `Add meta descriptions to ${missingDesc} page${missingDesc > 1 ? "s" : ""}`, desc: "Meta descriptions improve click-through rates from search results." });
  if (missingAlt > 0) quickWins.push({ title: `Add alt text to ${missingAlt} image${missingAlt > 1 ? "s" : ""}`, desc: "Alt text improves accessibility and image search rankings." });
  if (missingCanonical > 0 && quickWins.length < 3) quickWins.push({ title: `Set canonical URLs on ${missingCanonical} page${missingCanonical > 1 ? "s" : ""}`, desc: "Canonical URLs prevent duplicate content issues." });

  if (quickWins.length > 0) {
    y = sectionHeader(y, "Quick Wins");
    for (let i = 0; i < Math.min(quickWins.length, 3); i++) {
      y = ensureSpace(y, 18);
      setFill([238, 242, 255]); // indigo-50
      setDraw([199, 210, 254]); // indigo-200
      doc.roundedRect(M, y, CW, 14, 2, 2, "FD");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      setColor(C.primary);
      doc.text(`${i + 1}. ${quickWins[i].title}`, M + 4, y + 5);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      setColor(C.zinc700);
      doc.text(quickWins[i].desc, M + 4, y + 11);
      y += 18;
    }
  }

  // ==================== PAGE-BY-PAGE ANALYSIS ====================
  doc.addPage();
  addFooter();
  y = M;

  y = sectionHeader(y, "Page-by-Page Analysis");

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const seo = scores[i];
    let path = page.url;
    try { path = new URL(page.url).pathname; } catch {}

    const errorsAndWarnings = seo.issues.filter(iss => iss.severity === "error" || iss.severity === "warning");
    const cardHeight = 32 + Math.min(errorsAndWarnings.length, 4) * 5;

    y = ensureSpace(y, cardHeight);

    // Card border
    setDraw(C.zinc200);
    doc.roundedRect(M, y, CW, cardHeight, 2, 2, "D");

    // Header bg
    setFill(C.zinc50);
    doc.rect(M + 0.5, y + 0.5, CW - 1, 14, "F");

    // URL & Title
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    setColor(C.zinc500);
    doc.text(truncate(path, 80), M + 4, y + 5);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    setColor(C.zinc900);
    doc.text(truncate(page.title || "(no title)", 60), M + 4, y + 12);

    // Score badge
    setFill(scoreColor(seo.score));
    doc.roundedRect(W - M - 22, y + 3, 18, 8, 2, 2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    setColor(C.white);
    doc.text(`${seo.score}/100`, W - M - 13, y + 9, { align: "center" });

    // Metrics row
    let mx = M + 4;
    const metricY = y + 20;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    setColor(C.zinc500);

    const metrics = [
      `${page.seo.wordCount} words`,
      `${page.seo.internalLinkCount} int. links`,
      `${page.seo.imageCount} images`,
    ];
    if (page.seo.performance) metrics.push(`${page.seo.performance.responseTimeMs}ms`);
    doc.text(metrics.join("   •   "), mx, metricY);

    // Issues
    let iy = metricY + 5;
    for (let j = 0; j < Math.min(errorsAndWarnings.length, 4); j++) {
      const issue = errorsAndWarnings[j];
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      setColor(issue.severity === "error" ? C.red : C.amber);
      doc.text(issue.severity.toUpperCase(), M + 4, iy);
      doc.setFont("helvetica", "normal");
      setColor(C.zinc700);
      doc.text(truncate(`${issue.title}: ${issue.description}`, 85), M + 18, iy);
      iy += 5;
    }
    if (errorsAndWarnings.length > 4) {
      doc.setFontSize(6);
      setColor(C.zinc400);
      doc.text(`+${errorsAndWarnings.length - 4} more issues`, M + 4, iy);
    }

    y += cardHeight + 4;
  }

  // ==================== METHODOLOGY ====================
  y = ensureSpace(y, 80);
  if (y === M) {
    // New page was added
  } else {
    doc.addPage();
    addFooter();
    y = M;
  }

  y = sectionHeader(y, "Methodology");

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  setColor(C.zinc700);

  const methodText = "This report was generated by Baseera (baseera.xyz), an AI-powered SEO analysis tool. Each page is scored on a 100-point scale based on the following criteria:";
  const methodLines = doc.splitTextToSize(methodText, CW);
  doc.text(methodLines, M, y + 4);
  y += methodLines.length * 3.5 + 6;

  const rules = [
    "HTTP status code (200 expected)",
    "Page title presence and length (50-60 characters ideal)",
    "Meta description presence and length (120-160 characters ideal)",
    "Heading structure (single H1, proper hierarchy)",
    "Image alt text coverage",
    "Canonical URL configuration",
    "Open Graph / social meta tags",
    "Structured data (JSON-LD / Schema.org)",
    "Response time and performance metrics",
    "Internal and external link profiles",
  ];

  for (const rule of rules) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    setColor(C.primary);
    doc.text("•", M + 2, y);
    doc.setFont("helvetica", "normal");
    setColor(C.zinc700);
    doc.text(rule, M + 6, y);
    y += 4;
  }

  y += 6;
  const scoreText = "Scores are categorized as: Good (80-100), Needs Improvement (50-79), and Poor (0-49). Issues are classified by severity: errors (critical problems), warnings (improvements recommended), and info (minor suggestions).";
  const scoreLines = doc.splitTextToSize(scoreText, CW);
  doc.text(scoreLines, M, y);
  y += scoreLines.length * 3.5 + 10;

  // Footer block
  y = ensureSpace(y, 30);
  setFill(C.zinc50);
  setDraw(C.zinc200);
  doc.roundedRect(M, y, CW, 25, 3, 3, "FD");
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  setColor(C.primary);
  doc.text("Baseera", W / 2, y + 10, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  setColor(C.zinc500);
  doc.text("B A S E E R A", W / 2, y + 16, { align: "center" });
  doc.setFontSize(6);
  setColor(C.zinc400);
  doc.text("baseera.xyz — AI-Powered SEO Audit", W / 2, y + 21, { align: "center" });

  return doc.output("arraybuffer");
}
