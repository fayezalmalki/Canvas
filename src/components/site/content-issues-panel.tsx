"use client";

import { useMemo } from "react";
import type { CrawlPageResult } from "@/types/canvas";
import { analyzeContent } from "@/lib/content-analysis";
import { Badge } from "@/components/ui/badge";
import { FileText, Copy, FileWarning, Layers } from "lucide-react";

interface ContentIssuesPanelProps {
  pages: CrawlPageResult[];
}

export function ContentIssuesPanel({ pages }: ContentIssuesPanelProps) {
  const analysis = useMemo(() => analyzeContent(pages), [pages]);

  const totalIssues =
    analysis.thinPages.length +
    analysis.duplicateTitles.length +
    analysis.duplicateDescriptions.length +
    analysis.similarContent.length;

  if (totalIssues === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <FileText className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No content issues detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Thin Pages */}
      {analysis.thinPages.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileWarning className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-medium">
              Thin Pages ({analysis.thinPages.length})
            </h3>
            <span className="text-[11px] text-muted-foreground">Under 100 words</span>
          </div>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {analysis.thinPages.map((p) => (
              <div key={p.url} className="flex items-center gap-3 p-3">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-amber-500 border-amber-500/30 shrink-0">
                  {p.wordCount}w
                </Badge>
                <div className="min-w-0">
                  <div className="text-sm truncate">{p.title || "Untitled"}</div>
                  <div className="text-[11px] text-muted-foreground font-mono truncate">
                    {shortUrl(p.url)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duplicate Titles */}
      {analysis.duplicateTitles.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Copy className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-medium">
              Duplicate Titles ({analysis.duplicateTitles.length} groups)
            </h3>
          </div>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {analysis.duplicateTitles.map((group) => (
              <div key={group.value} className="p-3 space-y-1.5">
                <div className="text-sm font-medium truncate">"{group.value}"</div>
                <div className="space-y-0.5">
                  {group.pages.map((p) => (
                    <div key={p.url} className="text-[11px] text-muted-foreground font-mono truncate">
                      {shortUrl(p.url)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duplicate Descriptions */}
      {analysis.duplicateDescriptions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Copy className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-medium">
              Duplicate Descriptions ({analysis.duplicateDescriptions.length} groups)
            </h3>
          </div>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {analysis.duplicateDescriptions.map((group) => (
              <div key={group.value} className="p-3 space-y-1.5">
                <div className="text-xs text-muted-foreground truncate max-w-[400px]">
                  "{group.value.slice(0, 80)}..."
                </div>
                <div className="space-y-0.5">
                  {group.pages.map((p) => (
                    <div key={p.url} className="text-[11px] text-muted-foreground font-mono truncate">
                      {shortUrl(p.url)} — {p.title}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Similar Content */}
      {analysis.similarContent.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-medium">
              Similar Content ({analysis.similarContent.length} pairs)
            </h3>
          </div>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {analysis.similarContent.map((pair, i) => (
              <div key={i} className="p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-amber-500 border-amber-500/30">
                    {pair.similarity}% similar
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground font-mono truncate">
                  {shortUrl(pair.urlA)} — {pair.titleA}
                </div>
                <div className="text-[11px] text-muted-foreground font-mono truncate">
                  {shortUrl(pair.urlB)} — {pair.titleB}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function shortUrl(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
