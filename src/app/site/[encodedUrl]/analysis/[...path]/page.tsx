"use client";

import { use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSiteContext } from "@/context/site-context";
import { PageHeader } from "@/components/page-detail/page-header";
import { AnalysisPanel } from "@/components/page-detail/analysis-panel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AnalysisPage({
  params,
}: {
  params: Promise<{ encodedUrl: string; path: string[] }>;
}) {
  const { encodedUrl, path } = use(params);
  const rootUrl = decodeURIComponent(encodedUrl);
  const { crawlResult } = useSiteContext();
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
    return crawlResult.pages.find((p) => p.url === pageUrl) ?? null;
  }, [crawlResult, pageUrl]);

  if (!page) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Page not found in crawl data</p>
      </div>
    );
  }

  const pathStr = path.join("/");
  const backPath = pathStr === "_root"
    ? `/site/${encodedUrl}/_root`
    : `/site/${encodedUrl}/${pathStr}`;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => router.push(backPath)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium">AI Analysis</div>
      </div>

      <PageHeader page={page} rootUrl={rootUrl} />
      <AnalysisPanel page={page} />
    </div>
  );
}
