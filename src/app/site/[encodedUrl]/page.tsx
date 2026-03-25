"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useSiteContext } from "@/context/site-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Link2,
  Image,
  AlertTriangle,
  Search,
  Code,
  Loader2,
  Plus,
} from "lucide-react";

export default function SiteOverview({
  params,
}: {
  params: Promise<{ encodedUrl: string }>;
}) {
  const { encodedUrl } = use(params);
  const rootUrl = decodeURIComponent(encodedUrl);
  const { crawlResult, showImages, discoveredUrls, setCrawlResult } = useSiteContext();
  const router = useRouter();
  const storeCrawl = useMutation(api.crawls.storeCrawlResult);
  const [continueCrawling, setContinueCrawling] = useState(false);
  const [continueProgress, setContinueProgress] = useState({ current: 0, total: 0 });

  if (!crawlResult) return null;

  // Deduplicate pages by normalized URL
  const seen = new Set<string>();
  const pages = crawlResult.pages.filter((p) => {
    const key = p.url.replace(/\/+$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Aggregate stats
  const totalLinks = pages.reduce(
    (sum, p) => sum + p.outgoingLinks.length,
    0
  );
  const totalImages = pages.reduce((sum, p) => sum + p.seo.imageCount, 0);
  const missingAlt = pages.reduce(
    (sum, p) => sum + p.seo.imagesWithoutAlt,
    0
  );
  const missingDescription = pages.filter(
    (p) => !p.seo.meta.description
  ).length;
  const hasStructuredData = pages.filter(
    (p) => p.seo.hasStructuredData
  ).length;
  const avgWordCount = Math.round(
    pages.reduce((sum, p) => sum + p.seo.wordCount, 0) / pages.length
  );

  const stats = [
    { label: "Pages", value: pages.length, icon: FileText },
    { label: "Links", value: totalLinks, icon: Link2 },
    { label: "Images", value: totalImages, icon: Image },
    {
      label: "Missing Alt",
      value: missingAlt,
      icon: AlertTriangle,
      warning: missingAlt > 0,
    },
    {
      label: "No Meta Desc",
      value: missingDescription,
      icon: Search,
      warning: missingDescription > 0,
    },
    { label: "Structured Data", value: hasStructuredData, icon: Code },
  ];

  async function handleContinueCrawl() {
    if (discoveredUrls.length === 0) return;
    setContinueCrawling(true);
    setContinueProgress({ current: 0, total: Math.min(discoveredUrls.length, 50) });

    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: rootUrl,
          maxDepth: 2,
          maxPages: Math.min(discoveredUrls.length, 50),
          onlyUrls: discoveredUrls.slice(0, 50),
        }),
      });

      if (!res.ok) throw new Error("Crawl failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "page_crawled") {
              setContinueProgress({ current: event.index, total: event.total });
            } else if (event.type === "complete" && event.result) {
              // Merge new pages with existing and store as new crawl
              const existingUrls = new Set(crawlResult!.pages.map((p) => p.url));
              const newPages = event.result.pages.filter(
                (p: any) => !existingUrls.has(p.url)
              );
              const allPages = [...crawlResult!.pages, ...newPages];
              const remainingDiscovered = event.result.discoveredUrls ?? [];

              await storeCrawl({
                rootUrl,
                pages: allPages,
                discoveredUrls: remainingDiscovered,
              });

              // Force reload to pick up new data from Convex
              window.location.reload();
              return;
            }
          } catch {
            // skip parse errors
          }
        }
      }
    } catch (err: any) {
      console.error("Continue crawl failed:", err);
    } finally {
      setContinueCrawling(false);
    }
  }

  function handlePageClick(pageUrl: string) {
    const parsed = new URL(pageUrl);
    const pagePath = parsed.pathname === "/" ? "" : parsed.pathname;
    const encodedRoot = encodeURIComponent(rootUrl);
    if (pagePath) {
      router.push(`/site/${encodedRoot}/${pagePath.slice(1)}`);
    } else {
      // For root page, we're already on the overview, so navigate to detail
      router.push(`/site/${encodedRoot}/_root`);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Site Overview</h2>
        <p className="text-sm text-muted-foreground">
          Summary of {new URL(rootUrl).hostname}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-card p-3 space-y-1"
          >
            <div className="flex items-center gap-1.5">
              <stat.icon
                className={`h-3.5 w-3.5 ${
                  stat.warning
                    ? "text-amber-500"
                    : "text-muted-foreground"
                }`}
              />
              <span className="text-xs text-muted-foreground">
                {stat.label}
              </span>
            </div>
            <div
              className={`text-xl font-semibold font-mono ${
                stat.warning ? "text-amber-500" : ""
              }`}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Avg word count */}
      <div className="text-xs text-muted-foreground">
        Average word count: <span className="font-mono">{avgWordCount}</span>{" "}
        words per page
      </div>

      {/* Continue crawl banner */}
      {discoveredUrls.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="text-sm font-medium">
              {discoveredUrls.length} more pages discovered
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {pages.length} pages crawled out of {pages.length + discoveredUrls.length} found on the site
            </div>
          </div>
          {continueCrawling ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Crawling {continueProgress.current}/{continueProgress.total}...
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleContinueCrawl}
            >
              <Plus className="h-4 w-4" />
              Crawl Remaining
            </Button>
          )}
        </div>
      )}

      {/* Page thumbnails */}
      <div>
        <h3 className="text-sm font-medium mb-3">Crawled Pages</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pages.map((page) => (
            <button
              key={page.url}
              onClick={() => handlePageClick(page.url)}
              className="group rounded-lg border border-border bg-card overflow-hidden text-left transition-colors hover:border-primary/50"
            >
              {showImages && (
                <div className="aspect-video bg-muted overflow-hidden">
                  {page.screenshot ? (
                    <img
                      src={page.screenshot}
                      alt={page.title}
                      className="h-full w-full object-cover object-top transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center flex-col gap-1">
                      <FileText className="h-6 w-6 text-muted-foreground/40" />
                      <span className="text-[10px] text-muted-foreground/50 font-mono truncate max-w-[120px]">
                        {(() => { try { return new URL(page.url).pathname; } catch { return page.url; } })()}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <div className="p-3 space-y-1">
                <div className="text-sm font-medium truncate">
                  {page.title || "Untitled"}
                </div>
                <div className="text-xs text-muted-foreground font-mono truncate">
                  {new URL(page.url).pathname}
                </div>
                <div className="flex gap-1.5 pt-1">
                  {!page.seo.meta.description && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-500 border-amber-500/30">
                      No meta desc
                    </Badge>
                  )}
                  {page.seo.imagesWithoutAlt > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-500 border-amber-500/30">
                      {page.seo.imagesWithoutAlt} img no alt
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
