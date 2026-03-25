import { streamText, convertToModelMessages, UIMessage } from "ai";
import { getModel, getProviderName } from "@/lib/ai-provider";
import { scoreSeo, formatSeoScoreForPrompt } from "@/lib/seo-scorer";
import type { CrawlPageResult } from "@/types/canvas";

export const maxDuration = 60;

interface SiteContext {
  rootUrl: string;
  pages: CrawlPageResult[];
}

function buildSystemPrompt(site: SiteContext): string {
  let domain = "";
  try {
    domain = new URL(site.rootUrl).hostname;
  } catch {
    domain = site.rootUrl;
  }

  // Build per-page SEO summaries
  const pageSummaries = site.pages
    .map((page, i) => {
      const seo = scoreSeo({ url: page.url, title: page.title, seo: page.seo });
      const path = new URL(page.url).pathname;
      const issues = seo.issues
        .map((iss) => `  - [${iss.severity}] ${iss.title}: ${iss.description}`)
        .join("\n");
      return `Page ${i + 1}: ${path}
  Title: ${page.title || "(none)"}
  SEO Score: ${seo.score}/100 — ${seo.summary}
  Word Count: ${page.seo.wordCount}
  Headings: ${page.seo.headings.map((h) => `${h.tag}:${h.text}`).join(", ") || "None"}
  Images: ${page.seo.imageCount} total, ${page.seo.imagesWithoutAlt} missing alt
  Links: ${page.seo.internalLinkCount} internal, ${page.seo.externalLinkCount} external
  Meta Description: ${page.seo.meta.description || "(missing)"}
  Canonical: ${page.seo.meta.canonical || "(missing)"}
  Structured Data: ${page.seo.hasStructuredData ? "Yes" : "No"}
${issues ? `  Issues:\n${issues}` : "  No issues found"}`;
    })
    .join("\n\n");

  // Site-wide stats
  const totalPages = site.pages.length;
  const avgScore = Math.round(
    site.pages.reduce((sum, p) => {
      return sum + scoreSeo({ url: p.url, title: p.title, seo: p.seo }).score;
    }, 0) / totalPages
  );
  const totalIssues = site.pages.reduce((sum, p) => {
    return sum + scoreSeo({ url: p.url, title: p.title, seo: p.seo }).issues.length;
  }, 0);

  return `You are an expert SEO advisor analyzing the website "${domain}".

You have access to crawl data for ${totalPages} pages. Here is the complete analysis:

## Site Overview
- Domain: ${domain}
- Pages Crawled: ${totalPages}
- Average SEO Score: ${avgScore}/100
- Total Issues Found: ${totalIssues}

## Per-Page Analysis

${pageSummaries}

## Your Role
- Provide actionable, specific SEO advice based on the data above
- When referencing issues, cite the exact page URL/path and the specific problem
- Prioritize recommendations by impact (high → medium → low)
- Format responses with clear headings and bullet points
- Be concise but thorough — focus on what matters most
- If asked about topics not covered by the data, say so honestly
- You can compare pages against each other and identify site-wide patterns`;
}

export async function POST(request: Request) {
  try {
    const { messages, siteContext } = (await request.json()) as {
      messages: UIMessage[];
      siteContext: SiteContext;
    };

    if (!siteContext?.rootUrl || !siteContext?.pages?.length) {
      return new Response(JSON.stringify({ error: "Missing site context" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const provider = getProviderName();
    if (!provider) {
      return new Response(
        JSON.stringify({ error: "No AI provider configured" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const model = getModel();
    const system = buildSystemPrompt(siteContext);

    const result = streamText({
      model,
      system,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Chat failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
