import { NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { z } from "zod";
import { getStructuredModel, getProviderName } from "@/lib/ai-provider";
import { scoreSeo, formatSeoScoreForPrompt } from "@/lib/seo-scorer";

export const maxDuration = 60;

const FixSchema = z.object({
  title: z.string(),
  metaDescription: z.string(),
  altTextSuggestions: z.array(z.object({ imageHint: z.string(), alt: z.string() })),
  jsonLd: z.object({ type: z.string(), json: z.string() }),
});

export async function POST(request: Request) {
  try {
    const { url, title, bodyText, seo, locale = "en" } = await request.json();

    if (!url || !seo) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // No AI provider → let the client render a deterministic fallback instead.
    const provider = getProviderName();
    if (!provider) {
      return NextResponse.json({ fixes: null, provider: null });
    }

    const seoPromptBlock = formatSeoScoreForPrompt(scoreSeo({ url, title, seo }));
    const isArabic = Boolean(seo?.i18n?.hasArabicContent) || locale === "ar";
    const lang = locale === "ar" ? "Arabic" : "English";

    const prompt = `You are an SEO and AI-visibility expert. Rewrite this page's metadata so it ranks better in search AND is easy for AI assistants to understand and cite.
Write ALL output in ${lang}${isArabic ? " (this is an Arabic page)" : ""}. Use ONLY facts present in the page content below — do not invent claims, prices, or names.

Page URL: ${url}
Current title: ${title || "(none)"}

${seoPromptBlock}

Page content (first 3000 chars):
${bodyText || "No content extracted"}

Produce:
1. title — 30 to 60 characters, compelling, leads with the page's primary topic/entity.
2. metaDescription — 70 to 160 characters, accurate and action-oriented.
3. altTextSuggestions — up to 3 concise alt texts for the page's likely key images (imageHint = what the image probably depicts).
4. jsonLd — pick the single most relevant Schema.org type (type = e.g. "Product", "Article", "Organization", "WebPage", "FAQPage"); json = one complete, valid JSON-LD string including "@context" and "@type", using only real facts from the page.`;

    const result = await generateText({
      model: getStructuredModel(),
      output: Output.object({ schema: FixSchema }),
      prompt,
    });

    return NextResponse.json({ fixes: result.output ?? null, provider });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Fix failed";
    console.error("Fix error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
