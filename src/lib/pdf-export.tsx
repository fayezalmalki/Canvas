import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
  pdf,
} from "@react-pdf/renderer";
import type { CrawlResult, CrawlPageResult } from "@/types/canvas";
import { scoreSeo } from "@/lib/seo-scorer";

// Register IBM Plex Sans Arabic for full Arabic + Latin support
Font.register({
  family: "IBM Plex Sans Arabic",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/ibmplexsansarabic/v12/Qw3CZRtWPQCuHme67tEYUIx3Kh0PHR9N6YNe3PC5eMlAMg0.woff2",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/ibmplexsansarabic/v12/Qw3NZRtWPQCuHme67tEYUIx3Kh0PHR9N6YPy_dCTVsVJKxTs.woff2",
      fontWeight: 700,
    },
  ],
});

// Disable hyphenation for better Arabic text rendering
Font.registerHyphenationCallback((word) => [word]);

// Brand colors
const COLORS = {
  primary: "#6366f1",
  primaryDark: "#4f46e5",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
  zinc900: "#18181b",
  zinc700: "#3f3f46",
  zinc500: "#71717a",
  zinc400: "#a1a1aa",
  zinc200: "#e4e4e7",
  zinc100: "#f4f4f5",
  zinc50: "#fafafa",
  white: "#ffffff",
};

function getScoreColor(score: number) {
  if (score >= 80) return COLORS.green;
  if (score >= 50) return COLORS.amber;
  return COLORS.red;
}

function getScoreBg(score: number) {
  if (score >= 80) return "#dcfce7";
  if (score >= 50) return "#fef9c3";
  return "#fee2e2";
}

const s = StyleSheet.create({
  // --- Cover Page ---
  coverPage: {
    padding: 0,
    fontFamily: "IBM Plex Sans Arabic",
    backgroundColor: COLORS.white,
  },
  coverAccentBar: {
    height: 8,
    backgroundColor: COLORS.primary,
  },
  coverContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 60,
  },
  coverBrand: {
    fontSize: 48,
    fontWeight: 700,
    color: COLORS.primary,
    marginBottom: 8,
    textAlign: "center",
  },
  coverSubtitle: {
    fontSize: 14,
    color: COLORS.zinc500,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 40,
    textAlign: "center",
  },
  coverTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: COLORS.zinc900,
    marginBottom: 8,
    textAlign: "center",
  },
  coverDomain: {
    fontSize: 16,
    color: COLORS.zinc700,
    marginBottom: 4,
    textAlign: "center",
  },
  coverDate: {
    fontSize: 11,
    color: COLORS.zinc500,
    textAlign: "center",
  },
  coverFooter: {
    padding: 20,
    textAlign: "center",
  },
  coverFooterText: {
    fontSize: 9,
    color: COLORS.zinc400,
  },

  // --- Standard Page ---
  page: {
    padding: 40,
    paddingBottom: 60,
    fontSize: 10,
    fontFamily: "IBM Plex Sans Arabic",
    color: COLORS.zinc900,
  },

  // --- Footer (all pages) ---
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: `1px solid ${COLORS.zinc200}`,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: COLORS.zinc400,
  },

  // --- Section Headers ---
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
  },
  sectionBar: {
    width: 3,
    height: 16,
    backgroundColor: COLORS.primary,
    marginRight: 8,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: COLORS.zinc900,
  },

  // --- Summary Stats ---
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    backgroundColor: COLORS.zinc50,
    borderRadius: 6,
    border: `1px solid ${COLORS.zinc200}`,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: 700,
  },
  statLabel: {
    fontSize: 7,
    color: COLORS.zinc500,
    marginTop: 3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // --- Issue Summary ---
  issueSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
    paddingLeft: 4,
  },
  issueDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  issueSummaryText: {
    fontSize: 9,
    color: COLORS.zinc700,
  },

  // --- Quick Wins ---
  quickWinCard: {
    padding: 10,
    backgroundColor: "#eef2ff",
    borderRadius: 4,
    border: `1px solid #c7d2fe`,
    marginBottom: 6,
  },
  quickWinTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.primaryDark,
    marginBottom: 2,
  },
  quickWinDesc: {
    fontSize: 8,
    color: COLORS.zinc700,
  },

  // --- Page Cards ---
  pageCard: {
    marginBottom: 12,
    borderRadius: 6,
    border: `1px solid ${COLORS.zinc200}`,
    overflow: "hidden",
  },
  pageCardHeader: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: COLORS.zinc50,
    borderBottom: `1px solid ${COLORS.zinc200}`,
    gap: 10,
    alignItems: "flex-start",
  },
  pageCardBody: {
    padding: 10,
  },
  pageScreenshot: {
    width: 80,
    height: 50,
    borderRadius: 3,
    border: `1px solid ${COLORS.zinc200}`,
    objectFit: "cover",
    objectPosition: "top",
  },
  pageInfo: {
    flex: 1,
    minWidth: 0,
  },
  pageUrl: {
    fontSize: 8,
    color: COLORS.zinc500,
    marginBottom: 2,
  },
  pageTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: COLORS.zinc900,
    marginBottom: 4,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 700,
    color: COLORS.white,
    alignSelf: "flex-start",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
    marginBottom: 6,
  },
  metricItem: {
    fontSize: 8,
    color: COLORS.zinc500,
  },
  metricValue: {
    fontWeight: 700,
    color: COLORS.zinc700,
  },
  issueRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 2,
    paddingLeft: 4,
  },
  issueSeverity: {
    fontSize: 7,
    fontWeight: 700,
    width: 48,
    textTransform: "uppercase",
  },
  issueText: {
    fontSize: 7,
    flex: 1,
    color: COLORS.zinc700,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
    flexWrap: "wrap",
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 7,
    backgroundColor: COLORS.zinc100,
    color: COLORS.zinc700,
    border: `1px solid ${COLORS.zinc200}`,
  },

  // --- Methodology ---
  methodologyText: {
    fontSize: 8,
    color: COLORS.zinc700,
    lineHeight: 1.6,
    marginBottom: 8,
  },
  methodologyRule: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 3,
  },
  methodologyBullet: {
    fontSize: 8,
    color: COLORS.primary,
    fontWeight: 700,
  },
  methodologyRuleText: {
    fontSize: 8,
    color: COLORS.zinc700,
    flex: 1,
  },
});

