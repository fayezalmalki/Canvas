"use client";

import { use, useMemo } from "react";
import { useSiteContext } from "@/context/site-context";
import { PageHeader } from "@/components/page-detail/page-header";
import { ScreenshotPreview } from "@/components/page-detail/screenshot-preview";
import { SeoOverview } from "@/components/page-detail/seo-overview";
import { LinkList } from "@/components/page-detail/link-list";
import { AnalysisPanel } from "@/components/page-detail/analysis-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PageDetail({
  params,
}: {
  params: Promise<{ encodedUrl: string; path: string[] }>;
}) {
  const { encodedUrl, path } = use(params);
  const rootUrl = decodeURIComponent(encodedUrl);
  const { crawlResult } = useSiteContext();

  // Reconstruct the page URL from route params
  const pageUrl = useMemo(() => {
    const pathStr = path.join("/");
    // Special case: _root means the root page
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
    return crawlResult.pages.find((p) => p.url === pageUrl) ?? null;
  }, [crawlResult, pageUrl]);

  if (!page) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Page not found in crawl data</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <PageHeader page={page} />
      <ScreenshotPreview screenshot={page.screenshot} title={page.title} />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">SEO Overview</TabsTrigger>
          <TabsTrigger value="links">
            Links ({page.outgoingLinks.length})
          </TabsTrigger>
          <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <SeoOverview seo={page.seo} />
        </TabsContent>

        <TabsContent value="links" className="mt-4">
          <LinkList links={page.outgoingLinks} />
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
          <AnalysisPanel page={page} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
