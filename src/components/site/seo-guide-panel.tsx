"use client";

import { useState, useMemo } from "react";
import type { CrawlPageResult } from "@/types/canvas";
import type { SeoGuideItem } from "@/lib/seo-guide";
import { useLocale } from "@/context/locale-context";
import { generateSeoGuide } from "@/lib/seo-guide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronRight,
  Search,
  ExternalLink,
} from "lucide-react";

interface SeoGuidePanelProps {
  pages: CrawlPageResult[];
}

const CATEGORY_OPTIONS = [
  "All",
  "Titles",
  "Meta Descriptions",
  "Headings",
  "Image Alt",
  "Internal Linking",
  "Structured Data",
  "Performance",
  "i18n",
  "Social/OG",
  "URL Structure",
] as const;

function ScoreCircle({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  let color: string;
  if (score >= 80) color = "text-emerald-500";
  else if (score >= 50) color = "text-amber-500";
  else color = "text-rose-500";

  let strokeColor: string;
  if (score >= 80) strokeColor = "stroke-emerald-500";
  else if (score >= 50) strokeColor = "stroke-amber-500";
  else strokeColor = "stroke-rose-500";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="88" height="88" className="-rotate-90">
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          strokeWidth="6"
          className="stroke-muted/30"
        />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${strokeColor} transition-all duration-700`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-xl font-bold ${color}`}>{score}</span>
      </div>
    </div>
  );
}

