"use client";

import type { CrawlPageResult } from "@/types/canvas";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

export function PageHeader({ page }: { page: CrawlPageResult }) {
  const pathname = new URL(page.url).pathname;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{page.title || "Untitled"}</h2>
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
