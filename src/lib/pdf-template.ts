import type { CrawlResult, CrawlPageResult } from "@/types/canvas";
import { scoreSeo } from "@/lib/seo-scorer";
import type { Locale } from "@/lib/i18n";
import { t as translate } from "@/lib/i18n";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "#dcfce7";
  if (score >= 50) return "#fef9c3";
  return "#fee2e2";
}

export function generatePdfHtml(data: CrawlResult, locale: Locale): string {
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(locale, key, params);
  const isRtl = locale === "ar";
  const dir = isRtl ? "rtl" : "ltr";

  let domain = "";
  try {
    domain = new URL(data.rootUrl).hostname;
  } catch {
    domain = data.rootUrl;
  }

  const pages = data.pages;
  const scores = pages.map((p) =>
    scoreSeo({ url: p.url, title: p.title, seo: p.seo })
  );
  const avgScore = Math.round(
    scores.reduce((s, r) => s + r.score, 0) / (scores.length || 1)
  );
  const totalIssues = scores.reduce((s, r) => s + r.issues.length, 0);
  const totalWords = pages.reduce((s, p) => s + p.seo.wordCount, 0);

  const missingDesc = pages.filter((p) => !p.seo.meta.description).length;
  const missingAlt = pages.reduce((s, p) => s + p.seo.imagesWithoutAlt, 0);
  const slowPages = pages.filter(
    (p) => (p.seo.performance?.responseTimeMs ?? 0) > 3000
  ).length;
  const missingOg = pages.filter((p) => !p.seo.meta.ogTitle).length;
  const missingCanonical = pages.filter((p) => !p.seo.meta.canonical).length;
  const botBlocked = pages.filter((p) => p.botProtection).length;

  const pagesWithPerf = pages.filter((p) => p.seo.performance);
  const avgResponseTime =
    pagesWithPerf.length > 0
      ? Math.round(
          pagesWithPerf.reduce(
            (s, p) => s + (p.seo.performance?.responseTimeMs ?? 0),
            0
          ) / pagesWithPerf.length
        )
      : null;

  const date = new Date().toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Quick wins
  const quickWins: { title: string; description: string }[] = [];
  if (missingDesc > 0) {
    quickWins.push({
      title: `Add meta descriptions to ${missingDesc} page${missingDesc > 1 ? "s" : ""}`,
      description: "Meta descriptions improve click-through rates from search results.",
    });
  }
  if (missingAlt > 0) {
    quickWins.push({
      title: `Add alt text to ${missingAlt} image${missingAlt > 1 ? "s" : ""}`,
      description: "Alt text improves accessibility and image search rankings.",
    });
  }
  if (missingCanonical > 0 && quickWins.length < 3) {
    quickWins.push({
      title: `Set canonical URLs on ${missingCanonical} page${missingCanonical > 1 ? "s" : ""}`,
      description: "Canonical URLs prevent duplicate content issues.",
    });
  }

  // Build page cards HTML
  const pageCardsHtml = pages
    .map((page, i) => {
      const seo = scores[i];
      let path = page.url;
      try {
        path = new URL(page.url).pathname;
      } catch {}

      const errorsAndWarnings = seo.issues.filter(
        (iss) => iss.severity === "error" || iss.severity === "warning"
      );

      const screenshotHtml =
        page.screenshot && page.screenshot.length > 10
          ? `<img src="${escapeHtml(page.screenshot)}" class="screenshot" />`
          : "";

      const issuesHtml = errorsAndWarnings
        .slice(0, 5)
        .map(
          (issue) =>
            `<div class="issue-row">
              <span class="issue-severity" style="color: ${issue.severity === "error" ? "#ef4444" : "#f59e0b"}">${issue.severity.toUpperCase()}</span>
              <span class="issue-text">${escapeHtml(issue.title)}: ${escapeHtml(issue.description)}</span>
            </div>`
        )
        .join("");

      const badgesHtml = [
        page.seo.hasStructuredData
          ? `<span class="badge" style="color:#22c55e;border-color:#bbf7d0">Schema</span>`
          : "",
        (page.products?.length ?? 0) > 0
          ? `<span class="badge" style="color:#6366f1;border-color:#c7d2fe">${page.products!.length} product${page.products!.length > 1 ? "s" : ""}</span>`
          : "",
        page.botProtection
          ? `<span class="badge" style="color:#f59e0b;border-color:#fde68a">${escapeHtml(page.botProtection)}</span>`
          : "",
      ]
        .filter(Boolean)
        .join("");

      return `
        <div class="page-card">
          <div class="page-card-header">
            ${screenshotHtml}
            <div class="page-info">
              <div class="page-url">${escapeHtml(path)}</div>
              <div class="page-title">${escapeHtml(page.title || "(no title)")}</div>
              <div class="score-badge" style="background-color: ${getScoreColor(seo.score)}">${seo.score}/100</div>
            </div>
          </div>
          <div class="page-card-body">
            <div class="metrics-row">
              <span><strong>${page.seo.wordCount}</strong> words</span>
              <span><strong>${page.seo.internalLinkCount}</strong> int. links</span>
              <span><strong>${page.seo.imageCount}</strong> images</span>
              ${page.seo.performance ? `<span><strong>${page.seo.performance.responseTimeMs}ms</strong> response</span>` : ""}
            </div>
            ${badgesHtml ? `<div class="badge-row">${badgesHtml}</div>` : ""}
            ${issuesHtml ? `<div class="issues-section">${issuesHtml}</div>` : ""}
            ${errorsAndWarnings.length > 5 ? `<div class="more-issues">+${errorsAndWarnings.length - 5} more issues</div>` : ""}
          </div>
        </div>`;
    })
    .join("");

  // Finding items
  const findings = [
    missingDesc > 0
      ? `<div class="finding"><span class="dot" style="background:#ef4444"></span>${missingDesc} page${missingDesc > 1 ? "s" : ""} missing meta description</div>`
      : "",
    missingAlt > 0
      ? `<div class="finding"><span class="dot" style="background:#f59e0b"></span>${missingAlt} image${missingAlt > 1 ? "s" : ""} without alt text</div>`
      : "",
    missingCanonical > 0
      ? `<div class="finding"><span class="dot" style="background:#f59e0b"></span>${missingCanonical} page${missingCanonical > 1 ? "s" : ""} without canonical URL</div>`
      : "",
    missingOg > 0
      ? `<div class="finding"><span class="dot" style="background:#f59e0b"></span>${missingOg} page${missingOg > 1 ? "s" : ""} missing Open Graph tags</div>`
      : "",
    slowPages > 0
      ? `<div class="finding"><span class="dot" style="background:#ef4444"></span>${slowPages} page${slowPages > 1 ? "s" : ""} with response time over 3 seconds</div>`
      : "",
    botBlocked > 0
      ? `<div class="finding"><span class="dot" style="background:#71717a"></span>${botBlocked} page${botBlocked > 1 ? "s" : ""} blocked by bot protection</div>`
      : "",
    totalIssues === 0
      ? `<div class="finding"><span class="dot" style="background:#22c55e"></span>No critical issues found — great job!</div>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const quickWinsHtml = quickWins
    .slice(0, 3)
    .map(
      (win, i) =>
        `<div class="quick-win">
          <div class="quick-win-title">${i + 1}. ${escapeHtml(win.title)}</div>
          <div class="quick-win-desc">${escapeHtml(win.description)}</div>
        </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, 'Noto Sans Arabic', 'Tahoma', sans-serif;
    font-size: 10px;
    color: #18181b;
    background: #fff;
    direction: ${dir};
  }

  /* Cover Page */
  .cover-page {
    height: 100vh;
    display: flex;
    flex-direction: column;
    page-break-after: always;
  }
  .cover-accent { height: 8px; background: #6366f1; }
  .cover-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 60px;
  }
  .cover-brand { font-size: 48px; font-weight: 700; color: #6366f1; margin-bottom: 8px; }
  .cover-subtitle { font-size: 14px; color: #71717a; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 40px; }
  .cover-title { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
  .cover-domain { font-size: 16px; color: #3f3f46; margin-bottom: 4px; }
  .cover-date { font-size: 11px; color: #71717a; }
  .cover-footer { padding: 20px; text-align: center; }
  .cover-footer-text { font-size: 9px; color: #a1a1aa; }

  /* Standard Page */
  .report-page { padding: 40px; padding-bottom: 60px; page-break-after: always; }
  .report-page:last-child { page-break-after: auto; }

  /* Section Headers */
  .section-header {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    margin-top: 4px;
  }
  .section-bar {
    width: 3px;
    height: 16px;
    background: #6366f1;
    margin-inline-end: 8px;
    border-radius: 2px;
  }
  .section-title { font-size: 14px; font-weight: 700; }

  /* Stats Row */
  .stats-row {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }
  .stat-card {
    flex: 1;
    padding: 12px;
    background: #fafafa;
    border-radius: 6px;
    border: 1px solid #e4e4e7;
    text-align: center;
  }
  .stat-value { font-size: 22px; font-weight: 700; }
  .stat-label {
    font-size: 7px;
    color: #71717a;
    margin-top: 3px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Findings */
  .finding {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
    padding-inline-start: 4px;
    font-size: 9px;
    color: #3f3f46;
  }
  .dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

  /* Quick Wins */
  .quick-win {
    padding: 10px;
    background: #eef2ff;
    border-radius: 4px;
    border: 1px solid #c7d2fe;
    margin-bottom: 6px;
  }
  .quick-win-title { font-size: 9px; font-weight: 700; color: #4f46e5; margin-bottom: 2px; }
  .quick-win-desc { font-size: 8px; color: #3f3f46; }

  /* Page Cards */
  .page-card {
    margin-bottom: 12px;
    border-radius: 6px;
    border: 1px solid #e4e4e7;
    overflow: hidden;
    page-break-inside: avoid;
  }
  .page-card-header {
    display: flex;
    padding: 10px;
    background: #fafafa;
    border-bottom: 1px solid #e4e4e7;
    gap: 10px;
    align-items: flex-start;
  }
  .page-card-body { padding: 10px; }
  .screenshot {
    width: 80px;
    height: 50px;
    border-radius: 3px;
    border: 1px solid #e4e4e7;
    object-fit: cover;
    object-position: top;
  }
  .page-info { flex: 1; min-width: 0; }
  .page-url { font-size: 8px; color: #71717a; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .page-title { font-size: 10px; font-weight: 700; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .score-badge {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    color: #fff;
  }
  .metrics-row {
    display: flex;
    gap: 12px;
    margin-top: 6px;
    margin-bottom: 6px;
    font-size: 8px;
    color: #71717a;
  }
  .metrics-row strong { color: #3f3f46; }
  .badge-row { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
  .badge {
    display: inline-block;
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 7px;
    background: #f4f4f5;
    border: 1px solid #e4e4e7;
  }
  .issues-section { margin-top: 6px; }
  .issue-row {
    display: flex;
    gap: 6px;
    margin-bottom: 2px;
    padding-inline-start: 4px;
  }
  .issue-severity { font-size: 7px; font-weight: 700; width: 48px; text-transform: uppercase; flex-shrink: 0; }
  .issue-text { font-size: 7px; color: #3f3f46; }
  .more-issues { font-size: 7px; color: #a1a1aa; padding-inline-start: 4px; margin-top: 2px; }

  /* Methodology */
  .methodology-text { font-size: 8px; color: #3f3f46; line-height: 1.6; margin-bottom: 8px; }
  .methodology-rule { display: flex; gap: 6px; margin-bottom: 3px; }
  .methodology-bullet { font-size: 8px; color: #6366f1; font-weight: 700; }
  .methodology-rule-text { font-size: 8px; color: #3f3f46; }

  /* Footer */
  .footer-block {
    text-align: center;
    margin-top: 24px;
    padding: 16px;
    background: #fafafa;
    border-radius: 6px;
    border: 1px solid #e4e4e7;
  }
  .footer-brand { font-size: 18px; font-weight: 700; color: #6366f1; margin-bottom: 4px; }
  .footer-sub { font-size: 9px; color: #71717a; letter-spacing: 2px; text-transform: uppercase; }
  .footer-link { font-size: 8px; color: #a1a1aa; margin-top: 6px; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover-page">
  <div class="cover-accent"></div>
  <div class="cover-content">
    <div class="cover-brand">بصيـــرة</div>
    <div class="cover-subtitle">B A S E E R A</div>
    <div class="cover-title">${isRtl ? "تقرير تحليل السيو" : "SEO Analysis Report"}</div>
    <div class="cover-domain">${escapeHtml(domain)}</div>
    <div class="cover-date">${date}</div>
  </div>
  <div class="cover-footer">
    <div class="cover-footer-text">baseera.xyz — ${isRtl ? "تدقيق SEO بالذكاء الاصطناعي" : "AI-Powered SEO Audit"}</div>
  </div>
</div>

<!-- EXECUTIVE SUMMARY -->
<div class="report-page">
  <div class="section-header"><div class="section-bar"></div><div class="section-title">${isRtl ? "ملخص تنفيذي" : "Executive Summary"}</div></div>

  <div class="stats-row">
    <div class="stat-card">
      <div class="stat-value" style="color: ${getScoreColor(avgScore)}">${avgScore}</div>
      <div class="stat-label">${isRtl ? "متوسط نقاط السيو" : "Avg SEO Score"}</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${pages.length}</div>
      <div class="stat-label">${isRtl ? "الصفحات المفحوصة" : "Pages Crawled"}</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color: ${totalIssues > 0 ? "#f59e0b" : "#22c55e"}">${totalIssues}</div>
      <div class="stat-label">${isRtl ? "إجمالي المشاكل" : "Total Issues"}</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalWords >= 1000 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords}</div>
      <div class="stat-label">${isRtl ? "إجمالي الكلمات" : "Total Words"}</div>
    </div>
  </div>

  ${avgResponseTime !== null ? `
  <div class="stats-row" style="margin-bottom: 20px">
    <div class="stat-card">
      <div class="stat-value" style="font-size:16px; color: ${avgResponseTime > 3000 ? "#ef4444" : "#18181b"}">${avgResponseTime}ms</div>
      <div class="stat-label">${isRtl ? "متوسط زمن الاستجابة" : "Avg Response Time"}</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="font-size:16px">${pages.filter((p) => p.seo.hasStructuredData).length}</div>
      <div class="stat-label">${isRtl ? "مع Schema" : "With Schema"}</div>
    </div>
  </div>` : ""}

  <div class="section-header"><div class="section-bar"></div><div class="section-title">${isRtl ? "النتائج الرئيسية" : "Key Findings"}</div></div>
  <div style="margin-bottom: 16px">${findings}</div>

  ${quickWins.length > 0 ? `
  <div class="section-header"><div class="section-bar"></div><div class="section-title">${isRtl ? "تحسينات سريعة" : "Quick Wins"}</div></div>
  ${quickWinsHtml}` : ""}
</div>

<!-- PAGE-BY-PAGE ANALYSIS -->
<div class="report-page">
  <div class="section-header"><div class="section-bar"></div><div class="section-title">${isRtl ? "تحليل صفحة بصفحة" : "Page-by-Page Analysis"}</div></div>
  ${pageCardsHtml}
</div>

<!-- METHODOLOGY -->
<div class="report-page">
  <div class="section-header"><div class="section-bar"></div><div class="section-title">${isRtl ? "المنهجية" : "Methodology"}</div></div>
  <p class="methodology-text">
    ${isRtl
      ? "تم إنشاء هذا التقرير بواسطة بصيرة (baseera.xyz)، أداة تحليل SEO مدعومة بالذكاء الاصطناعي. يتم تقييم كل صفحة على مقياس من 100 نقطة بناءً على المعايير التالية:"
      : "This report was generated by Baseera (baseera.xyz), an AI-powered SEO analysis tool. Each page is scored on a 100-point scale based on the following criteria:"}
  </p>
  <div style="margin-bottom: 12px">
    ${[
      "HTTP status code (200 expected)",
      "Page title presence and length (50–60 characters ideal)",
      "Meta description presence and length (120–160 characters ideal)",
      "Heading structure (single H1, proper hierarchy)",
      "Image alt text coverage",
      "Canonical URL configuration",
      "Open Graph / social meta tags",
      "Structured data (JSON-LD / Schema.org)",
      "Response time and performance metrics",
      "Internal and external link profiles",
    ]
      .map(
        (rule) =>
          `<div class="methodology-rule"><span class="methodology-bullet">•</span><span class="methodology-rule-text">${rule}</span></div>`
      )
      .join("")}
  </div>
  <p class="methodology-text">
    ${isRtl
      ? "يتم تصنيف النتائج كالتالي: جيد (80-100)، يحتاج تحسين (50-79)، ضعيف (0-49). يتم تصنيف المشاكل حسب الخطورة: أخطاء (مشاكل حرجة)، تحذيرات (تحسينات مقترحة)، ومعلومات (اقتراحات بسيطة)."
      : "Scores are categorized as: Good (80–100), Needs Improvement (50–79), and Poor (0–49). Issues are classified by severity: errors (critical problems), warnings (improvements recommended), and info (minor suggestions)."}
  </p>

  <div class="footer-block">
    <div class="footer-brand">بصيـــرة</div>
    <div class="footer-sub">B A S E E R A</div>
    <div class="footer-link">baseera.xyz — ${isRtl ? "تدقيق SEO بالذكاء الاصطناعي" : "AI-Powered SEO Audit"}</div>
  </div>
</div>

</body>
</html>`;
}
