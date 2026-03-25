import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type { CrawlResult, CrawlPageResult } from "@/types/canvas";
import { scoreSeo } from "@/lib/seo-scorer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    marginBottom: 24,
    borderBottom: "2px solid #18181b",
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: "#71717a",
  },
  statsRow: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f4f4f5",
    borderRadius: 4,
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
  },
  statLabel: {
    fontSize: 8,
    color: "#71717a",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginTop: 20,
    marginBottom: 10,
    borderBottom: "1px solid #e4e4e7",
    paddingBottom: 4,
  },
  pageCard: {
    marginBottom: 14,
    padding: 12,
    backgroundColor: "#fafafa",
    borderRadius: 4,
    border: "1px solid #e4e4e7",
  },
  pageUrl: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#18181b",
    marginBottom: 2,
  },
  pageTitle: {
    fontSize: 9,
    color: "#52525b",
    marginBottom: 6,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  scoreBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  issueRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 3,
    paddingLeft: 8,
  },
  issueSeverity: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    width: 50,
  },
  issueText: {
    fontSize: 8,
    flex: 1,
    color: "#3f3f46",
  },
  metaRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 2,
  },
  metaLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    width: 80,
    color: "#71717a",
  },
  metaValue: {
    fontSize: 8,
    flex: 1,
    color: "#3f3f46",
  },
  chatSection: {
    marginTop: 20,
  },
  chatMessage: {
    marginBottom: 8,
    padding: 8,
    borderRadius: 4,
  },
  chatUser: {
    backgroundColor: "#18181b",
    color: "#ffffff",
  },
  chatAssistant: {
    backgroundColor: "#f4f4f5",
    color: "#18181b",
  },
  chatRole: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
    textTransform: "uppercase",
  },
  chatText: {
    fontSize: 9,
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#a1a1aa",
  },
});

function getScoreColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

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

  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document>
      {/* Overview Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>SEO Analysis Report</Text>
          <Text style={styles.subtitle}>
            {domain} — {date}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{pages.length}</Text>
            <Text style={styles.statLabel}>Pages Crawled</Text>
          </View>
          <View style={styles.statBox}>
            <Text
              style={[styles.statValue, { color: getScoreColor(avgScore) }]}
            >
              {avgScore}
            </Text>
            <Text style={styles.statLabel}>Average SEO Score</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalIssues}</Text>
            <Text style={styles.statLabel}>Total Issues</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {totalWords.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Total Words</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Page Analysis</Text>

        {pages.map((page, i) => {
          const seo = scores[i];
          const path = (() => {
            try {
              return new URL(page.url).pathname;
            } catch {
              return page.url;
            }
          })();

          return (
            <View key={page.url} style={styles.pageCard} wrap={false}>
              <Text style={styles.pageUrl}>{path}</Text>
              <Text style={styles.pageTitle}>
                {page.title || "(no title)"}
              </Text>

              <View style={styles.scoreRow}>
                <Text
                  style={[
                    styles.scoreBadge,
                    { backgroundColor: getScoreColor(seo.score) },
                  ]}
                >
                  {seo.score}/100
                </Text>
                <Text style={{ fontSize: 8, color: "#71717a" }}>
                  {seo.summary}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Words</Text>
                <Text style={styles.metaValue}>{page.seo.wordCount}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Links</Text>
                <Text style={styles.metaValue}>
                  {page.seo.internalLinkCount} internal,{" "}
                  {page.seo.externalLinkCount} external
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Images</Text>
                <Text style={styles.metaValue}>
                  {page.seo.imageCount} total, {page.seo.imagesWithoutAlt}{" "}
                  missing alt
                </Text>
              </View>

              {seo.issues.length > 0 && (
                <View style={{ marginTop: 6 }}>
                  {seo.issues.map((issue, j) => (
                    <View key={j} style={styles.issueRow}>
                      <Text
                        style={[
                          styles.issueSeverity,
                          {
                            color:
                              issue.severity === "error"
                                ? "#ef4444"
                                : issue.severity === "warning"
                                  ? "#f59e0b"
                                  : "#3b82f6",
                          },
                        ]}
                      >
                        [{issue.severity.toUpperCase()}]
                      </Text>
                      <Text style={styles.issueText}>
                        {issue.title}: {issue.description}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.footer} fixed>
          <Text>SEO Analysis Report — {domain}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>

      {/* Chat Q&A Page (if any) */}
      {chatMessages && chatMessages.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>SEO Advisor Q&A</Text>

          {chatMessages.map((msg, i) => (
            <View
              key={i}
              style={[
                styles.chatMessage,
                msg.role === "user" ? styles.chatUser : styles.chatAssistant,
              ]}
              wrap={false}
            >
              <Text
                style={[
                  styles.chatRole,
                  {
                    color:
                      msg.role === "user" ? "#a1a1aa" : "#71717a",
                  },
                ]}
              >
                {msg.role === "user" ? "You" : "SEO Advisor"}
              </Text>
              <Text
                style={[
                  styles.chatText,
                  { color: msg.role === "user" ? "#ffffff" : "#18181b" },
                ]}
              >
                {msg.text}
              </Text>
            </View>
          ))}

          <View style={styles.footer} fixed>
            <Text>SEO Analysis Report — {domain}</Text>
            <Text
              render={({ pageNumber, totalPages }) =>
                `Page ${pageNumber} of ${totalPages}`
              }
            />
          </View>
        </Page>
      )}
    </Document>
  );
}

export async function generatePdf(
  crawlResult: CrawlResult,
  chatMessages?: ChatMessage[]
): Promise<Blob> {
  const doc = <SeoReport crawlResult={crawlResult} chatMessages={chatMessages} />;
  const blob = await pdf(doc).toBlob();
  return blob;
}
