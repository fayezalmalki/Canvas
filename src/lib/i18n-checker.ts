import type { CrawlPageResult, I18nData } from "@/types/canvas";

export interface I18nCheckResult {
  hasRtlDir: boolean;
  hasArabicContent: boolean;
  arabicRatio: number;
  hreflangLinks: { lang: string; url: string }[];
  issues: { severity: "error" | "warning" | "info"; message: string }[];
}

const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
const LATIN_REGEX = /[A-Za-z]/g;

export function checkI18n(page: CrawlPageResult): I18nCheckResult {
  const i18n = page.seo.i18n;
  const issues: I18nCheckResult["issues"] = [];

  const arabicMatches = page.bodyText.match(ARABIC_REGEX) || [];
  const latinMatches = page.bodyText.match(LATIN_REGEX) || [];
  const totalChars = arabicMatches.length + latinMatches.length;
  const arabicRatio = totalChars > 0 ? arabicMatches.length / totalChars : 0;
  const hasArabicContent = arabicRatio > 0.1;

  const hasRtlDir = i18n?.dir === "rtl";
  const hreflangLinks = i18n?.hreflangLinks ?? [];

  if (hasArabicContent && !hasRtlDir) {
    issues.push({
      severity: "error",
      message: "Page contains Arabic content but lacks dir=\"rtl\" attribute",
    });
  }

  if (hasArabicContent && !page.seo.meta.language) {
    issues.push({
      severity: "warning",
      message: "Arabic content detected but no lang attribute on <html>",
    });
  }

  if (hasArabicContent && page.seo.meta.language && !page.seo.meta.language.startsWith("ar")) {
    issues.push({
      severity: "warning",
      message: `Arabic content detected but lang is "${page.seo.meta.language}" instead of "ar"`,
    });
  }

  if (hreflangLinks.length === 0 && hasArabicContent) {
    issues.push({
      severity: "warning",
      message: "No hreflang alternate links found — consider adding for multi-language SEO",
    });
  }

  if (hreflangLinks.length > 0) {
    const langs = hreflangLinks.map((l) => l.lang);
    if (!langs.includes("x-default")) {
      issues.push({
        severity: "info",
        message: "Missing x-default hreflang — recommended for language fallback",
      });
    }
  }

  return {
    hasRtlDir,
    hasArabicContent,
    arabicRatio,
    hreflangLinks,
    issues,
  };
}

/**
 * Aggregate i18n issues across all pages in a crawl.
 */
export function aggregateI18nIssues(pages: CrawlPageResult[]): {
  pagesWithArabic: number;
  pagesWithRtl: number;
  pagesWithHreflang: number;
  allIssues: { url: string; issues: I18nCheckResult["issues"] }[];
} {
  let pagesWithArabic = 0;
  let pagesWithRtl = 0;
  let pagesWithHreflang = 0;
  const allIssues: { url: string; issues: I18nCheckResult["issues"] }[] = [];

  for (const page of pages) {
    const result = checkI18n(page);
    if (result.hasArabicContent) pagesWithArabic++;
    if (result.hasRtlDir) pagesWithRtl++;
    if (result.hreflangLinks.length > 0) pagesWithHreflang++;
    if (result.issues.length > 0) {
      allIssues.push({ url: page.url, issues: result.issues });
    }
  }

  return { pagesWithArabic, pagesWithRtl, pagesWithHreflang, allIssues };
}
