import { NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { z } from "zod";
import { getStructuredModel, getProviderName } from "@/lib/ai-provider";

export const maxDuration = 60;

const AeoTestSchema = z.object({
  whatItOffers: z.string(),
  couldCiteConfidently: z.enum(["yes", "partly", "no"]),
  confidence: z.number().min(0).max(100),
  missingForCitation: z.array(z.string()),
  detectedEntities: z.array(z.string()),
});

interface Heading { tag: string; text: string }

export async function POST(request: Request) {
  try {
    const { url, title, bodyText, headings, locale = "en" } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const provider = getProviderName();
    if (!provider) {
      return NextResponse.json({ result: null, provider: null });
    }

    const lang = locale === "ar" ? "Arabic" : "English";
    const headingList = Array.isArray(headings)
      ? (headings as Heading[]).map((h) => `${h.tag}: ${h.text}`).join("\n")
      : "";

    const prompt = `You are an AI assistant deciding whether you could cite this web page in an answer. Judge ONLY from the content below — do not use any outside knowledge.

URL: ${url}
Title: ${title || "(none)"}
Headings:
${headingList || "(none)"}

Content (first 3000 chars):
${bodyText || "(no extractable text)"}

Answer in ${lang}:
- whatItOffers: one sentence describing what this page is about / offers.
- couldCiteConfidently: "yes", "partly", or "no" — could you confidently cite this page?
- confidence: 0-100.
- missingForCitation: concrete things that, if present, would make citation more confident (clear entities, dates, author, structured facts, explicit claims).
- detectedEntities: the main named entities / topics you can identify from the content.`;

    const result = await generateText({
      model: getStructuredModel(),
      output: Output.object({ schema: AeoTestSchema }),
      prompt,
    });

    return NextResponse.json({ result: result.output ?? null, provider });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "AEO test failed";
    console.error("AEO test error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
