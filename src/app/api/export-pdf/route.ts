import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { generatePdfHtml } from "@/lib/pdf-template";
import type { Locale } from "@/lib/i18n";

export const maxDuration = 120;

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

    // Generate HTML
    const html = generatePdfHtml(crawlData, locale);

    // Launch Chromium and generate PDF
    let browser;
    try {
      const puppeteer = await import("puppeteer-core");

      let executablePath: string;
      if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
        // Serverless environment
        const chromium = (await import("@sparticuz/chromium")).default;
        executablePath = await chromium.executablePath();
        browser = await puppeteer.default.launch({
          args: chromium.args,
          defaultViewport: { width: 1280, height: 720 },
          executablePath,
          headless: true,
        });
      } else {
        // Local development — use system Chrome
        const possiblePaths = [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/usr/bin/google-chrome",
          "/usr/bin/chromium-browser",
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        ];
        const fs = await import("fs");
        executablePath =
          possiblePaths.find((p) => fs.existsSync(p)) || possiblePaths[0];
        browser = await puppeteer.default.launch({
          executablePath,
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
      }

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });

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
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  } catch (error) {
    console.error("PDF export error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
