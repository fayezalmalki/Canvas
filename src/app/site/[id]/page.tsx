"use client";

import { use, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useSiteContext } from "@/context/site-context";
import { useLocale } from "@/context/locale-context";
import { sitePageUrl, siteRootPageUrl } from "@/lib/navigation";
import { deduplicatePages } from "@/lib/dedup-pages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrokenLinksPanel } from "@/components/site/broken-links-panel";
import { ContentIssuesPanel } from "@/components/site/content-issues-panel";
import { ProductsPanel } from "@/components/site/products-panel";
import { InternalLinksPanel } from "@/components/site/internal-links-panel";
import { ExternalLinksPanel } from "@/components/site/external-links-panel";
import { ImagesPanel } from "@/components/site/images-panel";
import { SeoGuidePanel } from "@/components/site/seo-guide-panel";
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
  ShoppingCart,
  ArrowUpDown,
  Shield,
  Sparkles,
} from "lucide-react";
import type { CrawlPageResult } from "@/types/canvas";
import { scoreSeo } from "@/lib/seo-scorer";

type ViewMode = "list" | "grid";
type PageSort = "smart" | "route" | "seo-score" | "response-time" | "word-count";

export default function SiteOverview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { crawlId, crawlResult, showImages, discoveredUrls, setCrawlResult } = useSiteContext();
  const { t } = useLocale();
  const rootUrl = crawlResult?.rootUrl ?? "";
  const router = useRouter();
  const storeCrawl = useMutation(api.crawls.storeCrawlResult);
  const [continueCrawling, setContinueCrawling] = useState(false);
  const [continueProgress, setContinueProgress] = useState({ current: 0, total: 0 });
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [pageSort, setPageSort] = useState<PageSort>("smart");
  const [activeTab, setActiveTab] = useState("pages");

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

  // Products aggregation
  const allProducts = useMemo(() =>
    pages.flatMap((p) =>
      (p.products ?? []).map((prod) => ({ ...prod, pageUrl: p.url }))
    ), [pages]);
  const totalProducts = allProducts.length;

  const stats = [
    { label: t("stats.pages"), value: pages.length, icon: FileText, tab: "pages" },
    { label: t("stats.avgSeoScore"), value: avgSeoScore, icon: Gauge, color: avgScoreColor, tab: "seo-guide" },
    { label: t("stats.internalLinks"), value: totalInternalLinks, icon: Link2, tab: "internal-links" },
    { label: t("stats.externalLinks"), value: totalExternalLinks, icon: ExternalLinkIcon, tab: "external-links" },
    { label: t("stats.images"), value: totalImages, icon: Image, tab: "images" },
    {
      label: t("stats.missingAlt"),
      value: missingAlt,
      icon: AlertTriangle,
      warning: missingAlt > 0,
      tab: "images",
    },
    {
      label: t("stats.noMetaDesc"),
      value: missingDescription,
      icon: Search,
      warning: missingDescription > 0,
      tab: "content",
    },
    ...(brokenLinksCount > 0 ? [{
      label: t("stats.brokenLinks"),
      value: brokenLinksCount,
      icon: Link2Off,
      warning: true,
      tab: "broken-links",
    }] : []),
    ...(avgResponseTime !== null ? [{
      label: t("stats.avgResponse"),
      value: avgResponseTime,
      icon: Timer,
      suffix: "ms",
      warning: avgResponseTime > 3000,
      tab: "pages",
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

  // Sorted flat list (for non-route sort modes)
  const sortedPages = useMemo(() => {
    if (pageSort === "route") return pages;
    return [...pages].sort((a, b) => {
      switch (pageSort) {
        case "smart": {
          // Homepage first
          const aIsHome = (() => { try { return new URL(a.url).pathname === "/"; } catch { return false; } })();
          const bIsHome = (() => { try { return new URL(b.url).pathname === "/"; } catch { return false; } })();
          if (aIsHome && !bIsHome) return -1;
          if (bIsHome && !aIsHome) return 1;
          // Bot-protected / 0-word / error pages last
          const aIsBad = !!a.botProtection || a.seo.wordCount === 0 || a.seo.statusCode >= 400;
          const bIsBad = !!b.botProtection || b.seo.wordCount === 0 || b.seo.statusCode >= 400;
          if (aIsBad && !bIsBad) return 1;
          if (bIsBad && !aIsBad) return -1;
          // Among good pages: sort by SEO score desc, then word count desc
          const aScore = scoreSeo({ url: a.url, title: a.title, seo: a.seo }).score;
          const bScore = scoreSeo({ url: b.url, title: b.title, seo: b.seo }).score;
          if (bScore !== aScore) return bScore - aScore;
          return b.seo.wordCount - a.seo.wordCount;
        }
        case "seo-score":
          return scoreSeo({ url: b.url, title: b.title, seo: b.seo }).score -
                 scoreSeo({ url: a.url, title: a.title, seo: a.seo }).score;
        case "response-time":
          return (a.seo.performance?.responseTimeMs ?? 0) - (b.seo.performance?.responseTimeMs ?? 0);
        case "word-count":
          return b.seo.wordCount - a.seo.wordCount;
        default:
          return 0;
      }
    });
  }, [pages, pageSort]);

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
    router.push(sitePageUrl(crawlId, pageUrl));
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("overview.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {new URL(rootUrl).hostname} &middot; {pages.length} {t("overview.pagesLabel")} &middot; {t("overview.avgWords", { count: avgWordCount })}
          {avgResponseTime !== null && ` · ${t("overview.avgResponse", { time: avgResponseTime })}`}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <button
            key={stat.label}
            onClick={() => stat.tab && setActiveTab(stat.tab)}
            className="rounded-lg border border-border bg-card p-3 space-y-1 text-left transition-colors hover:border-primary/50 cursor-pointer"
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
          </button>
        ))}
      </div>

      {/* Continue crawl banner */}
      {discoveredUrls.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="text-sm font-medium">
              {t("overview.moreDiscovered", { count: discoveredUrls.length })}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {t("overview.crawledOf", { crawled: pages.length, total: pages.length + discoveredUrls.length })}
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
              {t("overview.crawlRemaining")}
            </Button>
          )}
        </div>
      )}

      {/* Audit Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="pages">
            {t("tabs.pages")} ({pages.length})
          </TabsTrigger>
          <TabsTrigger value="seo-guide">
            <Sparkles className="h-3.5 w-3.5" />
            {t("tabs.seoGuide")}
          </TabsTrigger>
          <TabsTrigger value="internal-links">
            {t("tabs.internalLinks")}
          </TabsTrigger>
          <TabsTrigger value="external-links">
            {t("tabs.externalLinks")}
          </TabsTrigger>
          <TabsTrigger value="images">
            {t("tabs.images")}
          </TabsTrigger>
          {(brokenLinksCount > 0 || redirectChainsCount > 0) && (
            <TabsTrigger value="broken-links">
              {t("tabs.linksHealth")}
              {brokenLinksCount > 0 && (
                <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0 text-amber-500 border-amber-500/30">
                  {brokenLinksCount}
                </Badge>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="content">
            {t("tabs.contentIssues")}
          </TabsTrigger>
          {pagesWithArabic > 0 && (
            <TabsTrigger value="i18n">
              <Languages className="h-3.5 w-3.5" />
              {t("tabs.i18n")}
            </TabsTrigger>
          )}
          {totalProducts > 0 && (
            <TabsTrigger value="products">
              <ShoppingCart className="h-3.5 w-3.5" />
              {t("tabs.products")}
              <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0">
                {totalProducts}
              </Badge>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="pages" className="mt-4">
          <div className="flex items-center justify-between mb-3 gap-3">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={pageSort}
                onChange={(e) => setPageSort(e.target.value as PageSort)}
                className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground"
              >
                <option value="smart">{t("sort.smart")}</option>
                <option value="route">{t("sort.route")}</option>
                <option value="seo-score">{t("sort.seoScore")}</option>
                <option value="response-time">{t("sort.responseTime")}</option>
                <option value="word-count">{t("sort.wordCount")}</option>
              </select>
            </div>
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
            pageSort === "route" ? (
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
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {sortedPages.map((page) => (
                <PageListItem
                  key={page.url}
                  page={page}
                  onClick={() => handlePageClick(page.url)}
                  sortMode={pageSort}
                />
              ))}
            </div>
            )
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {(pageSort === "route" ? pages : sortedPages).map((page) => (
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

        <TabsContent value="seo-guide" className="mt-4">
          <SeoGuidePanel pages={pages} />
        </TabsContent>

        <TabsContent value="internal-links" className="mt-4">
          <InternalLinksPanel pages={pages} />
        </TabsContent>

        <TabsContent value="external-links" className="mt-4">
          <ExternalLinksPanel pages={pages} />
        </TabsContent>

        <TabsContent value="images" className="mt-4">
          <ImagesPanel pages={pages} />
        </TabsContent>

        <TabsContent value="content" className="mt-4">
          <ContentIssuesPanel pages={pages} />
        </TabsContent>

        {pagesWithArabic > 0 && (
          <TabsContent value="i18n" className="mt-4">
            <I18nSummary pages={pages} />
          </TabsContent>
        )}

        {totalProducts > 0 && (
          <TabsContent value="products" className="mt-4">
            <ProductsPanel products={allProducts} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function I18nSummary({ pages }: { pages: CrawlPageResult[] }) {
  const { t } = useLocale();
  const arabicPages = pages.filter((p) => p.seo.i18n?.hasArabicContent);
  const rtlPages = pages.filter((p) => p.seo.i18n?.dir === "rtl");
  const hreflangPages = pages.filter((p) => (p.seo.i18n?.hreflangLinks.length ?? 0) > 0);
  const missingRtl = arabicPages.filter((p) => p.seo.i18n?.dir !== "rtl");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3 space-y-1">
          <div className="text-xs text-muted-foreground">{t("i18n.arabicPages")}</div>
          <div className="text-xl font-semibold font-mono">{arabicPages.length}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 space-y-1">
          <div className="text-xs text-muted-foreground">{t("i18n.rtlConfigured")}</div>
          <div className="text-xl font-semibold font-mono">{rtlPages.length}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 space-y-1">
          <div className="text-xs text-muted-foreground">{t("i18n.hasHreflang")}</div>
          <div className="text-xl font-semibold font-mono">{hreflangPages.length}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 space-y-1">
          <div className="text-xs text-muted-foreground">{t("i18n.missingRtl")}</div>
          <div className={`text-xl font-semibold font-mono ${missingRtl.length > 0 ? "text-red-500" : ""}`}>
            {missingRtl.length}
          </div>
        </div>
      </div>

      {missingRtl.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2 text-red-500">
            {t("i18n.arabicWithoutRtl")}
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
                    <div className="text-sm truncate" dir="auto">{page.title || t("page.untitled")}</div>
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
          <h3 className="text-sm font-medium mb-2">{t("i18n.allArabicPages")}</h3>
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
                    <div className="text-sm truncate" dir="auto">{page.title || t("page.untitled")}</div>
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

function PageListItem({ page, onClick, sortMode }: { page: CrawlPageResult; onClick: () => void; sortMode?: PageSort }) {
  const { t } = useLocale();
  let pathname = "/";
  try { pathname = new URL(page.url).pathname; } catch {}

  const wordCount = page.seo.wordCount;
  const hasOg = !!page.seo.meta.ogTitle;
  const hasDesc = !!page.seo.meta.description;
  const lang = page.seo.meta.language;
  const seoScore = sortMode === "seo-score" ? scoreSeo({ url: page.url, title: page.title, seo: page.seo }).score : null;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-accent/50 group"
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate" dir="auto">
            {page.title || t("page.untitled")}
          </span>
          {lang && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
              {lang}
            </Badge>
          )}
          {page.botProtection && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0 text-amber-500 border-amber-500/30">
              <Shield className="h-2.5 w-2.5 mr-0.5" />
              {page.botProtection}
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground font-mono truncate">
          {pathname}
        </div>
        {/* Mini summary */}
        {!page.botProtection && <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
          <span>{wordCount} {t("page.words")}</span>
          <span>{page.seo.internalLinkCount} {t("page.linksLabel")}</span>
          <span>{page.seo.imageCount} {t("page.imgs")}</span>
          {page.seo.performance && (
            <span className={page.seo.performance.responseTimeMs > 3000 ? "text-amber-500" : ""}>
              {page.seo.performance.responseTimeMs}ms
            </span>
          )}
          {page.seo.headings.filter(h => h.tag === "h1").length > 0 && (
            <span className="truncate max-w-[200px]">
              <span dir="auto">H1: {page.seo.headings.find(h => h.tag === "h1")?.text}</span>
            </span>
          )}
        </div>}
        {/* Issue badges */}
        <div className="flex gap-1.5">
          {!hasDesc && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-500 border-amber-500/30">
              {t("common.noMetaDesc")}
            </Badge>
          )}
          {!hasOg && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-500 border-amber-500/30">
              {t("common.noOgTags")}
            </Badge>
          )}
          {page.seo.imagesWithoutAlt > 0 && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-500 border-amber-500/30">
              {page.seo.imagesWithoutAlt} {t("common.imgNoAlt")}
            </Badge>
          )}
          {page.seo.hasStructuredData && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 text-emerald-500 border-emerald-500/30">
              {t("common.schema")}
            </Badge>
          )}
          {page.seo.i18n?.hasArabicContent && page.seo.i18n?.dir !== "rtl" && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 text-red-500 border-red-500/30">
              {t("common.noRtl")}
            </Badge>
          )}
          {page.seo.i18n?.hasArabicContent && page.seo.i18n?.dir === "rtl" && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 text-emerald-500 border-emerald-500/30">
              {t("common.rtl")}
            </Badge>
          )}
        </div>
      </div>
      {/* Sort value indicator */}
      {sortMode && sortMode !== "route" && (
        <div className="shrink-0 text-right mt-1 mr-2">
          {sortMode === "seo-score" && seoScore !== null && (
            <span className={`text-sm font-bold font-mono ${seoScore >= 80 ? "text-emerald-500" : seoScore >= 50 ? "text-amber-500" : "text-red-500"}`}>
              {seoScore}
            </span>
          )}
          {sortMode === "response-time" && page.seo.performance && (
            <span className={`text-sm font-mono ${page.seo.performance.responseTimeMs > 3000 ? "text-red-500" : page.seo.performance.responseTimeMs > 1000 ? "text-amber-500" : "text-emerald-500"}`}>
              {page.seo.performance.responseTimeMs}ms
            </span>
          )}
          {sortMode === "word-count" && (
            <span className="text-sm font-mono text-muted-foreground">{wordCount}</span>
          )}
        </div>
      )}
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
  const { t } = useLocale();
  return (
    <button
      onClick={onClick}
      className="group rounded-lg border border-border bg-card overflow-hidden text-start transition-colors hover:border-primary/50"
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
        <div className="text-sm font-medium truncate" dir="auto">{page.title || t("page.untitled")}</div>
        <div className="text-xs text-muted-foreground font-mono truncate">
          {new URL(page.url).pathname}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {page.seo.wordCount} {t("page.words")} &middot; {page.seo.internalLinkCount} {t("page.linksLabel")}
        </div>
        <div className="flex gap-1.5 pt-1">
          {!page.seo.meta.description && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-500 border-amber-500/30">
              {t("common.noMetaDesc")}
            </Badge>
          )}
          {page.seo.imagesWithoutAlt > 0 && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-500 border-amber-500/30">
              {page.seo.imagesWithoutAlt} {t("common.imgNoAlt")}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
