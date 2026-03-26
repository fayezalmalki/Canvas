"use client";

import { useRouter } from "next/navigation";
import type { CrawlPageResult } from "@/types/canvas";
import { useSiteContext } from "@/context/site-context";
import { siteUrl } from "@/lib/navigation";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ChevronRight, Home } from "lucide-react";

export function PageHeader({ page }: { page: CrawlPageResult }) {
  const router = useRouter();
  const { crawlId } = useSiteContext();
  const pathname = new URL(page.url).pathname;

  // Build breadcrumb segments from pathname
  const segments = pathname.split("/").filter(Boolean);

  return (
    <div className="space-y-2">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-muted-foreground" dir="ltr">
        <button
          onClick={() => router.push(`/site/${crawlId}`)}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <Home className="h-3 w-3" />
          <span>Overview</span>
        </button>
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1;
          const partialPath = "/" + segments.slice(0, i + 1).join("/");
          return (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
              {isLast ? (
                <span className="text-foreground font-medium">{seg}</span>
              ) : (
                <button
                  onClick={() => router.push(siteUrl(crawlId, partialPath))}
                  className="hover:text-foreground transition-colors"
                >
                  {seg}
                </button>
              )}
            </span>
          );
        })}
        {segments.length === 0 && (
          <>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">/</span>
          </>
        )}
      </nav>

      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold" dir="auto">{page.title || "Untitled"}</h2>
        <a
          href={page.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground font-mono">
          {pathname}
        </span>
        <Badge variant="outline" className="text-[10px]">
          {page.seo.statusCode}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {page.seo.wordCount} words
        </span>
      </div>
    </div>
  );
}
