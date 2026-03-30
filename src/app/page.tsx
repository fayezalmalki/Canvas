"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useLocale } from "@/context/locale-context";
import {
  Globe,
  Loader2,
  Search,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  ExternalLink,
  Languages,
} from "lucide-react";

interface CrawledPage {
  url: string;
  title: string;
}

export default function Home() {
  const router = useRouter();
  const { locale, setLocale, t } = useLocale();
  const storeCrawl = useMutation(api.crawls.storeCrawlResult);
  const [url, setUrl] = useState("");
  const [maxDepth, setMaxDepth] = useState(2);
  const [maxPages, setMaxPages] = useState(20);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [screenshots, setScreenshots] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [crawledPages, setCrawledPages] = useState<CrawledPage[]>([]);
  const [crawlCount, setCrawlCount] = useState({ current: 0, total: 20, discovered: 0 });
  const [error, setError] = useState("");
  const [recentExpanded, setRecentExpanded] = useState(false);
  const recentCrawls = useQuery(api.crawls.listRecentCrawls);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCrawledPages([]);
    setCrawlCount({ current: 0, total: maxPages, discovered: 0 });

    let normalizedUrl = url.trim();
    if (!normalizedUrl) return;
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      setError(t("home.invalidUrl"));
      return;
    }

    setCrawling(true);

    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl, maxDepth, maxPages, screenshots }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Crawl failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          try {
            const event = JSON.parse(data);

            if (event.type === "page_crawled") {
              setCrawledPages((prev) => [
                ...prev,
                { url: event.url, title: event.title },
              ]);
              setCrawlCount({ current: event.index, total: event.total, discovered: event.discovered ?? 0 });
            } else if (event.type === "complete" && event.result) {
              const slug = await storeCrawl({
                rootUrl: normalizedUrl,
                pages: event.result.pages.map((p: any) => ({
                  ...p,
                  products: p.products ?? undefined,
                })),
                discoveredUrls: event.result.discoveredUrls ?? [],
                brokenLinks: event.result.brokenLinks ?? [],
                redirectChains: event.result.redirectChains ?? [],
              });
              router.push(`/site/${slug}`);
              return;
            } else if (event.type === "error") {
              throw new Error(event.message);
            }
          } catch (parseErr: any) {
            if (parseErr.message && parseErr.message !== "Unexpected end of JSON input") {
              throw parseErr;
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setCrawling(false);
    }
  }

  const progressPercent =
    crawlCount.total > 0
      ? Math.round((crawlCount.current / crawlCount.total) * 100)
      : 0;

  return (
    <div className="flex min-h-full items-center justify-center p-4 relative">
      <div className="absolute top-4 end-4 flex items-center gap-1.5">
        <button
          onClick={() => setLocale(locale === "en" ? "ar" : "en")}
          className="inline-flex items-center justify-center rounded-md h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title={locale === "en" ? "العربية" : "English"}
        >
          <Languages className="h-4 w-4" />
        </button>
        <ThemeToggle />
      </div>
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-gradient-brand">
            {t("home.brand")}
          </h1>
          <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
            {t("home.brandSub")}
          </p>
          <p className="text-muted-foreground text-sm">
            {t("home.description")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("home.placeholder")}
              className="h-12 ps-10 text-base font-mono"
              disabled={crawling}
              autoFocus
            />
          </div>

          {/* Advanced toggle */}
          {!crawling && (
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAdvanced ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              {t("home.advanced")}
            </button>
          )}

          {showAdvanced && !crawling && (
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {t("home.maxDepth")}
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(Number(e.target.value))}
                    className="h-8 text-sm font-mono"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {t("home.maxPages")}
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={maxPages}
                    onChange={(e) => setMaxPages(Number(e.target.value))}
                    className="h-8 text-sm font-mono"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={screenshots}
                  onChange={(e) => setScreenshots(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border accent-primary"
                />
                <span className="text-xs text-muted-foreground">
                  {t("home.screenshots")}
                </span>
              </label>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full h-11"
            disabled={crawling || !url.trim()}
          >
            {crawling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("home.crawling")}
              </>
            ) : (
              t("home.analyze")
            )}
          </Button>
        </form>

        {/* Live crawl progress */}
        {crawling && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("home.crawled", { current: crawlCount.current, total: crawlCount.total })}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {progressPercent}%
              </span>
            </div>
            <Progress value={progressPercent} />

            {crawlCount.discovered > crawlCount.current && (
              <p className="text-xs text-muted-foreground">
                {t("home.discovered", { total: crawlCount.discovered, remaining: crawlCount.discovered - crawlCount.current })}
              </p>
            )}

            {crawledPages.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-card p-2 space-y-1">
                {crawledPages.map((page, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs py-0.5"
                  >
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                    <span className="truncate">
                      {page.title || page.url}
                    </span>
                    <span className="ms-auto text-muted-foreground/50 font-mono text-[10px] truncate max-w-[120px]">
                      {new URL(page.url).pathname}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
              {t("home.patience")}
            </p>
          </div>
        )}

        {/* Recent Sites */}
        {!crawling && recentCrawls && recentCrawls.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => setRecentExpanded(!recentExpanded)}
              className="flex w-full items-center gap-2 text-left"
            >
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">{t("home.recentSites")}</h2>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">
                {recentCrawls.length}
              </Badge>
              <div className="ms-auto">
                {recentExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>
            {recentExpanded && <div className="space-y-2">
              {recentCrawls.map((crawl) => {
                let domain = "";
                try {
                  domain = new URL(crawl.rootUrl).hostname;
                } catch {
                  domain = crawl.rootUrl;
                }
                const totalDiscovered = crawl.pagesCount + crawl.discoveredCount;
                const hasRemaining = crawl.discoveredCount > 0;

                return (
                  <button
                    key={crawl._id}
                    onClick={() =>
                      router.push(`/site/${crawl.slug ?? crawl._id}`)
                    }
                    className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/50"
                  >
                    <Globe className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium font-mono truncate">
                        {domain}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {crawl.pagesCount} {t("home.crawledCount")}
                          {hasRemaining && (
                            <span className="text-amber-500">
                              / {totalDiscovered} {t("home.foundCount")}
                            </span>
                          )}
                        </span>
                        <span>
                          {formatTimeAgo(crawl.createdAt)}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  </button>
                );
              })}
            </div>}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
