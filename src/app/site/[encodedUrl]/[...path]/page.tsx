"use client";

import { use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSiteContext } from "@/context/site-context";
import { PageHeader } from "@/components/page-detail/page-header";
import { ScreenshotPreview } from "@/components/page-detail/screenshot-preview";
import { SeoOverview } from "@/components/page-detail/seo-overview";
import { LinkList } from "@/components/page-detail/link-list";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles } from "lucide-react";
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

  const page = useMemo(() => {
    if (!crawlResult) return null;
    const normalize = (u: string) => u.replace(/\/+$/, "");
    return crawlResult.pages.find((p) => normalize(p.url) === normalize(pageUrl)) ?? null;
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

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <PageHeader page={page} rootUrl={rootUrl} />
      {showImages && (
        <ScreenshotPreview screenshot={page.screenshot} title={page.title} />
      )}

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
          <SeoOverview seo={page.seo} />
        </TabsContent>

        <TabsContent value="links" className="mt-4">
          <LinkList links={page.outgoingLinks} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
