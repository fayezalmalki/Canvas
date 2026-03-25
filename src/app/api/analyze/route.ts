import { NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { z } from "zod";
import { getStructuredModel, getProviderName } from "@/lib/ai-provider";
import { scoreSeo, formatSeoScoreForPrompt } from "@/lib/seo-scorer";

export const maxDuration = 60;

const LlmAnalysisSchema = z.object({
  contentAnalysis: z.object({
    summary: z.string(),
    readabilityScore: z.number().min(0).max(100),
    keyTopics: z.array(z.string()),
    contentGaps: z.array(z.string()),
  }),
  features: z.object({
    detected: z.array(z.string()),
    technologies: z.array(z.string()),
  }),
  recommendations: z.array(
    z.object({
      priority: z.enum(["high", "medium", "low"]),
      title: z.string(),
      description: z.string(),
    })
  ),
});

export async function POST(request: Request) {
  try {
    const { url, title, bodyText, seo, outgoingLinks } = await request.json();

    if (!url || !seo) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Phase 1: Deterministic SEO scoring (instant, free)
    const seoScoreResult = scoreSeo({ url, title, seo });

    // Check if an AI provider is configured
    const provider = getProviderName();
    if (!provider) {
      // Return just the SEO score without LLM analysis
      return NextResponse.json({
        seoScore: seoScoreResult.score,
        seoIssues: seoScoreResult.issues,
        contentAnalysis: null,
        features: null,
        recommendations: [],
        provider: null,
      });
    }

    // Phase 2: LLM analysis with scorer context
    const seoPromptBlock = formatSeoScoreForPrompt(seoScoreResult);

    const prompt = `Analyze this web page and provide content analysis, feature detection, and strategic recommendations.

Page URL: ${url}
Page Title: ${title || "Not set"}

${seoPromptBlock}

Page Stats:
- Headings: ${seo.headings?.map((h: any) => `${h.tag}: ${h.text}`).join(", ") || "None"}
- Images: ${seo.imageCount} total, ${seo.imagesWithoutAlt} missing alt text
- Internal links: ${seo.internalLinkCount}
- External links: ${seo.externalLinkCount}

Outgoing Links (${outgoingLinks?.length || 0}):
${outgoingLinks?.slice(0, 20).map((l: any) => `- [${l.context}] ${l.anchorText || l.url}`).join("\n") || "None"}

Page Content (first 3000 chars):
${bodyText || "No content extracted"}

Based on the deterministic SEO analysis above and the page content, provide:
1. Content analysis: summary, readability score (0-100), key topics, content gaps
2. Feature detection: detected features (Forms, Auth, Search, Blog, etc.) and technologies (React, WordPress, Tailwind, etc.)
3. Strategic recommendations with priority (high/medium/low) — focus on actionable improvements`;

    const model = getStructuredModel();
    const result = await generateText({
      model,
      output: Output.object({ schema: LlmAnalysisSchema }),
      prompt,
    });

    return NextResponse.json({
      seoScore: seoScoreResult.score,
      seoIssues: seoScoreResult.issues,
      contentAnalysis: result.output?.contentAnalysis ?? null,
      features: result.output?.features ?? null,
      recommendations: result.output?.recommendations ?? [],
      provider,
    });
  } catch (error: any) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: error.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