// --- Helper Components ---

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionBar} />
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

function Footer({ domain }: { domain: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>Baseera | بصيـــرة — {domain}</Text>
      <Text
        style={s.footerText}
        render={({ pageNumber, totalPages }) =>
          `${pageNumber} / ${totalPages}`
        }
      />
    </View>
  );
}

// --- Main PDF Document ---

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface PdfExportProps {
  crawlResult: CrawlResult;
  chatMessages?: ChatMessage[];
}

function SeoReport({ crawlResult, chatMessages }: PdfExportProps) {
  let domain = "";
  try {
    domain = new URL(crawlResult.rootUrl).hostname;
  } catch {
    domain = crawlResult.rootUrl;
  }

  const pages = crawlResult.pages;
  const scores = pages.map((p) =>
    scoreSeo({ url: p.url, title: p.title, seo: p.seo })
  );
  const avgScore = Math.round(
    scores.reduce((s, r) => s + r.score, 0) / scores.length
  );
  const totalIssues = scores.reduce((s, r) => s + r.issues.length, 0);
  const totalWords = pages.reduce((s, p) => s + p.seo.wordCount, 0);
  const totalProducts = pages.reduce(
    (s, p) => s + (p.products?.length ?? 0),
    0
  );

  // Performance averages
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

  // Aggregate issues for summary
  const missingDesc = pages.filter((p) => !p.seo.meta.description).length;
  const missingAlt = pages.reduce(
    (s, p) => s + p.seo.imagesWithoutAlt,
    0
  );
  const slowPages = pages.filter(
    (p) => (p.seo.performance?.responseTimeMs ?? 0) > 3000
  ).length;
  const missingOg = pages.filter((p) => !p.seo.meta.ogTitle).length;
  const botBlocked = pages.filter((p) => p.botProtection).length;
  const missingCanonical = pages.filter(
    (p) => !p.seo.meta.canonical
  ).length;

  // Quick wins (top 3 most impactful)
  const quickWins: { title: string; description: string }[] = [];
  if (missingDesc > 0) {
    quickWins.push({
      title: `Add meta descriptions to ${missingDesc} page${missingDesc > 1 ? "s" : ""}`,
      description:
        "Meta descriptions improve click-through rates from search results and give search engines context about page content.",
    });
  }
  if (missingAlt > 0) {
    quickWins.push({
      title: `Add alt text to ${missingAlt} image${missingAlt > 1 ? "s" : ""}`,
      description:
        "Alt text improves accessibility and helps search engines understand image content for image search.",
    });
  }
  if (missingCanonical > 0) {
    quickWins.push({
      title: `Set canonical URLs on ${missingCanonical} page${missingCanonical > 1 ? "s" : ""}`,
      description:
        "Canonical URLs prevent duplicate content issues and consolidate ranking signals.",
    });
  }
  if (slowPages > 0 && quickWins.length < 3) {
    quickWins.push({
      title: `Improve response time on ${slowPages} slow page${slowPages > 1 ? "s" : ""}`,
      description:
        "Pages taking over 3 seconds to respond negatively impact user experience and search rankings.",
    });
  }
  if (missingOg > 0 && quickWins.length < 3) {
    quickWins.push({
      title: `Add Open Graph tags to ${missingOg} page${missingOg > 1 ? "s" : ""}`,
      description:
        "OG tags control how pages appear when shared on social media, improving engagement.",
    });
  }

  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document>
      {/* ==================== COVER PAGE ==================== */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.coverAccentBar} />
        <View style={s.coverContent}>
          <Text style={s.coverBrand}>بصيـــرة</Text>
          <Text style={s.coverSubtitle}>B A S E E R A</Text>
          <Text style={s.coverTitle}>SEO Analysis Report</Text>
          <Text style={s.coverDomain}>{domain}</Text>
          <Text style={s.coverDate}>{date}</Text>
        </View>
        <View style={s.coverFooter}>
          <Text style={s.coverFooterText}>
            baseera.xyz — AI-Powered SEO Audit
          </Text>
        </View>
      </Page>

      {/* ==================== EXECUTIVE SUMMARY ==================== */}
      <Page size="A4" style={s.page}>
        <SectionHeader title="Executive Summary" />

        {/* Key Metrics Row */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={[s.statValue, { color: getScoreColor(avgScore) }]}>
              {avgScore}
            </Text>
            <Text style={s.statLabel}>Avg SEO Score</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{pages.length}</Text>
            <Text style={s.statLabel}>Pages Crawled</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statValue, { color: totalIssues > 0 ? COLORS.amber : COLORS.green }]}>
              {totalIssues}
            </Text>
            <Text style={s.statLabel}>Total Issues</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>
              {totalWords >= 1000
                ? `${(totalWords / 1000).toFixed(1)}k`
                : totalWords}
            </Text>
            <Text style={s.statLabel}>Total Words</Text>
          </View>
        </View>

        {/* Secondary Metrics */}
        <View style={[s.statsRow, { marginBottom: 20 }]}>
          {avgResponseTime !== null && (
            <View style={s.statCard}>
              <Text style={[s.statValue, { fontSize: 16, color: avgResponseTime > 3000 ? COLORS.red : COLORS.zinc900 }]}>
                {avgResponseTime}ms
              </Text>
              <Text style={s.statLabel}>Avg Response Time</Text>
            </View>
          )}
          {totalProducts > 0 && (
            <View style={s.statCard}>
              <Text style={[s.statValue, { fontSize: 16 }]}>
                {totalProducts}
              </Text>
              <Text style={s.statLabel}>Products Found</Text>
            </View>
          )}
          <View style={s.statCard}>
            <Text style={[s.statValue, { fontSize: 16 }]}>
              {pages.filter((p) => p.seo.hasStructuredData).length}
            </Text>
            <Text style={s.statLabel}>With Schema</Text>
          </View>
          {botBlocked > 0 && (
            <View style={s.statCard}>
              <Text style={[s.statValue, { fontSize: 16, color: COLORS.amber }]}>
                {botBlocked}
              </Text>
              <Text style={s.statLabel}>Bot Blocked</Text>
            </View>
          )}
        </View>

        {/* Issue Summary */}
        <SectionHeader title="Key Findings" />
        <View style={{ marginBottom: 16 }}>
          {missingDesc > 0 && (
            <View style={s.issueSummaryRow}>
              <View style={[s.issueDot, { backgroundColor: COLORS.red }]} />
              <Text style={s.issueSummaryText}>
                {missingDesc} page{missingDesc > 1 ? "s" : ""} missing meta
                description
              </Text>
            </View>
          )}
          {missingAlt > 0 && (
            <View style={s.issueSummaryRow}>
              <View style={[s.issueDot, { backgroundColor: COLORS.amber }]} />
              <Text style={s.issueSummaryText}>
                {missingAlt} image{missingAlt > 1 ? "s" : ""} without alt text
              </Text>
            </View>
          )}
          {missingCanonical > 0 && (
            <View style={s.issueSummaryRow}>
              <View style={[s.issueDot, { backgroundColor: COLORS.amber }]} />
              <Text style={s.issueSummaryText}>
                {missingCanonical} page{missingCanonical > 1 ? "s" : ""} without
                canonical URL
              </Text>
            </View>
          )}
          {missingOg > 0 && (
            <View style={s.issueSummaryRow}>
              <View style={[s.issueDot, { backgroundColor: COLORS.amber }]} />
              <Text style={s.issueSummaryText}>
                {missingOg} page{missingOg > 1 ? "s" : ""} missing Open Graph
                tags
              </Text>
            </View>
          )}
          {slowPages > 0 && (
            <View style={s.issueSummaryRow}>
              <View style={[s.issueDot, { backgroundColor: COLORS.red }]} />
              <Text style={s.issueSummaryText}>
                {slowPages} page{slowPages > 1 ? "s" : ""} with response time
                over 3 seconds
              </Text>
            </View>
          )}
          {botBlocked > 0 && (
            <View style={s.issueSummaryRow}>
              <View style={[s.issueDot, { backgroundColor: COLORS.zinc500 }]} />
              <Text style={s.issueSummaryText}>
                {botBlocked} page{botBlocked > 1 ? "s" : ""} blocked by bot
                protection
              </Text>
            </View>
          )}
          {totalIssues === 0 && (
            <View style={s.issueSummaryRow}>
              <View style={[s.issueDot, { backgroundColor: COLORS.green }]} />
              <Text style={s.issueSummaryText}>
                No critical issues found — great job!
              </Text>
            </View>
          )}
        </View>

        {/* Quick Wins */}
        {quickWins.length > 0 && (
          <>
            <SectionHeader title="Quick Wins" />
            {quickWins.slice(0, 3).map((win, i) => (
              <View key={i} style={s.quickWinCard}>
                <Text style={s.quickWinTitle}>
                  {i + 1}. {win.title}
                </Text>
                <Text style={s.quickWinDesc}>{win.description}</Text>
              </View>
            ))}
          </>
        )}

        <Footer domain={domain} />
      </Page>

      {/* ==================== PAGE ANALYSIS ==================== */}
      <Page size="A4" style={s.page}>
        <SectionHeader title="Page-by-Page Analysis" />

        {pages.map((page, i) => {
          const seo = scores[i];
          const path = (() => {
            try {
              return new URL(page.url).pathname;
            } catch {
              return page.url;
            }
          })();

          const errorsAndWarnings = seo.issues.filter(
            (iss) => iss.severity === "error" || iss.severity === "warning"
          );

          return (
            <View key={page.url} style={s.pageCard} wrap={false}>
              {/* Card Header */}
              <View style={s.pageCardHeader}>
                {/* Screenshot thumbnail */}
                {page.screenshot && page.screenshot.length > 10 && (
                  <Image src={page.screenshot} style={s.pageScreenshot} />
                )}

                {/* Page info */}
                <View style={s.pageInfo}>
                  <Text style={s.pageUrl}>{path}</Text>
                  <Text style={s.pageTitle}>
                    {page.title || "(no title)"}
                  </Text>
                  <Text
                    style={[
                      s.scoreBadge,
                      { backgroundColor: getScoreColor(seo.score) },
                    ]}
                  >
                    {seo.score}/100
                  </Text>
                </View>
              </View>

              {/* Card Body */}
              <View style={s.pageCardBody}>
                {/* Metrics row */}
                <View style={s.metricsRow}>
                  <Text style={s.metricItem}>
                    <Text style={s.metricValue}>{page.seo.wordCount}</Text>{" "}
                    words
                  </Text>
                  <Text style={s.metricItem}>
                    <Text style={s.metricValue}>
                      {page.seo.internalLinkCount}
                    </Text>{" "}
                    int. links
                  </Text>
                  <Text style={s.metricItem}>
                    <Text style={s.metricValue}>{page.seo.imageCount}</Text>{" "}
                    images
                  </Text>
                  {page.seo.performance && (
                    <Text style={s.metricItem}>
                      <Text style={s.metricValue}>
                        {page.seo.performance.responseTimeMs}ms
                      </Text>{" "}
                      response
                    </Text>
                  )}
                </View>

                {/* Badges */}
                <View style={s.badgeRow}>
                  {page.seo.hasStructuredData && (
                    <Text style={[s.badge, { color: COLORS.green, borderColor: "#bbf7d0" }]}>
                      Schema
                    </Text>
                  )}
                  {(page.products?.length ?? 0) > 0 && (
                    <Text style={[s.badge, { color: COLORS.primary, borderColor: "#c7d2fe" }]}>
                      {page.products!.length} product{page.products!.length > 1 ? "s" : ""}
                    </Text>
                  )}
                  {page.botProtection && (
                    <Text style={[s.badge, { color: COLORS.amber, borderColor: "#fde68a" }]}>
                      {page.botProtection}
                    </Text>
                  )}
                  {page.seo.i18n?.hasArabicContent && (
                    <Text style={[s.badge, { color: COLORS.blue, borderColor: "#bfdbfe" }]}>
                      Arabic {Math.round((page.seo.i18n.arabicRatio ?? 0) * 100)}%
                    </Text>
                  )}
                </View>

                {/* Issues (errors & warnings only) */}
                {errorsAndWarnings.length > 0 && (
                  <View style={{ marginTop: 6 }}>
                    {errorsAndWarnings.slice(0, 5).map((issue, j) => (
                      <View key={j} style={s.issueRow}>
                        <Text
                          style={[
                            s.issueSeverity,
                            {
                              color:
                                issue.severity === "error"
                                  ? COLORS.red
                                  : COLORS.amber,
                            },
                          ]}
                        >
                          {issue.severity}
                        </Text>
                        <Text style={s.issueText}>
                          {issue.title}: {issue.description}
                        </Text>
                      </View>
                    ))}
                    {errorsAndWarnings.length > 5 && (
                      <Text
                        style={{
                          fontSize: 7,
                          color: COLORS.zinc400,
                          paddingLeft: 4,
                          marginTop: 2,
                        }}
                      >
                        +{errorsAndWarnings.length - 5} more issues
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          );
        })}

        <Footer domain={domain} />
      </Page>

      {/* ==================== CHAT Q&A (if any) ==================== */}
      {chatMessages && chatMessages.length > 0 && (
        <Page size="A4" style={s.page}>
          <SectionHeader title="SEO Advisor Q&A" />

          {chatMessages.map((msg, i) => (
            <View
              key={i}
              style={{
                marginBottom: 8,
                padding: 10,
                borderRadius: 6,
                backgroundColor:
                  msg.role === "user" ? COLORS.zinc900 : COLORS.zinc50,
                border:
                  msg.role === "user"
                    ? "none"
                    : `1px solid ${COLORS.zinc200}`,
              }}
              wrap={false}
            >
              <Text
                style={{
                  fontSize: 7,
                  fontWeight: 700,
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color:
                    msg.role === "user" ? COLORS.zinc400 : COLORS.zinc500,
                }}
              >
                {msg.role === "user" ? "You" : "SEO Advisor"}
              </Text>
              <Text
                style={{
                  fontSize: 9,
                  lineHeight: 1.5,
                  color:
                    msg.role === "user" ? COLORS.white : COLORS.zinc900,
                }}
              >
                {msg.text}
              </Text>
            </View>
          ))}

          <Footer domain={domain} />
        </Page>
      )}

      {/* ==================== METHODOLOGY ==================== */}
      <Page size="A4" style={s.page}>
        <SectionHeader title="Methodology" />

        <Text style={s.methodologyText}>
          This report was generated by Baseera (baseera.xyz), an AI-powered SEO
          analysis tool. Each page is scored on a 100-point scale based on the
          following criteria:
        </Text>

        <View style={{ marginBottom: 12 }}>
          {[
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
          ].map((rule, i) => (
            <View key={i} style={s.methodologyRule}>
              <Text style={s.methodologyBullet}>•</Text>
              <Text style={s.methodologyRuleText}>{rule}</Text>
            </View>
          ))}
        </View>

        <Text style={s.methodologyText}>
          Scores are categorized as: Good (80–100), Needs Improvement (50–79),
          and Poor (0–49). Issues are classified by severity: errors
          (critical problems), warnings (improvements recommended), and info
          (minor suggestions).
        </Text>

        <View
          style={{
            marginTop: 24,
            padding: 16,
            backgroundColor: COLORS.zinc50,
            borderRadius: 6,
            border: `1px solid ${COLORS.zinc200}`,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: COLORS.primary,
              marginBottom: 4,
            }}
          >
            بصيـــرة
          </Text>
          <Text
            style={{
              fontSize: 9,
              color: COLORS.zinc500,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            B A S E E R A
          </Text>
          <Text
            style={{
              fontSize: 8,
              color: COLORS.zinc400,
              marginTop: 6,
            }}
          >
            baseera.xyz — AI-Powered SEO Audit
          </Text>
        </View>

        <Footer domain={domain} />
      </Page>
    </Document>
  );
}

export async function generatePdf(
  crawlResult: CrawlResult,
  chatMessages?: ChatMessage[]
): Promise<Blob> {
  const doc = (
    <SeoReport crawlResult={crawlResult} chatMessages={chatMessages} />
  );
  const blob = await pdf(doc).toBlob();
  return blob;
}
