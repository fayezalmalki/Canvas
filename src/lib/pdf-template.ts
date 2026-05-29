import { jsPDF } from "jspdf";
import type { CrawlResult } from "@/types/canvas";
import { scoreSeo } from "@/lib/seo-scorer";
import { buildSiteWorkspaceSummary } from "@/lib/site-health-summary";
import type { Locale } from "@/lib/i18n";
import { PDF_FONT, registerPdfFonts, shapeText } from "@/lib/pdf-arabic";

type RGB = readonly [number, number, number];

const C = {
  primary: [79, 70, 229] as const,   // indigo-600 (brand)
  violet: [124, 58, 237] as const,   // violet-600 (gradient pair)
  green: [22, 163, 74] as const,
  amber: [217, 119, 6] as const,
  red: [225, 29, 72] as const,
  zinc900: [24, 24, 27] as const,
  zinc700: [63, 63, 70] as const,
  zinc500: [113, 113, 122] as const,
  zinc400: [161, 161, 170] as const,
  zinc200: [228, 228, 231] as const,
  zinc100: [244, 244, 245] as const,
  zinc50: [250, 250, 250] as const,
  white: [255, 255, 255] as const,
};

function scoreColor(score: number): RGB {
  if (score >= 80) return C.green;
  if (score >= 55) return C.amber;
  return C.red;
}
function scoreTint(score: number): RGB {
  if (score >= 80) return [240, 253, 244];
  if (score >= 55) return [255, 251, 235];
  return [255, 241, 242];
}

type Status = "strong" | "steady" | "at-risk";

