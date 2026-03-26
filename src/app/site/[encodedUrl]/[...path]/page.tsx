"use client";

import { use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSiteContext } from "@/context/site-context";
import { PageHeader } from "@/components/page-detail/page-header";
import { ScreenshotPreview } from "@/components/page-detail/screenshot-preview";
import { SeoOverview } from "@/components/page-detail/seo-overview";
import { LinkList } from "@/components/page-detail/link-list";
import { SerpPreview } from "@/components/page-detail/serp-preview";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { scoreSeo } from "@/lib/seo-scorer";

export default function PageDetail({
  params,
}: {
  params: Promise<{ encodedUrl: string; path: string[] }>;
}) {
  const { encodedUrl, path } = use(params);
  const rootUrl = decodeURIComponent(encodedUrl);
  const { crawlResult, showImages } = useSiteContext();
  const router = useRouter();

  const pageUrl = useMemo(() => {
    const pathStr = path.join("/");
    if (pathStr === "_root") {
      return rootUrl;
    }
    try {
      const base = new URL(rootUrl);
      base.pathname = "/" + pathStr;
      return base.toString();
    } catch {
      return rootUrl;
    }
  }, [rootUrl, path]);

  const { page, prevPage, nextPage } = useMemo(() => {
    if (!crawlResult) return { page: null, prevPage: null, nextPage: null };
    const normalize = (u: string) => u.replace(/\/+$/, "");
    const pages = crawlResult.pages;
    const idx = pages.findIndex((p) => normalize(p.url) === normalize(pageUrl));
    return {
      page: idx >= 0 ? pages[idx] : null,
      prevPage: idx > 0 ? pages[idx - 1] : null,
      nextPage: idx >= 0 && idx < pages.length - 1 ? pages[idx + 1] : null,
    };
  }, [crawlResult, pageUrl]);

  if (!page) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Page not found in crawl data</p>
      </div>
    );
  }

  const pathStr = path.join("/");
  const seoScore = scoreSeo({ url: page.url, title: page.title, seo: page.seo });
  const scoreColor =
    seoScore.score >= 80
      ? "text-emerald-500"
      : seoScore.score >= 50
        ? "text-amber-500"
        : "text-red-500";

  function navigateToPage(pageUrl: string) {
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
    <div className="p-6 space-y-6 max-w-5xl">
      <PageHeader page={page} rootUrl={rootUrl} />
      {showImages && (
        <ScreenshotPreview screenshot={page.screenshot} title={page.title} />
      )}

      {/* Bot protection warning */}
      {page.botProtection && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <Shield className="h-5 w-5 text-amber-500 shrink-0" />
          <div>
            <div className="text-sm font-medium text-amber-500">{page.botProtection}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              This page is protected by bot detection. The crawler received a challenge page instead of the actual content. SEO data may be inaccurate.
            </div>
          </div>
        </div>
      )}

      {/* SERP Preview */}
      <SerpPreview url={page.url} title={page.title} meta={page.seo.meta} />

      {/* Quick SEO score + analysis link */}
      <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
        <div className={`text-3xl font-bold font-mono ${scoreColor}`}>
          {seoScore.score}
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">SEO Score</div>
          <div className="text-xs text-muted-foreground">{seoScore.summary}</div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/site/${encodedUrl}/analysis/${pathStr}`)}
        >
          <Sparkles className="h-4 w-4" />
          View Full Analysis
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">SEO Overview</TabsTrigger>
          <TabsTrigger value="links">
            Links ({page.outgoingLinks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <SeoOverview seo={page.seo} products={page.products} />
        </TabsContent>

        <TabsContent value="links" className="mt-4">
          <LinkList links={page.outgoingLinks} />
        </TabsContent>
      </Tabs>

      {/* Prev/Next navigation */}
      {(prevPage || nextPage) && (
        <div className="flex items-stretch gap-3 pt-2 border-t border-border">
          {prevPage ? (
            <button
              onClick={() => navigateToPage(prevPage.url)}
              className="flex-1 flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/50 min-w-0"
            >
              <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="text-[11px] text-muted-foreground">Previous</div>
                <div className="text-sm truncate">{prevPage.title || "Untitled"}</div>
                <div className="text-[11px] text-muted-foreground font-mono truncate">
                  {(() => { try { return new URL(prevPage.url).pathname; } catch { return prevPage.url; } })()}
                </div>
              </div>
            </button>
          ) : (
            <div className="flex-1" />
          )}
          {nextPage ? (
            <button
              onClick={() => navigateToPage(nextPage.url)}
              className="flex-1 flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-right transition-colors hover:border-primary/50 min-w-0 justify-end"
            >
              <div className="min-w-0">
                <div className="text-[11px] text-muted-foreground">Next</div>
                <div className="text-sm truncate">{nextPage.title || "Untitled"}</div>
                <div className="text-[11px] text-muted-foreground font-mono truncate">
                  {(() => { try { return new URL(nextPage.url).pathname; } catch { return nextPage.url; } })()}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      )}
    </div>
  );
}
