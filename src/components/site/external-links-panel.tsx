"use client";

import { useState, useMemo } from "react";
import type { CrawlPageResult } from "@/types/canvas";
import { useLocale } from "@/context/locale-context";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ExternalLink, Search, ChevronDown, ChevronRight, Globe } from "lucide-react";

interface ExternalLinksPanelProps {
  pages: CrawlPageResult[];
}

interface ExternalLinkEntry {
  sourceUrl: string;
  sourceTitle: string;
  targetUrl: string;
  anchorText: string;
  domain: string;
}

interface DomainGroup {
  domain: string;
  links: ExternalLinkEntry[];
}

export function ExternalLinksPanel({ pages }: ExternalLinksPanelProps) {
  const { t } = useLocale();
  const [search, setSearch] = useState("");
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());

  const { domainGroups, totalExternalLinks, totalDomains, topDomains } = useMemo(() => {
    let siteOrigin: string;
    try {
      siteOrigin = pages.length > 0 ? new URL(pages[0].url).origin : "";
    } catch {
      siteOrigin = "";
    }

    const allEntries: ExternalLinkEntry[] = [];

    for (const page of pages) {
      for (const link of page.outgoingLinks) {
        let linkOrigin: string;
        let linkDomain: string;
        try {
          const u = new URL(link.url);
          linkOrigin = u.origin;
          linkDomain = u.hostname;
        } catch {
          continue;
        }

        if (linkOrigin !== siteOrigin) {
          allEntries.push({
            sourceUrl: page.url,
            sourceTitle: page.title || t("page.untitled"),
            targetUrl: link.url,
            anchorText: link.anchorText || "(no anchor text)",
            domain: linkDomain,
          });
        }
      }
    }

    // Group by domain
    const domainMap = new Map<string, ExternalLinkEntry[]>();
    for (const entry of allEntries) {
      const existing = domainMap.get(entry.domain);
      if (existing) {
        existing.push(entry);
      } else {
        domainMap.set(entry.domain, [entry]);
      }
    }

    const groups: DomainGroup[] = Array.from(domainMap.entries())
      .map(([domain, links]) => ({ domain, links }))
      .sort((a, b) => b.links.length - a.links.length);

    const top = groups.slice(0, 3).map((g) => g.domain);

    return {
      domainGroups: groups,
      totalExternalLinks: allEntries.length,
      totalDomains: groups.length,
      topDomains: top,
    };
  }, [pages, t]);

  const filteredGroups = useMemo(() => {
    if (!search) return domainGroups;
    const q = search.toLowerCase();
    return domainGroups
      .map((group) => ({
        ...group,
        links: group.links.filter(
          (l) =>
            l.domain.toLowerCase().includes(q) ||
            l.targetUrl.toLowerCase().includes(q) ||
            l.anchorText.toLowerCase().includes(q) ||
            l.sourceUrl.toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.links.length > 0);
  }, [domainGroups, search]);

  const toggleDomain = (domain: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  };

  if (totalExternalLinks === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <ExternalLink className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No external links found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-lg font-semibold">{totalExternalLinks}</div>
          <div className="text-[11px] text-muted-foreground">{t("external.totalLinks")}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-lg font-semibold">{totalDomains}</div>
          <div className="text-[11px] text-muted-foreground">{t("external.domains")}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-xs font-mono truncate text-muted-foreground pt-1">
            {topDomains[0] || "—"}
          </div>
          <div className="text-[11px] text-muted-foreground">{t("external.topDomain")}</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder={t("external.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-8 h-8 text-xs"
        />
      </div>

      {/* Domain Groups */}
      <div className="space-y-2">
        {filteredGroups.map((group) => {
          const isExpanded = expandedDomains.has(group.domain);
          return (
            <div key={group.domain} className="rounded-lg border border-border bg-card">
              <button
                type="button"
                onClick={() => toggleDomain(group.domain)}
                className="w-full flex items-center gap-2 p-3 text-start hover:bg-muted/50 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="text-sm font-mono truncate flex-1">{group.domain}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono shrink-0">
                  {group.links.length}
                </Badge>
              </button>
              {isExpanded && (
                <div className="border-t border-border divide-y divide-border">
                  {group.links.map((link, i) => (
                    <div key={`${link.targetUrl}-${i}`} className="p-2.5 space-y-1">
                      <div className="text-xs truncate">{link.anchorText}</div>
                      <div className="text-[11px] text-muted-foreground font-mono truncate">
                        {link.targetUrl}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        from {shortUrl(link.sourceUrl)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredGroups.length === 0 && search && (
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