function SeverityIcon({
  severity,
}: {
  severity: SeoGuideItem["severity"];
}) {
  switch (severity) {
    case "critical":
      return <AlertTriangle className="h-4 w-4 text-rose-500" />;
    case "important":
      return <AlertCircle className="h-4 w-4 text-amber-500" />;
    case "nice-to-have":
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}

function GuideItemCard({ item }: { item: SeoGuideItem }) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [showAllPages, setShowAllPages] = useState(false);

  const visiblePages = showAllPages
    ? item.affectedPages
    : item.affectedPages.slice(0, 5);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 w-full p-3.5 text-start hover:bg-muted/30 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <SeverityIcon severity={item.severity} />
        <span className="text-sm font-medium flex-1 min-w-0 truncate">
          {item.title}
        </span>
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 shrink-0 font-normal"
        >
          {item.category}
        </Badge>
        <Badge
          variant="secondary"
          className="text-[10px] px-1.5 py-0 shrink-0 font-mono"
        >
          {item.affectedPages.length} {item.affectedPages.length === 1 ? t("common.page") : t("common.pages")}
        </Badge>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4 bg-muted/10">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {item.description}
          </p>

          {/* Action Steps */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {t("guide.howToFix")}
            </h4>
            <ul className="space-y-1.5">
              {item.actionSteps.map((step, i) => (
                <li
                  key={i}
                  className="text-sm text-foreground/80 flex items-start gap-2"
                >
                  <span className="text-muted-foreground mt-0.5 shrink-0 text-xs font-mono">
                    {i + 1}.
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </div>

          {/* Affected Pages */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {t("guide.affectedPages")}
            </h4>
            <div className="rounded-md border border-border divide-y divide-border">
              {visiblePages.map((p) => (
                <div
                  key={p.url}
                  className="flex items-center gap-2 px-3 py-2"
                >
                  <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{p.title}</div>
                    <div className="text-[11px] text-muted-foreground font-mono truncate">
                      {shortUrl(p.url)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {item.affectedPages.length > 5 && !showAllPages && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllPages(true)}
                className="mt-2 text-xs h-7"
              >
                {t("guide.showMore", { count: item.affectedPages.length - 5 })}
              </Button>
            )}
            {showAllPages && item.affectedPages.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllPages(false)}
                className="mt-2 text-xs h-7"
              >
                {t("guide.showFewer")}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SeoGuidePanel({ pages }: SeoGuidePanelProps) {
  const { t } = useLocale();
  const guide = useMemo(() => generateSeoGuide(pages), [pages]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  const filteredItems = useMemo(() => {
    let items = guide.items;

    if (selectedCategory !== "All") {
      items = items.filter((i) => i.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q)
      );
    }

    return items;
  }, [guide.items, searchQuery, selectedCategory]);

  const critical = filteredItems.filter((i) => i.severity === "critical");
  const important = filteredItems.filter((i) => i.severity === "important");
  const niceToHave = filteredItems.filter((i) => i.severity === "nice-to-have");

  function toggleSection(key: string) {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (guide.totalIssues === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Sparkles className="mx-auto mb-3 h-8 w-8 text-emerald-500/60" />
        <p className="text-sm font-medium">{t("guide.noIssues")}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {t("guide.allGood")}
        </p>
      </div>
    );
  }

  // Progress bar color
  let progressColor: string;
  if (guide.overallScore >= 80) progressColor = "bg-emerald-500";
  else if (guide.overallScore >= 50) progressColor = "bg-amber-500";
  else progressColor = "bg-rose-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Sparkles className="h-5 w-5 text-amber-500" />
        <h2 className="text-base font-semibold">{t("guide.title")}</h2>
      </div>

      {/* Score + Stats */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-6">
          <ScoreCircle score={guide.overallScore} />
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              {guide.criticalCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span className="text-sm">
                    <span className="font-semibold">{guide.criticalCount}</span>{" "}
                    <span className="text-muted-foreground">{t("guide.critical").toLowerCase()}</span>
                  </span>
                </div>
              )}
              {guide.importantCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span className="text-sm">
                    <span className="font-semibold">{guide.importantCount}</span>{" "}
                    <span className="text-muted-foreground">{t("guide.important").toLowerCase()}</span>
                  </span>
                </div>
              )}
              {guide.niceToHaveCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span className="text-sm">
                    <span className="font-semibold">{guide.niceToHaveCount}</span>{" "}
                    <span className="text-muted-foreground">{t("guide.niceToHave").toLowerCase()}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-muted-foreground">
                  {t("guide.overallHealth")}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {guide.overallScore}/100
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className={`h-full rounded-full ${progressColor} transition-all duration-700`}
                  style={{ width: `${guide.overallScore}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("guide.searchIssues")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-8 h-8 text-sm"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {CATEGORY_OPTIONS.map((cat) => (
            <option key={cat} value={cat}>
              {cat === "All" ? t("guide.allCategories") : cat}
            </option>
          ))}
        </select>
      </div>

      {/* Sections */}
      {critical.length > 0 && (
        <SeveritySection
          label={t("guide.critical")}
          items={critical}
          collapsed={!!collapsedSections["critical"]}
          onToggle={() => toggleSection("critical")}
          headerClassName="bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      )}

      {important.length > 0 && (
        <SeveritySection
          label={t("guide.important")}
          items={important}
          collapsed={!!collapsedSections["important"]}
          onToggle={() => toggleSection("important")}
          headerClassName="bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
          icon={<AlertCircle className="h-4 w-4" />}
        />
      )}

      {niceToHave.length > 0 && (
        <SeveritySection
          label={t("guide.niceToHave")}
          items={niceToHave}
          collapsed={!!collapsedSections["nice-to-have"]}
          onToggle={() => toggleSection("nice-to-have")}
          headerClassName="bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400"
          icon={<Info className="h-4 w-4" />}
        />
      )}

      {filteredItems.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <Search className="mx-auto mb-2 h-5 w-5 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {t("guide.noMatch")}
          </p>
        </div>
      )}
    </div>
  );
}

function SeveritySection({
  label,
  items,
  collapsed,
  onToggle,
  headerClassName,
  icon,
}: {
  label: string;
  items: SeoGuideItem[];
  collapsed: boolean;
  onToggle: () => void;
  headerClassName: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-2 w-full rounded-lg border px-3.5 py-2 font-medium text-sm transition-colors ${headerClassName}`}
      >
        {icon}
        <span>
          {label} ({items.length})
        </span>
        <span className="ms-auto">
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </span>
      </button>
      {!collapsed && (
        <div className="mt-2 space-y-2">
          {items.map((item) => (
            <GuideItemCard key={item.id} item={item} />
          ))}
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
