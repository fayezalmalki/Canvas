import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { generatePdfBuffer } from "@/lib/pdf-template";
import type { Locale } from "@/lib/i18n";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { slug, locale = "en" } = (await req.json()) as {
      slug: string;
      locale?: Locale;
    };

    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    // Fetch crawl data from Convex
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json(
        { error: "Convex URL not configured" },
        { status: 500 }
      );
    }

    const client = new ConvexHttpClient(convexUrl);
    const crawlData = await client.query(api.crawls.getCrawlBySlug, { slug });

    if (!crawlData) {
      return NextResponse.json(
        { error: "Crawl not found" },
        { status: 404 }
      );
    }

    // Generate PDF directly (no browser needed)
    const pdfBuffer = generatePdfBuffer(crawlData, locale);

    let domain = "";
    try {
      domain = new URL(crawlData.rootUrl).hostname;
    } catch {
      domain = "report";
    }
    const dateStr = new Date().toISOString().slice(0, 10);

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${domain}-seo-report-${dateStr}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF export error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
