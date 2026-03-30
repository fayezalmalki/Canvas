"use client";

import { useState, useMemo } from "react";
import type { CrawlPageResult } from "@/types/canvas";
import { useLocale } from "@/context/locale-context";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Image, Search, AlertTriangle, CheckCircle } from "lucide-react";

interface ImagesPanelProps {
  pages: CrawlPageResult[];
}

type SortMode = "most-images" | "most-missing-alt";

interface PageImageStats {
  url: string;
  title: string;
  imageCount: number;
  missingAlt: number;
  altCoverage: number; // 0-100
}

export function ImagesPanel({ pages }: ImagesPanelProps) {
  const { t } = useLocale();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortMode>("most-images");

  const { pageStats, totalImages, totalMissingAlt, overallCoverage } = useMemo(() => {
    const stats: PageImageStats[] = pages
      .map((page) => {
        const imageCount = page.seo.imageCount;
        const missingAlt = page.seo.imagesWithoutAlt;
        const altCoverage =
          imageCount > 0 ? Math.round(((imageCount - missingAlt) / imageCount) * 100) : 100;
        return {
          url: page.url,
          title: page.title || t("page.untitled"),
          imageCount,
          missingAlt,
          altCoverage,
        };
      })
      .filter((s) => s.imageCount > 0);

    const totImg = stats.reduce((sum, s) => sum + s.imageCount, 0);
    const totMissing = stats.reduce((sum, s) => sum + s.missingAlt, 0);
    const coverage = totImg > 0 ? Math.round(((totImg - totMissing) / totImg) * 100) : 100;

    return {
      pageStats: stats,
      totalImages: totImg,
      totalMissingAlt: totMissing,
      overallCoverage: coverage,
    };
  }, [pages, t]);

  const filtered = useMemo(() => {
    let result = pageStats;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) => s.url.toLowerCase().includes(q) || s.title.toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      if (sortBy === "most-images") return b.imageCount - a.imageCount;
      return b.missingAlt - a.missingAlt;
    });
  }, [pageStats, search, sortBy]);

  if (totalImages === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <Image className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No images found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-lg font-semibold">{totalImages}</div>
          <div className="text-[11px] text-muted-foreground">{t("images.totalImages")}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className={`text-lg font-semibold ${totalMissingAlt > 0 ? "text-amber-500" : "text-emerald-500"}`}>
            {totalMissingAlt}
          </div>
          <div className="text-[11px] text-muted-foreground">{t("images.missingAlt")}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className={`text-lg font-semibold ${overallCoverage >= 90 ? "text-emerald-500" : overallCoverage >= 70 ? "text-amber-500" : "text-red-500"}`}>
            {overallCoverage}%
          </div>
          <div className="text-[11px] text-muted-foreground">{t("images.coverage")}</div>
        </div>
      </div>

      {/* Search & Sort */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("images.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-8 h-8 text-xs"
          />
        </div>
        <button
          type="button"
          onClick={() => setSortBy(sortBy === "most-images" ? "most-missing-alt" : "most-images")}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap px-2 py-1 rounded border border-border"
        >
          {sortBy === "most-images" ? t("images.sortByImages") : t("images.sortByMissing")}
        </button>
      </div>

      {/* Per-Page Breakdown */}
      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {filtered.map((stat) => (
          <div key={stat.url} className="p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">{stat.title}</div>
                <div className="text-[11px] text-muted-foreground font-mono truncate">
                  {shortUrl(stat.url)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                {stat.imageCount} image{stat.imageCount !== 1 ? "s" : ""}
              </Badge>
              {stat.missingAlt > 0 ? (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 font-mono text-amber-500 border-amber-500/30"
                >
                  <AlertTriangle className="h-2.5 w-2.5 me-1" />
                  {stat.missingAlt} missing alt
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 font-mono text-emerald-500 border-emerald-500/30"
                >
                  <CheckCircle className="h-2.5 w-2.5 me-1" />
                  All alt text present
                </Badge>
              )}
              <span className={`text-[10px] font-mono ${
                stat.altCoverage >= 90
                  ? "text-emerald-500"
                  : stat.altCoverage >= 70
                    ? "text-amber-500"
                    : "text-red-500"
              }`}>
                {stat.altCoverage}% coverage
              </span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && search && (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">No pages match "{search}"</p>
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