function getReportCopy(locale: Locale) {
  if (locale === "ar") {
    return {
      reportTitle: "تقرير الظهور في البحث والذكاء",
      tagline: "بصيرة — تدقيق مدعوم بالذكاء الاصطناعي",
      generatedOn: "أُنشئ في",
      status: { strong: "قوي", steady: "مستقر", "at-risk": "يحتاج عناية" } as Record<Status, string>,
      secExec: "الملخص التنفيذي",
      secPriorities: "أهم الأولويات",
      secStrengths: "ما الذي يعمل جيداً",
      secSearch: "البحث و SEO",
      secAi: "جاهزية الذكاء",
      secStore: "الكتالوج والمتجر",
      secPages: "تحليل صفحة بصفحة",
      secMethod: "المنهجية",
      scoreOverall: "الصحة العامة",
      scoreAi: "جاهزية الذكاء",
      scoreSearch: "صحة الأرشفة",
      scoreStore: "جاهزية المتجر",
      pagesAnalyzed: "الصفحات المفحوصة",
      metrics: {
        snippet: "تغطية الوصف",
        indexable: "صفحات قابلة للأرشفة",
        broken: "روابط مكسورة",
        sitemap: "تغطية الخريطة",
        extractable: "صفحات قابلة للاستخراج",
        botProtected: "صفحات محمية",
        structured: "البيانات المنظمة",
        language: "وضوح اللغة",
        readability: "قابلية القراءة",
        products: "المنتجات",
        catalogPages: "صفحات المتجر",
        dataQuality: "جودة البيانات",
        schema: "Product schema",
      },
      whyItMatters: "لماذا هذا مهم",
      howToFix: "كيف تصلحه",
      linkHealth: "صحة الروابط",
      brokenLinks: "روابط مكسورة",
      redirects: "تحويلات",
      noLinkIssues: "لا توجد روابط مكسورة أو سلاسل تحويل.",
      foundOn: (n: number) => `في ${n} صفحة`,
      hops: (n: number) => `${n} تحويلة`,
      more: (n: number) => `+${n} أخرى`,
      robotsTitle: "إشارات robots.txt و sitemap",
      noRobotsIssues: "لا توجد إشارات حرجة.",
      sitemapMissing: "مفحوصة وغير موجودة في الخريطة",
      sitemapUnreached: "في الخريطة ولم تُفحص",
      botProtectedTitle: "صفحات محمية من الزحف",
      noStore: "لم يتم اكتشاف كتالوج منتجات في هذا الفحص.",
      unit: { words: "كلمة", links: "رابط داخلي", images: "صورة" },
      noTitle: "(بدون عنوان)",
      moreIssues: (n: number) => `+${n} مشكلة أخرى`,
      sev: { error: "خطأ", warning: "تحذير" },
      methodIntro:
        "أُنشئ هذا التقرير بواسطة بصيرة، أداة تدقيق مدعومة بالذكاء الاصطناعي. تُقيَّم كل صفحة على مقياس 100 نقطة وفق المعايير التالية:",
      methodRules: [
        "رمز حالة HTTP (المتوقع 200)",
        "وجود العنوان وطوله المناسب",
        "وصف الميتا ووجوده وطوله",
        "بنية العناوين (H1 واحد وتسلسل سليم)",
        "تغطية النص البديل للصور",
        "إعداد الرابط الأساسي (canonical)",
        "وسوم Open Graph والمشاركة",
        "البيانات المنظمة (JSON-LD / Schema.org)",
        "زمن الاستجابة ومؤشرات الأداء",
        "ملف الروابط الداخلية والخارجية",
      ],
      methodScoring:
        "تُصنَّف الدرجات إلى: جيد (80–100)، يحتاج تحسين (55–79)، وضعيف (0–54). وتُصنَّف المشكلات حسب الخطورة: أخطاء، تحذيرات، ومعلومات.",
      footerTagline: "baseera.xyz — تدقيق الظهور في البحث والذكاء",
      priority: { high: "عالية", medium: "متوسطة", low: "منخفضة" },
    };
  }
  return {
    reportTitle: "Search & AI Visibility Report",
    tagline: "Baseera — AI-powered site audit",
    generatedOn: "Generated",
    status: { strong: "Strong", steady: "Steady", "at-risk": "At risk" } as Record<Status, string>,
    secExec: "Executive Summary",
    secPriorities: "Top Priorities",
    secStrengths: "What's Working",
    secSearch: "Search & SEO",
    secAi: "AI Readiness",
    secStore: "Catalog & Commerce",
    secPages: "Page-by-Page Analysis",
    secMethod: "Methodology",
    scoreOverall: "Overall Health",
    scoreAi: "AI Readiness",
    scoreSearch: "Indexing Health",
    scoreStore: "Store Readiness",
    pagesAnalyzed: "Pages Analyzed",
    metrics: {
      snippet: "Snippet coverage",
      indexable: "Indexable pages",
      broken: "Broken links",
      sitemap: "Sitemap coverage",
      extractable: "Extractable pages",
      botProtected: "Bot-protected",
      structured: "Structured data",
      language: "Language clarity",
      readability: "LLM readability",
      products: "Products",
      catalogPages: "Catalog pages",
      dataQuality: "Data quality",
      schema: "Product schema",
    },
    whyItMatters: "Why this matters",
    howToFix: "How to fix it",
    linkHealth: "Link health",
    brokenLinks: "Broken links",
    redirects: "Redirects",
    noLinkIssues: "No broken links or redirect chains found.",
    foundOn: (n: number) => `on ${n} page${n === 1 ? "" : "s"}`,
    hops: (n: number) => `${n} hop${n === 1 ? "" : "s"}`,
    more: (n: number) => `+${n} more`,
    robotsTitle: "robots.txt and sitemap signals",
    noRobotsIssues: "No major crawl-control issues stand out.",
    sitemapMissing: "Crawled, missing from sitemap",
    sitemapUnreached: "In sitemap, not reached",
    botProtectedTitle: "Bot-protected pages",
    noStore: "No product catalog was detected in this crawl.",
    unit: { words: "words", links: "int. links", images: "images" },
    noTitle: "(no title)",
    moreIssues: (n: number) => `+${n} more issue${n === 1 ? "" : "s"}`,
    sev: { error: "ERROR", warning: "WARN" },
    methodIntro:
      "This report was generated by Baseera, an AI-powered audit tool. Each page is scored on a 100-point scale based on the following criteria:",
    methodRules: [
      "HTTP status code (200 expected)",
      "Page title presence and length (50–60 chars ideal)",
      "Meta description presence and length (120–160 chars ideal)",
      "Heading structure (single H1, proper hierarchy)",
      "Image alt text coverage",
      "Canonical URL configuration",
      "Open Graph / social meta tags",
      "Structured data (JSON-LD / Schema.org)",
      "Response time and performance metrics",
      "Internal and external link profiles",
    ],
    methodScoring:
      "Scores are categorized as Good (80–100), Needs Improvement (55–79), and Poor (0–54). Issues are classified by severity: errors, warnings, and info.",
    footerTagline: "baseera.xyz — Search & AI visibility audit",
    priority: { high: "High", medium: "Medium", low: "Low" },
  };
}

