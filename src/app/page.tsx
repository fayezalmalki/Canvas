"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAudience } from "@/context/audience-context";
import { useLocale } from "@/context/locale-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ThemeToggle } from "@/components/theme-toggle";
import { createCrawlStoragePlan } from "@/lib/crawl-storage";
import { runGuardedConvexSave } from "@/lib/convex-save-error";
import type { CrawlPageResult, CrawlResult } from "@/types/canvas";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Globe,
  Languages,
  Loader2,
  TriangleAlert,
} from "lucide-react";

interface CrawledPage {
  url: string;
  title: string;
}

interface CrawlStreamEvent {
  type: "page_crawled" | "complete" | "error";
  url?: string;
  title?: string;
  index?: number;
  total?: number;
  discovered?: number;
  result?: CrawlResult;
  message?: string;
}

function getHomeCopy(locale: "en" | "ar") {
  if (locale === "ar") {
    return {
      brand: "بصيـــرة",
      subbrand: "Baseera",
      title: "اجعل موقعك أو متجرك أوضح لجوجل وأدوات الذكاء",
      placeholder: "example.com",
      analyze: "ابدأ الفحص",
      crawling: "جارٍ الفحص...",
      advanced: "خيارات الفحص المتقدمة",
      maxDepth: "أقصى عمق",
      maxPages: "أقصى عدد صفحات",
      screenshots: "التقاط صور للصفحات (أبطأ لكن يعطي معاينات بصرية)",
      invalidUrl: "يرجى إدخال رابط صحيح",
      progress: "تم فحص {current} من {total} صفحة",
      discovered: "تم اكتشاف {total} رابط ({remaining} متبقية)",
      patience: "قد يستغرق الفحص بضع دقائق حسب حجم الموقع",
      recentSites: "آخر المواقع",
      roleOwner: "أنا أدير موقعي",
      roleConsultant: "أنا أراجع مواقع لعملاء",
      recentOpen: "فتح التقرير",
      justNow: "الآن",
    };
  }

  return {
    brand: "بصيـــرة",
    subbrand: "Baseera",
    title: "Make your site easier for Google, AI tools, and shoppers to understand",
    placeholder: "example.com",
    analyze: "Start audit",
    crawling: "Analyzing...",
    advanced: "Advanced crawl options",
    maxDepth: "Max Depth",
    maxPages: "Max Pages",
    screenshots: "Capture page screenshots (slower, but adds visual previews)",
    invalidUrl: "Please enter a valid URL",
    progress: "Checked {current} of {total} pages",
    discovered: "Discovered {total} URLs ({remaining} remaining)",
    patience: "This may take a few minutes depending on site size",
    recentSites: "Recent audits",
    roleOwner: "I run my own site",
    roleConsultant: "I audit sites for clients",
    recentOpen: "Open report",
    justNow: "just now",
  };
}

