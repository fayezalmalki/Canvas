"use client";

import { useState, useMemo } from "react";
import type { CrawlPageResult } from "@/types/canvas";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link, Search, AlertTriangle } from "lucide-react";

interface InternalLinksPanelProps {
  pages: CrawlPageResult[];
}

interface InternalLinkEntry {
  sourceUrl: string;
  sourceTitle: string;
  targetUrl: string;
  anchorText: string;
  context: string;
}

export function InternalLinksPanel({ pages }: InternalLinksPanelProps) {
  const [search, setSearch] = useState("");

  const { entries, uniqueTargets, avgLinksPerPage, orphanPages, siteOrigin } = useMemo(() => {
    if (pages.length === 0) {
      return { entries: [], uniqueTargets: 0, avgLinksPerPage: 0, orphanPages: [], siteOrigin: "" };
    }

    let origin: string;
    try {
      origin = new URL(pages[0].url).origin;
    } catch {
      origin = "";
    }

    const allEntries: InternalLinkEntry[] = [];
    const targetSet = new Set<string>();
    const allPageUrls = new Set(pages.map((p) => p.url));

    for (const page of pages) {
      const internalLinks = page.outgoingLinks.filter((link) => {
        try {
          return new URL(link.url).origin === origin;
        } catch {
          return false;
        }
      });

      for (const link of internalLinks) {
        targetSet.add(link.url);
        allEntries.push({
          sourceUrl: page.url,
          sourceTitle: page.title || "Untitled",
          targetUrl: link.url,
          anchorText: link.anchorText || "(no anchor text)",
          context: link.context,
        });
      }
    }

    // Orphan pages: pages that no internal link points to
    const linkedTargets = new Set(allEntries.map((e) => e.targetUrl));
    const orphans = pages.filter((p) => !linkedTargets.has(p.url));

    const totalInternalLinks = allEntries.length;
    const avg = pages.length > 0 ? Math.round(totalInternalLinks / pages.length) : 0;

    return {
      entries: allEntries,
      uniqueTargets: targetSet.size,
      avgLinksPerPage: avg,
      orphanPages: orphans,
      siteOrigin: origin,
    };
  }, [pages]);

  const filtered = useMemo(() => {
    if (!search) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      (e) =>
        e.sourceUrl.toLowerCase().includes(q) ||
        e.targetUrl.toLowerCase().includes(q) ||
        e.anchorText.toLowerCase().includes(q)
    );
  }, [entries, search]);

  // Group filtered entries by source page
  const grouped = useMemo(() => {
    const map = new Map<string, InternalLinkEntry[]>();
    for (const entry of filtered) {
      const existing = map.get(entry.sourceUrl);
      if (existing) {
        existing.push(entry);
      } else {
        map.set(entry.sourceUrl, [entry]);
      }
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <Link className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No internal links found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-lg font-semibold">{uniqueTargets}</div>
          <div className="text-[11px] text-muted-foreground">Unique Targets</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-lg font-semibold">{avgLinksPerPage}</div>
          <div className="text-[11px] text-muted-foreground">Avg Links/Page</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-lg font-semibold text-amber-500">{orphanPages.length}</div>
          <div className="text-[11px] text-muted-foreground">Orphan Pages</div>
        </div>
      </div>

      {/* Orphan Pages Warning */}
      {orphanPages.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-medium">Orphan Pages</h3>
            <span className="text-[11px] text-muted-foreground">No internal links point to these</span>
          </div>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {orphanPages.slice(0, 10).map((p) => (
              <div key={p.url} className="p-2.5">
                <div className="text-sm truncate">{p.title || "Untitled"}</div>
                <div className="text-[11px] text-muted-foreground font-mono truncate">
                  {shortUrl(p.url)}
                </div>
              </div>
            ))}
            {orphanPages.length > 10 && (
              <div className="p-2.5 text-[11px] text-muted-foreground text-center">
                +{orphanPages.length - 10} more orphan pages
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Filter by URL or anchor text..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>

      {/* Links grouped by source */}
      <div className="space-y-3">
        {grouped.map(([sourceUrl, links]) => (
          <div key={sourceUrl}>
            <div className="flex items-center gap-2 mb-1.5">
              <Link className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground truncate">
                {shortUrl(sourceUrl)}
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                {links.length}
              </Badge>
            </div>
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {links.map((link, i) => (
                <div key={`${link.targetUrl}-${i}`} className="p-2.5 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 shrink-0 text-muted-foreground border-border"
                  >
                    {link.context}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs truncate">{link.anchorText}</div>
                    <div className="text-[11px] text-muted-foreground font-mono truncate">
                      {shortUrl(link.targetUrl)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && search && (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">No links match "{search}"</p>
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
