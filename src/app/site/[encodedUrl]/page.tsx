"use client";

import { use, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useSiteContext } from "@/context/site-context";
import { deduplicatePages } from "@/lib/dedup-pages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrokenLinksPanel } from "@/components/site/broken-links-panel";
import { ContentIssuesPanel } from "@/components/site/content-issues-panel";
import {
  FileText,
  Link2,
  Image,
  AlertTriangle,
  Search,
  Code,
  Loader2,
  Plus,
  LayoutGrid,
  List,
  ChevronRight,
  ExternalLink as ExternalLinkIcon,
  Globe,
  Link2Off,
  FileWarning,
  Languages,
  Timer,
  Gauge,
} from "lucide-react";
import type { CrawlPageResult } from "@/types/canvas";
import { scoreSeo } from "@/lib/seo-scorer";

type ViewMode = "list" | "grid";

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
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  if (!crawlResult) return null;

  const pages = deduplicatePages(crawlResult.pages);

  // Aggregate stats
  const totalInternalLinks = pages.reduce((s, p) => s + p.seo.internalLinkCount, 0);
  const totalExternalLinks = pages.reduce((s, p) => s + p.seo.externalLinkCount, 0);
  const totalImages = pages.reduce((s, p) => s + p.seo.imageCount, 0);
  const missingAlt = pages.reduce((s, p) => s + p.seo.imagesWithoutAlt, 0);
  const missingDescription = pages.filter((p) => !p.seo.meta.description).length;
  const hasStructuredData = pages.filter((p) => p.seo.hasStructuredData).length;
  const avgWordCount = Math.round(
    pages.reduce((s, p) => s + p.seo.wordCount, 0) / pages.length
  );

  // Average SEO score
  const avgSeoScore = Math.round(
    pages.reduce((s, p) => s + scoreSeo({ url: p.url, title: p.title, seo: p.seo }).score, 0) / pages.length
  );
  const avgScoreColor = avgSeoScore >= 80 ? "text-emerald-500" : avgSeoScore >= 50 ? "text-amber-500" : "text-red-500";

  // Performance averages
  const pagesWithPerf = pages.filter((p) => p.seo.performance);
  const avgResponseTime = pagesWithPerf.length > 0
    ? Math.round(pagesWithPerf.reduce((s, p) => s + (p.seo.performance?.responseTimeMs ?? 0), 0) / pagesWithPerf.length)
    : null;

  // i18n stats
  const pagesWithArabic = pages.filter((p) => p.seo.i18n?.hasArabicContent).length;

  // Broken links count
  const brokenLinksCount = crawlResult.brokenLinks?.length ?? 0;
  const redirectChainsCount = crawlResult.redirectChains?.length ?? 0;

  const stats = [
    { label: "Pages", value: pages.length, icon: FileText },
    { label: "Avg SEO Score", value: avgSeoScore, icon: Gauge, color: avgScoreColor },
    { label: "Internal Links", value: totalInternalLinks, icon: Link2 },
    { label: "External Links", value: totalExternalLinks, icon: ExternalLinkIcon },
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
    ...(brokenLinksCount > 0 ? [{
      label: "Broken Links",
      value: brokenLinksCount,
      icon: Link2Off,
      warning: true,
    }] : []),
    ...(avgResponseTime !== null ? [{
      label: "Avg Response",
      value: avgResponseTime,
      icon: Timer,
      suffix: "ms",
      warning: avgResponseTime > 3000,
    }] : []),
  ];

  // Group pages by top-level route segment
  const grouped = useMemo(() => {
    const groups = new Map<string, CrawlPageResult[]>();
    for (const page of pages) {
      try {
        const pathname = new URL(page.url).pathname;
        const segments = pathname.split("/").filter(Boolean);
        const group = segments.length === 0 ? "/" : `/${segments[0]}`;
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group)!.push(page);
      } catch {
        if (!groups.has("/")) groups.set("/", []);
        groups.get("/")!.push(page);
      }
    }
    // Sort groups: root first, then alphabetical
    return [...groups.entries()].sort(([a], [b]) => {
      if (a === "/") return -1;
      if (b === "/") return 1;
      return a.localeCompare(b);
    });
  }, [pages]);

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
      router.push(`/site/${encodedRoot}/_root`);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Site Overview</h2>
        <p className="text-sm text-muted-foreground">
          {new URL(rootUrl).hostname} &middot; {pages.length} pages &middot; avg {avgWordCount} words/page
          {avgResponseTime !== null && ` · avg ${avgResponseTime}ms response`}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-card p-3 space-y-1"
          >
            <div className="flex items-center gap-1.5">
              <stat.icon
                className={`h-3.5 w-3.5 ${stat.warning ? "text-amber-500" : "text-muted-foreground"}`}
              />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <div className={`text-xl font-semibold font-mono ${"color" in stat && stat.color ? stat.color : stat.warning ? "text-amber-500" : ""}`}>
              {stat.value}{"suffix" in stat && stat.suffix ? stat.suffix : ""}
            </div>
          </div>
        ))}
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
            <Button variant="outline" size="sm" onClick={handleContinueCrawl}>
              <Plus className="h-4 w-4" />
              Crawl Remaining
            </Button>
          )}
        </div>
      )}

      {/* Audit Tabs */}
      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages">
            Pages ({pages.length})
          </TabsTrigger>
          {(brokenLinksCount > 0 || redirectChainsCount > 0) && (
            <TabsTrigger value="broken-links">
              Links Health
              {brokenLinksCount > 0 && (
                <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0 text-amber-500 border-amber-500/30">
                  {brokenLinksCount}
                </Badge>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="content">
            Content Issues
          </TabsTrigger>
          {pagesWithArabic > 0 && (
            <TabsTrigger value="i18n">
              <Languages className="h-3.5 w-3.5" />
              i18n
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="pages" className="mt-4">
          <div className="flex justify-end mb-3">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
              <button
                onClick={() => setViewMode("list")}
                className={`rounded p-1.5 transition-colors ${viewMode === "list" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded p-1.5 transition-colors ${viewMode === "grid" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          {viewMode === "list" ? (
            <div className="space-y-6">
              {grouped.map(([group, groupPages]) => (
                <div key={group}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">
                      {group}
                    </span>
                    <span className="text-xs text-muted-foreground/50">
                      {groupPages.length} {groupPages.length === 1 ? "page" : "pages"}
                    </span>
                  </div>
                  <div className="rounded-lg border border-border bg-card divide-y divide-border">
                    {groupPages.map((page) => (
                      <PageListItem
                        key={page.url}
                        page={page}
                        onClick={() => handlePageClick(page.url)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pages.map((page) => (
                <PageGridItem
                  key={page.url}
                  page={page}
                  showImages={showImages}
                  onClick={() => handlePageClick(page.url)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {(brokenLinksCount > 0 || redirectChainsCount > 0) && (
          <TabsContent value="broken-links" className="mt-4">
            <BrokenLinksPanel
              brokenLinks={crawlResult.brokenLinks ?? []}
              redirectChains={crawlResult.redirectChains ?? []}
            />
          </TabsContent>
        )}

        <TabsContent value="content" className="mt-4">
          <ContentIssuesPanel pages={pages} />
        </TabsContent>

        {pagesWithArabic > 0 && (
          <TabsContent value="i18n" className="mt-4">
            <I18nSummary pages={pages} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function I18nSummary({ pages }: { pages: CrawlPageResult[] }) {
  const arabicPages = pages.filter((p) => p.seo.i18n?.hasArabicContent);
  const rtlPages = pages.filter((p) => p.seo.i18n?.dir === "rtl");
  const hreflangPages = pages.filter((p) => (p.seo.i18n?.hreflangLinks.length ?? 0) > 0);
  const missingRtl = arabicPages.filter((p) => p.seo.i18n?.dir !== "rtl");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3 space-y-1">
          <div className="text-xs text-muted-foreground">Arabic Pages</div>
          <div className="text-xl font-semibold font-mono">{arabicPages.length}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 space-y-1">
          <div className="text-xs text-muted-foreground">RTL Configured</div>
          <div className="text-xl font-semibold font-mono">{rtlPages.length}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 space-y-1">
          <div className="text-xs text-muted-foreground">Has Hreflang</div>
          <div className="text-xl font-semibold font-mono">{hreflangPages.length}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 space-y-1">
          <div className="text-xs text-muted-foreground">Missing RTL</div>
          <div className={`text-xl font-semibold font-mono ${missingRtl.length > 0 ? "text-red-500" : ""}`}>
            {missingRtl.length}
          </div>
        </div>
      </div>

      {missingRtl.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2 text-red-500">
            Arabic pages without dir="rtl"
          </h3>
          <div className="rounded-lg border border-red-500/20 bg-card divide-y divide-border">
            {missingRtl.map((page) => {
              let pathname = "/";
              try { pathname = new URL(page.url).pathname; } catch {}
              return (
                <div key={page.url} className="p-3 flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-red-500 border-red-500/30">
                    {Math.round((page.seo.i18n?.arabicRatio ?? 0) * 100)}% Arabic
                  </Badge>
                  <div className="min-w-0">
                    <div className="text-sm truncate">{page.title || "Untitled"}</div>
                    <div className="text-[11px] text-muted-foreground font-mono truncate">{pathname}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {arabicPages.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">All Arabic Content Pages</h3>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {arabicPages.map((page) => {
              let pathname = "/";
              try { pathname = new URL(page.url).pathname; } catch {}
              return (
                <div key={page.url} className="p-3 flex items-center gap-3">
                  <div className="flex gap-1.5 shrink-0">
                    <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono">
                      {Math.round((page.seo.i18n?.arabicRatio ?? 0) * 100)}%
                    </Badge>
                    {page.seo.i18n?.dir === "rtl" && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 text-emerald-500 border-emerald-500/30">
                        RTL
                      </Badge>
                    )}
                    {(page.seo.i18n?.hreflangLinks.length ?? 0) > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 text-emerald-500 border-emerald-500/30">
                        hreflang
                      </Badge>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm truncate">{page.title || "Untitled"}</div>
                    <div className="text-[11px] text-muted-foreground font-mono truncate">{pathname}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PageListItem({ page, onClick }: { page: CrawlPageResult; onClick: () => void }) {
  let pathname = "/";
  try { pathname = new URL(page.url).pathname; } catch {}

  const wordCount = page.seo.wordCount;
  const hasOg = !!page.seo.meta.ogTitle;
  const hasDesc = !!page.seo.meta.description;
  const lang = page.seo.meta.language;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-accent/50 group"
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {page.title || "Untitled"}
          </span>
          {lang && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
              {lang}
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground font-mono truncate">
          {pathname}
        </div>
        {/* Mini summary */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
          <span>{wordCount} words</span>
          <span>{page.seo.internalLinkCount} links</span>
          <span>{page.seo.imageCount} imgs</span>
          {page.seo.performance && (
            <span className={page.seo.performance.responseTimeMs > 3000 ? "text-amber-500" : ""}>
              {page.seo.performance.responseTimeMs}ms
            </span>
          )}
          {page.seo.headings.filter(h => h.tag === "h1").length > 0 && (
            <span className="truncate max-w-[200px]">
              H1: {page.seo.headings.find(h => h.tag === "h1")?.text}
            </span>
          )}
        </div>
        {/* Issue badges */}
        <div className="flex gap-1.5">
          {!hasDesc && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-500 border-amber-500/30">
              No meta desc
            </Badge>
          )}
          {!hasOg && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-500 border-amber-500/30">
              No OG tags
            </Badge>
          )}
          {page.seo.imagesWithoutAlt > 0 && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-500 border-amber-500/30">
              {page.seo.imagesWithoutAlt} img no alt
            </Badge>
          )}
          {page.seo.hasStructuredData && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 text-emerald-500 border-emerald-500/30">
              Schema
            </Badge>
          )}
          {page.seo.i18n?.hasArabicContent && page.seo.i18n?.dir !== "rtl" && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 text-red-500 border-red-500/30">
              No RTL
            </Badge>
          )}
          {page.seo.i18n?.hasArabicContent && page.seo.i18n?.dir === "rtl" && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 text-emerald-500 border-emerald-500/30">
              RTL
            </Badge>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-1 group-hover:text-foreground transition-colors" />
    </button>
  );
}

function PageGridItem({
  page,
  showImages,
  onClick,
}: {
  page: CrawlPageResult;
  showImages: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
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
        <div className="text-sm font-medium truncate">{page.title || "Untitled"}</div>
        <div className="text-xs text-muted-foreground font-mono truncate">
          {new URL(page.url).pathname}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {page.seo.wordCount} words &middot; {page.seo.internalLinkCount} links
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
  );
}
