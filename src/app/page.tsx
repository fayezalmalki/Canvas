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
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Globe,
  Languages,
  Loader2,
  Radar,
  Search,
  ShoppingBag,
  Sparkles,
  Target,
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
      description: "اكتشف ما الذي قد يضعف ظهور موقعك في جوجل وأدوات الذكاء، وما الذي يحتاج إصلاحاً أولاً.",
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
      roleTitle: "كيف ستستخدم بصيرة؟",
      roleOwner: "أنا أدير موقعي",
      roleConsultant: "أنا أراجع مواقع لعملاء",
      roleOwnerHint: "ستحصل على قراءة واضحة لما يحتاج إصلاحاً أولاً، بدون الحاجة لخبرة تقنية عميقة.",
      roleConsultantHint: "ستحصل على ملخص واضح يمكنك مراجعته سريعاً وشرحه للعملاء أو لفريقك بسهولة.",
      helpTitle: "ما الذي تساعدك عليه بصيرة",
      helpItems: [
        "اعرف لماذا قد يكون موقعك صعب الاكتشاف.",
        "تحقق هل تستطيع أدوات الذكاء فهم صفحاتك.",
        "اكتشف مشكلات المحتوى أو المتجر قبل أن تؤثر على النتائج.",
      ],
      helperTitle: "ماذا ستحصل بعد إدخال رابط موقعك؟",
      helperText: "نفحص الموقع، نوضح ما الذي يضعف ظهوره، ثم نرتب لك ما يجب إصلاحه أولاً في البحث وأدوات الذكاء وصفحات المتجر.",
      upcomingTitle: "قريباً أيضاً",
      upcomingTrack: "متابعة التغييرات المهمة في المواقع، مثل إطلاق المنتجات، تغيّر الأسعار، وعودة المخزون.",
      upcomingCompetitors: "مراقبة المنافسين ومعرفة الفجوات أو التحركات التي تستحق الانتباه.",
      recentOpen: "فتح التقرير",
      justNow: "الآن",
    };
  }

  return {
    brand: "بصيـــرة",
    subbrand: "Baseera",
    title: "Make your site easier for Google, AI tools, and shoppers to understand",
    description: "See what may be holding your site back in Google and AI tools, and what to fix first across your content and store pages.",
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
    roleTitle: "How will you use Baseera?",
    roleOwner: "I run my own site",
    roleConsultant: "I audit sites for clients",
    roleOwnerHint: "You’ll get a clear summary of what needs attention first, without needing deep technical SEO knowledge.",
    roleConsultantHint: "You’ll get a fast, client-friendly summary you can review quickly and explain clearly to clients or teammates.",
    helpTitle: "What Baseera helps with",
    helpItems: [
      "See why your site may be hard to find.",
      "Check whether AI tools can understand your pages.",
      "Catch content and store issues before they hurt results.",
    ],
    helperTitle: "What you get after you enter your URL",
    helperText: "Baseera scans your site, shows what may be hurting visibility, and points you to the fixes that matter first.",
    upcomingTitle: "Coming soon",
    upcomingTrack: "Track important site changes like launches, price changes, restocks, and major updates.",
    upcomingCompetitors: "Monitor competitors and spot gaps or moves worth paying attention to.",
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
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,rgba(13,148,136,0.12),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(217,119,6,0.13),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,248,249,1))] px-4 py-5 dark:bg-[radial-gradient(circle_at_top_left,rgba(13,148,136,0.18),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(217,119,6,0.16),transparent_24%),linear-gradient(180deg,rgba(14,18,21,0.96),rgba(10,12,14,1))]">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setLocale(locale === "en" ? "ar" : "en")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/80 text-muted-foreground transition-colors hover:text-foreground"
            title={locale === "en" ? "العربية" : "English"}
          >
            <Languages className="h-4 w-4" />
          </button>
          <ThemeToggle />
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-xl shadow-black/5 md:p-8">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{copy.subbrand}</Badge>
              <Badge variant="outline">{audience === "owner" ? copy.roleOwner : copy.roleConsultant}</Badge>
            </div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
              {copy.brand}
            </p>
            <h1 className="mt-4 max-w-3xl font-heading text-4xl tracking-tight md:text-6xl">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
              {copy.description}
            </p>

            <div className="mt-8 rounded-[1.75rem] bg-muted/45 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">{copy.helpTitle}</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {copy.helpItems.map((item) => (
                  <div key={item} className="rounded-3xl border border-border/70 bg-background/80 p-4 text-sm leading-6 text-foreground/80">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.75rem] border border-border/70 bg-background/70 p-5">
                <div className="mb-2 flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">{copy.helperTitle}</h2>
                </div>
                <p className="text-sm leading-7 text-muted-foreground">{copy.helperText}</p>
              </div>
              <div className="rounded-[1.75rem] border border-dashed border-border bg-background/70 p-5">
                <div className="mb-2 flex items-center gap-2">
                  <Radar className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">{copy.upcomingTitle}</h2>
                </div>
                <div className="space-y-3 text-sm leading-7 text-muted-foreground">
                  <p>{copy.upcomingTrack}</p>
                  <p>{copy.upcomingCompetitors}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="rounded-[2rem] border border-border/70 bg-card/95 p-6 shadow-xl shadow-black/5 md:p-7">
              <div className="mb-5">
                <div className="mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">{copy.roleTitle}</h2>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { key: "owner", label: copy.roleOwner },
                    { key: "consultant", label: copy.roleConsultant },
                  ] as const).map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setAudience(option.key)}
                      className={`rounded-2xl border px-4 py-3 text-sm transition-colors ${
                        audience === option.key
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background/70 text-foreground hover:border-primary/40"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {audience === "owner" ? copy.roleOwnerHint : copy.roleConsultantHint}
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Globe className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={copy.placeholder}
                    className="h-13 rounded-2xl border-border/70 bg-background/80 ps-10 text-base font-mono"
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
                  <div className="rounded-[1.5rem] bg-muted/45 p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">{copy.maxDepth}</label>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          value={maxDepth}
                          onChange={(e) => setMaxDepth(Number(e.target.value))}
                          className="h-9 rounded-xl bg-background/80 font-mono"
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
                          className="h-9 rounded-xl bg-background/80 font-mono"
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
              </div>

              {crawling ? (
                <div className="mt-5 space-y-3">
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
                    <div className="max-h-56 space-y-1 overflow-y-auto rounded-[1.5rem] border border-border/70 bg-background/70 p-2.5">
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.75rem] border border-border/70 bg-card/90 p-5">
                    <div className="mb-2 flex items-center gap-2">
                      <Bot className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">{locale === "ar" ? "الذكاء + السيو" : "AI + SEO"}</h2>
                </div>
                <p className="text-sm leading-7 text-muted-foreground">
                  {locale === "ar"
                    ? "ابدأ دائماً بفحص واحد موجّه، ثم انتقل إلى جاهزية الذكاء وصحة الأرشفة من نفس التقرير."
                    : "Start with one guided audit, then move into AI readiness and indexing health from the same workspace."}
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-dashed border-border bg-card/90 p-5">
                <div className="mb-2 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">{locale === "ar" ? "جاهز للمتاجر" : "Ecommerce aware"}</h2>
                </div>
                <p className="text-sm leading-7 text-muted-foreground">
                  {locale === "ar"
                    ? "إذا كان الموقع متجراً، يظهر لك قسم خاص يوضح جودة بيانات المنتجات وجاهزية الصفحات التجارية."
                    : "If the site is a store, Baseera adds a product-focused view for catalog clarity and commerce data quality."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {recentCrawls && recentCrawls.length > 0 ? (
          <section className="rounded-[2rem] border border-border/70 bg-card/90 p-5 shadow-lg shadow-black/5">
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
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {recentCrawls.map((crawl) => {
                  const domain = formatDomain(crawl.rootUrl);
                  const totalDiscovered = crawl.pagesCount + crawl.discoveredCount;
                  const hasRemaining = crawl.discoveredCount > 0;

                  return (
                    <button
                      key={crawl._id}
                      onClick={() => router.push(`/site/${crawl.slug ?? crawl._id}`)}
                      className="flex items-center gap-4 rounded-[1.5rem] border border-border/70 bg-background/70 p-4 text-start transition-colors hover:border-primary/40"
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