export function generatePdfBuffer(data: CrawlResult, locale: Locale): ArrayBuffer {
  const copy = getReportCopy(locale);
  const summary = buildSiteWorkspaceSummary(data);
  const isRtl = locale === "ar";

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  registerPdfFonts(doc);

  const W = 210, H = 297, M = 18, CW = W - 2 * M;

  let domain = "";
  try { domain = new URL(data.rootUrl).hostname; } catch { domain = data.rootUrl; }

  const pages = data.pages;
  const scores = pages.map((p) => scoreSeo({ url: p.url, title: p.title, seo: p.seo }));
  const brokenLinks = data.brokenLinks ?? [];
  const redirectChains = data.redirectChains ?? [];
  const botProtectedPages = pages.filter((p) => p.botProtection);

  const date = new Intl.DateTimeFormat(isRtl ? "ar" : "en-US", {
    year: "numeric", month: "long", day: "numeric", calendar: "gregory",
  }).format(new Date());

  // ---------- low-level helpers ----------
  const setColor = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const setFill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const setDraw = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
  const font = (bold = false) => doc.setFont(PDF_FONT, bold ? "bold" : "normal");
  const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

  type Align = "start" | "center" | "end" | "left" | "right";
  const resolveAlign = (a: Align): "left" | "center" | "right" =>
    a === "start" ? (isRtl ? "right" : "left")
    : a === "end" ? (isRtl ? "left" : "right")
    : a;

  // leading / trailing x-anchor inside a box (direction-aware)
  const leadX = (x: number, w: number, pad = 0) => (isRtl ? x + w - pad : x + pad);
  const trailX = (x: number, w: number, pad = 0) => (isRtl ? x + pad : x + w - pad);

  interface TextOpts { size?: number; bold?: boolean; color?: RGB; align?: Align; maxChars?: number; pad?: number; }
  // draws a single LOGICAL string (shapes it first)
  function T(str: string, x: number, y: number, o: TextOpts = {}) {
    drawShaped(shapeText(o.maxChars ? truncate(str, o.maxChars) : str), x, y, o);
  }
  // draws an already-shaped string (used for wrapped lines)
  function drawShaped(shaped: string, x: number, y: number, o: TextOpts = {}) {
    const { size = 9, bold = false, color = C.zinc700, align = "start" } = o;
    font(bold); doc.setFontSize(size); setColor(color);
    doc.text(shaped, x, y, { align: resolveAlign(align) });
  }
  // word-wrap in LOGICAL order, then shape each line (correct for Arabic)
  function wrapLogical(str: string, maxWidth: number, size: number, bold = false): string[] {
    font(bold); doc.setFontSize(size);
    const words = str.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const trial = cur ? `${cur} ${w}` : w;
      if (doc.getTextWidth(shapeText(trial)) > maxWidth && cur) { lines.push(cur); cur = w; }
      else cur = trial;
    }
    if (cur) lines.push(cur);
    return lines.map(shapeText);
  }
  function paragraph(str: string, x: number, w: number, y: number, o: TextOpts = {}): number {
    const { size = 8, bold = false, color = C.zinc700, align = "start", pad = 0 } = o;
    const lines = wrapLogical(str, w - pad * 2, size, bold);
    const anchor = align === "center" ? x + w / 2 : (resolveAlign(align) === "right" ? x + w - pad : x + pad);
    const lh = size * 0.46;
    for (const ln of lines) { drawShaped(ln, anchor, y, { size, bold, color, align }); y += lh; }
    return y;
  }

  function addFooter() {
    setDraw(C.zinc200);
    doc.line(M, H - 12, W - M, H - 12);
    T("Baseera · baseera.xyz", leadX(M, CW), H - 7.5, { size: 6.5, color: C.zinc400, align: "start" });
    T(domain, trailX(M, CW), H - 7.5, { size: 6.5, color: C.zinc400, align: "end" });
  }
  function newPage() { doc.addPage(); addFooter(); return M; }
  function ensureSpace(y: number, needed: number): number {
    return y + needed > H - 16 ? newPage() : y;
  }
  function sectionHeader(y: number, title: string): number {
    y = ensureSpace(y, 16);
    setFill(C.primary);
    doc.rect(isRtl ? W - M - 2 : M, y, 2, 7, "F");
    T(title, isRtl ? W - M - 5 : M + 5, y + 5.5, { size: 12, bold: true, color: C.zinc900, align: "start" });
    return y + 13;
  }
  function statBox(x: number, y: number, w: number, value: string, label: string, color?: RGB, tint?: RGB) {
    setFill(tint ?? C.zinc50); setDraw(C.zinc200);
    doc.roundedRect(x, y, w, 22, 2, 2, "FD");
    T(value, x + w / 2, y + 10.5, { size: 16, bold: true, color: color ?? C.zinc900, align: "center" });
    T(label, x + w / 2, y + 17, { size: 6.5, color: C.zinc500, align: "center" });
  }
  // a compact list of clickable-looking URL rows
  function linkRows(y: number, label: string, items: string[], notes: (i: number) => string | undefined, cap: number): number {
    if (items.length === 0) return y;
    T(`${label} (${items.length})`, leadX(M, CW), y, { size: 7, bold: true, color: C.zinc500, align: "start" });
    y += 4.5;
    for (let i = 0; i < Math.min(items.length, cap); i++) {
      const note = notes(i);
      T(truncate(items[i], isRtl ? 60 : 78), leadX(M, CW, 2), y, { size: 7, color: C.primary, align: "start" });
      if (note) T(note, trailX(M, CW, 2), y, { size: 6.5, color: C.zinc400, align: "end" });
      y += 4.2;
    }
    if (items.length > cap) { T(copy.more(items.length - cap), leadX(M, CW, 2), y, { size: 6.5, color: C.zinc400, align: "start" }); y += 4.2; }
    return y + 2;
  }

  // ==================== COVER ====================
  setFill(C.primary); doc.rect(0, 0, W, 5, "F");
  T(isRtl ? "بصيـــرة" : "Baseera", W / 2, 92, { size: 34, bold: true, color: C.primary, align: "center" });
  T("B A S E E R A", W / 2, 103, { size: 9, color: C.zinc400, align: "center" });
  T(copy.reportTitle, W / 2, 132, { size: 19, bold: true, color: C.zinc900, align: "center" });
  T(domain, W / 2, 144, { size: 13, color: C.zinc700, align: "center" });
  T(`${copy.generatedOn} ${date}`, W / 2, 153, { size: 9, color: C.zinc500, align: "center" });

  // overall score ring
  const cx = W / 2, cy = 192, rad = 22;
  setDraw(C.zinc200); doc.setLineWidth(2.5); doc.circle(cx, cy, rad, "S");
  setDraw(scoreColor(summary.health.overallScore)); doc.setLineWidth(2.5);
  doc.circle(cx, cy, rad, "S"); // full ring in score color (jsPDF can't arc easily)
  doc.setLineWidth(0.2);
  T(String(summary.health.overallScore), cx, cy + 3, { size: 30, bold: true, color: scoreColor(summary.health.overallScore), align: "center" });
  T(copy.scoreOverall, cx, cy + rad + 8, { size: 9, color: C.zinc500, align: "center" });
  T(copy.status[summary.health.status], cx, cy + rad + 14, { size: 10, bold: true, color: scoreColor(summary.health.overallScore), align: "center" });

  T(copy.tagline, W / 2, H - 16, { size: 7, color: C.zinc400, align: "center" });

  // ==================== EXECUTIVE SUMMARY ====================
  let y = newPage();
  y = sectionHeader(y, copy.secExec);

  const sw = (CW - 9) / 4;
  statBox(M, y, sw, String(summary.health.overallScore), copy.scoreOverall, scoreColor(summary.health.overallScore), scoreTint(summary.health.overallScore));
  statBox(M + sw + 3, y, sw, String(summary.ai.score), copy.scoreAi, scoreColor(summary.ai.score));
  statBox(M + (sw + 3) * 2, y, sw, String(summary.search.score), copy.scoreSearch, scoreColor(summary.search.score));
  statBox(M + (sw + 3) * 3, y, sw, summary.store.score !== null ? String(summary.store.score) : "—", copy.scoreStore, summary.store.score !== null ? scoreColor(summary.store.score) : C.zinc400);
  y += 27;
  T(`${summary.health.pagesAnalyzed} · ${copy.pagesAnalyzed}`, leadX(M, CW), y, { size: 8, color: C.zinc500, align: "start" });
  y += 6;
  y = paragraph(summary.health.summary, M, CW, y, { size: 9, color: C.zinc700, align: "start" });
  y += 8;

  // ==================== TOP PRIORITIES ====================
  if (summary.health.topPriorities.length > 0) {
    y = sectionHeader(y, copy.secPriorities);
    for (const action of summary.health.topPriorities) {
      const whyLines = wrapLogical(action.whyItMatters, CW - 10, 7.5);
      const howLines = wrapLogical(action.howToFix, CW - 10, 7.5);
      const cardH = 11 + 4 + whyLines.length * 3.6 + 4 + howLines.length * 3.6 + 5;
      y = ensureSpace(y, cardH + 4);
      setFill(C.white); setDraw(C.zinc200);
      doc.roundedRect(M, y, CW, cardH, 2, 2, "FD");
      // priority pill
      const pc = action.priority === "high" ? C.red : action.priority === "medium" ? C.amber : C.zinc500;
      setFill(pc); doc.roundedRect(leadX(M, CW, 4) - (isRtl ? 16 : 0), y + 4, 16, 5, 1, 1, "F");
      T(copy.priority[action.priority], leadX(M, CW, 4) - (isRtl ? 8 : -8), y + 7.6, { size: 6.5, bold: true, color: C.white, align: "center" });
      T(action.title, leadX(M, CW, 22), y + 8, { size: 9.5, bold: true, color: C.zinc900, align: "start", maxChars: 64 });
      let yy = y + 14;
      T(copy.whyItMatters, leadX(M, CW, 4), yy, { size: 6, bold: true, color: C.zinc400, align: "start" }); yy += 3.6;
      for (const ln of whyLines) { drawShaped(ln, leadX(M, CW, 4), yy, { size: 7.5, color: C.zinc700, align: "start" }); yy += 3.6; }
      yy += 1.5;
      T(copy.howToFix, leadX(M, CW, 4), yy, { size: 6, bold: true, color: C.primary, align: "start" }); yy += 3.6;
      for (const ln of howLines) { drawShaped(ln, leadX(M, CW, 4), yy, { size: 7.5, color: C.zinc700, align: "start" }); yy += 3.6; }
      y += cardH + 4;
    }
    y += 2;
  }

  // ==================== WHAT'S WORKING ====================
  if (summary.health.strengths.length > 0) {
    y = sectionHeader(y, copy.secStrengths);
    for (const s of summary.health.strengths) {
      y = ensureSpace(y, 8);
      setFill(C.green); doc.circle(leadX(M, CW, 2), y - 0.8, 1, "F");
      y = paragraph(s, isRtl ? M : M + 6, CW - 6, y, { size: 8, color: C.zinc700, align: "start" });
      y += 2.5;
    }
    y += 6;
  }

  // ==================== SEARCH & SEO ====================
  y = sectionHeader(y, copy.secSearch);
  const m4 = (CW - 9) / 4;
  statBox(M, y, m4, `${summary.search.metaCoverage}%`, copy.metrics.snippet, scoreColor(summary.search.metaCoverage));
  statBox(M + m4 + 3, y, m4, String(summary.search.indexablePages), copy.metrics.indexable);
  statBox(M + (m4 + 3) * 2, y, m4, String(summary.search.brokenLinksCount), copy.metrics.broken, summary.search.brokenLinksCount > 0 ? C.red : C.zinc900);
  statBox(M + (m4 + 3) * 3, y, m4, `${summary.search.sitemapCoverage}%`, copy.metrics.sitemap, scoreColor(summary.search.sitemapCoverage));
  y += 27;

  T(copy.linkHealth, leadX(M, CW), y, { size: 9, bold: true, color: C.zinc900, align: "start" });
  y += 5;
  if (brokenLinks.length === 0 && redirectChains.length === 0) {
    setFill(C.green); doc.circle(leadX(M, CW, 1.5), y - 0.8, 1, "F");
    T(copy.noLinkIssues, leadX(M, CW, 5), y, { size: 8, color: C.zinc500, align: "start" });
    y += 6;
  } else {
    y = linkRows(y, copy.brokenLinks, brokenLinks.map((b) => `${b.statusCode}  ${b.url}`), (i) => brokenLinks[i].referringPages.length ? copy.foundOn(brokenLinks[i].referringPages.length) : undefined, 6);
    y = linkRows(y, copy.redirects, redirectChains.map((r) => `${r.from} → ${r.to}`), (i) => copy.hops(redirectChains[i].hops), 5);
  }

  if (data.robotsSitemap) {
    y = ensureSpace(y, 10);
    T(copy.robotsTitle, leadX(M, CW), y, { size: 9, bold: true, color: C.zinc900, align: "start" });
    y += 5;
    const rIssue = data.robotsSitemap.robotsTxt.issues[0];
    const sIssue = data.robotsSitemap.sitemap.issues[0];
    T(`robots.txt — ${rIssue ?? copy.noRobotsIssues}`, leadX(M, CW, 2), y, { size: 7.5, color: rIssue ? C.amber : C.zinc500, align: "start", maxChars: 90 }); y += 4.5;
    T(`sitemap.xml — ${sIssue ?? copy.noRobotsIssues}`, leadX(M, CW, 2), y, { size: 7.5, color: sIssue ? C.amber : C.zinc500, align: "start", maxChars: 90 }); y += 5;
    y = linkRows(y, copy.sitemapMissing, data.robotsSitemap.coverage.crawledNotInSitemap, () => undefined, 4);
    y = linkRows(y, copy.sitemapUnreached, data.robotsSitemap.coverage.inSitemapNotCrawled, () => undefined, 4);
  }
  y += 4;

  // ==================== AI READINESS ====================
  y = sectionHeader(y, copy.secAi);
  const m5 = (CW - 12) / 5;
  statBox(M, y, m5, String(summary.ai.extractablePageCount), copy.metrics.extractable);
  statBox(M + (m5 + 3), y, m5, String(summary.ai.botProtectedPageCount), copy.metrics.botProtected, summary.ai.botProtectedPageCount > 0 ? C.red : C.zinc900);
  statBox(M + (m5 + 3) * 2, y, m5, `${summary.ai.structuredDataCoverage}%`, copy.metrics.structured, scoreColor(summary.ai.structuredDataCoverage));
  statBox(M + (m5 + 3) * 3, y, m5, `${summary.ai.languageClarityCoverage}%`, copy.metrics.language, scoreColor(summary.ai.languageClarityCoverage));
  statBox(M + (m5 + 3) * 4, y, m5, `${summary.ai.llmReadabilityCoverage}%`, copy.metrics.readability, scoreColor(summary.ai.llmReadabilityCoverage));
  y += 27;
  y = paragraph(summary.ai.summary, M, CW, y, { size: 8, color: C.zinc700, align: "start" });
  y += 4;
  if (botProtectedPages.length > 0) {
    y = linkRows(y, copy.botProtectedTitle, botProtectedPages.map((p) => p.url), (i) => botProtectedPages[i].botProtection, 6);
  }
  y += 4;

  // ==================== STORE ====================
  y = sectionHeader(y, copy.secStore);
  if (summary.store.productCount > 0) {
    statBox(M, y, m4, String(summary.store.productCount), copy.metrics.products);
    statBox(M + m4 + 3, y, m4, String(summary.store.pagesWithProducts), copy.metrics.catalogPages);
    statBox(M + (m4 + 3) * 2, y, m4, `${summary.store.productDataCoverage}%`, copy.metrics.dataQuality, scoreColor(summary.store.productDataCoverage));
    statBox(M + (m4 + 3) * 3, y, m4, `${summary.store.schemaBackedCoverage}%`, copy.metrics.schema, scoreColor(summary.store.schemaBackedCoverage));
    y += 27;
    y = paragraph(summary.store.summary, M, CW, y, { size: 8, color: C.zinc700, align: "start" });
  } else {
    T(copy.noStore, leadX(M, CW), y, { size: 8, color: C.zinc500, align: "start" });
    y += 6;
  }
  y += 4;

  // ==================== PAGE-BY-PAGE ====================
  y = sectionHeader(y, copy.secPages);
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const seo = scores[i];
    let path = page.url;
    try { path = new URL(page.url).pathname || "/"; } catch { /* keep */ }
    const issues = seo.issues.filter((iss) => iss.severity === "error" || iss.severity === "warning");
    const shown = Math.min(issues.length, 3);
    const cardH = 21 + shown * 4.4 + (issues.length > shown ? 4 : 0);
    y = ensureSpace(y, cardH + 3);

    setDraw(C.zinc200); doc.roundedRect(M, y, CW, cardH, 2, 2, "D");
    setFill(C.zinc50); doc.rect(M + 0.4, y + 0.4, CW - 0.8, 13, "F");
    T(path, leadX(M, CW, 4), y + 5, { size: 6.5, color: C.zinc500, align: "start", maxChars: 80 });
    T(page.title || copy.noTitle, leadX(M, CW, 4), y + 10.5, { size: 9, bold: true, color: C.zinc900, align: "start", maxChars: 58 });
    // score badge (trailing)
    const badgeW = 16, badgeX = isRtl ? M + 4 : W - M - 4 - badgeW;
    setFill(scoreColor(seo.score)); doc.roundedRect(badgeX, y + 3.5, badgeW, 7, 1.5, 1.5, "F");
    T(`${seo.score}`, badgeX + badgeW / 2, y + 8.4, { size: 9, bold: true, color: C.white, align: "center" });

    const metricsLine = [
      `${page.seo.wordCount} ${copy.unit.words}`,
      `${page.seo.internalLinkCount} ${copy.unit.links}`,
      `${page.seo.imageCount} ${copy.unit.images}`,
      ...(page.seo.performance ? [`${page.seo.performance.responseTimeMs}ms`] : []),
    ].join("   ·   ");
    T(metricsLine, leadX(M, CW, 4), y + 18, { size: 7, color: C.zinc500, align: "start" });

    let iy = y + 22.5;
    for (let j = 0; j < shown; j++) {
      const iss = issues[j];
      T(iss.severity === "error" ? copy.sev.error : copy.sev.warning, leadX(M, CW, 4), iy, { size: 6, bold: true, color: iss.severity === "error" ? C.red : C.amber, align: "start" });
      T(truncate(`${iss.title}: ${iss.description}`, 86), leadX(M, CW, 18), iy, { size: 6.5, color: C.zinc700, align: "start" });
      iy += 4.4;
    }
    if (issues.length > shown) T(copy.moreIssues(issues.length - shown), leadX(M, CW, 4), iy, { size: 6, color: C.zinc400, align: "start" });

    y += cardH + 3;
  }
  y += 4;

  // ==================== METHODOLOGY ====================
  y = sectionHeader(y, copy.secMethod);
  y = paragraph(copy.methodIntro, M, CW, y, { size: 7.5, color: C.zinc700, align: "start" });
  y += 3;
  for (const rule of copy.methodRules) {
    y = ensureSpace(y, 5);
    setFill(C.primary); doc.circle(leadX(M, CW, 1.5), y - 0.8, 0.8, "F");
    T(rule, leadX(M, CW, 5), y, { size: 7.5, color: C.zinc700, align: "start" });
    y += 4.4;
  }
  y += 3;
  y = paragraph(copy.methodScoring, M, CW, y, { size: 7.5, color: C.zinc700, align: "start" });

  // footer block
  y = ensureSpace(y, 26) + 4;
  setFill(C.zinc50); setDraw(C.zinc200); doc.roundedRect(M, y, CW, 20, 2, 2, "FD");
  T(isRtl ? "بصيـــرة" : "Baseera", W / 2, y + 9, { size: 13, bold: true, color: C.primary, align: "center" });
  T(copy.footerTagline, W / 2, y + 15, { size: 6.5, color: C.zinc400, align: "center" });

  return doc.output("arraybuffer");
}
