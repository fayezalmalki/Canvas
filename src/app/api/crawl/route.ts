import { crawlSite, crawlSpecificUrls } from "@/lib/crawler";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, maxDepth = 2, maxPages = 20, onlyUrls } = body;

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const depth = Math.min(Math.max(1, maxDepth), 5);
    const pages = Math.min(Math.max(1, maxPages), 50);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        function send(event: object) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }

        try {
          if (Array.isArray(onlyUrls) && onlyUrls.length > 0) {
            await crawlSpecificUrls(url, onlyUrls.slice(0, pages), {
              onProgress: (event) => send(event),
            });
          } else {
            await crawlSite(url, {
              maxDepth: depth,
              maxPages: pages,
              onProgress: (event) => send(event),
            });
          }
          controller.close();
        } catch (error: any) {
          send({ type: "error", message: error.message || "Crawl failed" });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Crawl failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