export default function Home() {
  const router = useRouter();
  const { locale, setLocale } = useLocale();
  const { audience, setAudience } = useAudience();
  const copy = getHomeCopy(locale);
  const createCrawl = useMutation(api.crawls.createCrawl);
  const addPagesToCrawl = useMutation(api.crawls.addPagesToCrawl);
  const recentCrawls = useQuery(api.crawls.listRecentCrawls);
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

  const progressPercent = crawlCount.total > 0
    ? Math.round((crawlCount.current / crawlCount.total) * 100)
    : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCrawledPages([]);
    setCrawlCount({ current: 0, total: maxPages, discovered: 0 });

    let normalizedUrl = url.trim();
    if (!normalizedUrl) return;
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      setError(copy.invalidUrl);
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
            const event = JSON.parse(data) as CrawlStreamEvent;

            if (event.type === "page_crawled" && event.url) {
              const pageUrl = event.url;
              const pageTitle = event.title ?? pageUrl;
              setCrawledPages((prev) => [...prev, { url: pageUrl, title: pageTitle }]);
              setCrawlCount({
                current: event.index ?? 0,
                total: event.total ?? maxPages,
                discovered: event.discovered ?? 0,
              });
            } else if (event.type === "complete" && event.result) {
              const plan = createCrawlStoragePlan({
                ...event.result,
                rootUrl: normalizedUrl,
                pages: event.result.pages.map((page: CrawlPageResult) => ({
                  ...page,
                  products: page.products ?? undefined,
                })),
              });
              const { crawlId, slug } = await runGuardedConvexSave(
                () => createCrawl(plan.metadata),
                locale
              );

              for (const chunk of plan.pageChunks) {
                if (chunk.length === 0) continue;
                await runGuardedConvexSave(
                  () => addPagesToCrawl({ crawlId, pages: chunk }),
                  locale
                );
              }

              router.push(`/site/${slug}`);
              return;
            } else if (event.type === "error") {
              throw new Error(event.message);
            }
          } catch (parseErr: unknown) {
            if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") {
              throw parseErr;
            }
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setCrawling(false);
    }
  }

  return (
    <div className="min-h-full bg-background px-4 py-6">
      <div className="mx-auto w-full max-w-xl">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setLocale(locale === "en" ? "ar" : "en")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
            title={locale === "en" ? "العربية" : "English"}
          >
            <Languages className="h-4 w-4" />
          </button>
          <ThemeToggle />
        </div>

        <div className="mt-10 space-y-8">
          <div className="space-y-3 text-center">
            <h1 className="font-heading text-5xl font-bold tracking-tight text-gradient-brand md:text-6xl">
              {copy.brand}
            </h1>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
              {copy.subbrand}
            </p>
            <p className="mx-auto max-w-md text-base leading-7 text-muted-foreground">
              {copy.title}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-3xl border border-border/70 bg-card p-6 shadow-sm md:p-7"
          >
            <div className="mx-auto flex w-fit items-center gap-1 rounded-full border border-border bg-muted/40 p-1">
              {([
                { key: "owner", label: copy.roleOwner },
                { key: "consultant", label: copy.roleConsultant },
              ] as const).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setAudience(option.key)}
                  className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                    audience === option.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Globe className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={copy.placeholder}
                className="h-12 rounded-2xl border-border/70 bg-background ps-10 text-base font-mono"
                disabled={crawling}
                autoFocus
              />
            </div>

            {!crawling ? (
              <button
                type="button"
                onClick={() => setShowAdvanced((prev) => !prev)}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {copy.advanced}
              </button>
            ) : null}

            {showAdvanced && !crawling ? (
              <div className="rounded-2xl bg-muted/45 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">{copy.maxDepth}</label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={maxDepth}
                      onChange={(e) => setMaxDepth(Number(e.target.value))}
                      className="h-9 rounded-xl bg-background font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">{copy.maxPages}</label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={maxPages}
                      onChange={(e) => setMaxPages(Number(e.target.value))}
                      className="h-9 rounded-xl bg-background font-mono"
                    />
                  </div>
                </div>
                <label className="mt-4 flex items-start gap-3 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={screenshots}
                    onChange={(e) => setScreenshots(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-border accent-primary"
                  />
                  <span>{copy.screenshots}</span>
                </label>
              </div>
            ) : null}

            {error ? (
              <div className="flex items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <TriangleAlert className="h-4 w-4 shrink-0" />
                {error}
              </div>
            ) : null}

            <Button type="submit" size="lg" className="h-12 w-full rounded-2xl" disabled={crawling || !url.trim()}>
              {crawling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {copy.crawling}
                </>
              ) : (
                <>
                  {copy.analyze}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            {crawling ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {copy.progress
                      .replace("{current}", String(crawlCount.current))
                      .replace("{total}", String(crawlCount.total))}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} />

                {crawlCount.discovered > crawlCount.current ? (
                  <p className="text-xs text-muted-foreground">
                    {copy.discovered
                      .replace("{total}", String(crawlCount.discovered))
                      .replace("{remaining}", String(crawlCount.discovered - crawlCount.current))}
                  </p>
                ) : null}

                {crawledPages.length > 0 ? (
                  <div className="max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-border/70 bg-background p-2.5">
                    {crawledPages.map((page, index) => (
                      <div key={`${page.url}-${index}`} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <span className="truncate">{page.title || page.url}</span>
                        <span className="ms-auto max-w-[120px] truncate font-mono text-[10px] text-muted-foreground">
                          {formatPath(page.url)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <p className="text-center text-xs text-muted-foreground">{copy.patience}</p>
              </div>
            ) : null}
          </form>

          {recentCrawls && recentCrawls.length > 0 ? (
            <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
              <button
                onClick={() => setRecentExpanded((prev) => !prev)}
                className="flex w-full items-center gap-2 text-start"
              >
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">{copy.recentSites}</h2>
                <Badge variant="outline">{recentCrawls.length}</Badge>
                <span className="ms-auto text-muted-foreground">
                  {recentExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </button>

              {recentExpanded ? (
                <div className="mt-4 space-y-3">
                  {recentCrawls.map((crawl) => {
                    const domain = formatDomain(crawl.rootUrl);
                    const totalDiscovered = crawl.pagesCount + crawl.discoveredCount;
                    const hasRemaining = crawl.discoveredCount > 0;

                    return (
                      <button
                        key={crawl._id}
                        onClick={() => router.push(`/site/${crawl.slug ?? crawl._id}`)}
                        className="flex w-full items-center gap-4 rounded-2xl border border-border/70 bg-background p-4 text-start transition-colors hover:border-primary/40"
                      >
                        <div className="rounded-2xl bg-muted p-3">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-mono text-sm font-medium">{domain}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {locale === "ar"
                              ? `${crawl.pagesCount} صفحة مفحوصة${hasRemaining ? ` / ${totalDiscovered} مكتشفة` : ""}`
                              : `${crawl.pagesCount} pages checked${hasRemaining ? ` / ${totalDiscovered} found` : ""}`}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">{formatTimeAgo(crawl.createdAt, copy.justNow)}</div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-primary">
                          <span>{copy.recentOpen}</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function formatPath(url: string): string {
  try {
    const path = new URL(url).pathname;
    return path || "/";
  } catch {
    return url;
  }
}

function formatDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function formatTimeAgo(timestamp: number, justNowLabel: string): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return justNowLabel;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
