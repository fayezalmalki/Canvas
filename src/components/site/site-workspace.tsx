"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useAudience } from "@/context/audience-context";
import { useLocale } from "@/context/locale-context";
import { useSiteContext } from "@/context/site-context";
import { deduplicatePages } from "@/lib/dedup-pages";
import { createCrawlStorageMetadata, createCrawlStoragePlan } from "@/lib/crawl-storage";
import { getConvexSaveErrorMessage, runGuardedConvexSave } from "@/lib/convex-save-error";
import { sitePageUrl } from "@/lib/navigation";
import { scoreSeo } from "@/lib/seo-scorer";
import { buildSiteWorkspaceSummary } from "@/lib/site-health-summary";
import type { CrawlPageResult, CrawlResult, PriorityAction } from "@/types/canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrokenLinksPanel } from "@/components/site/broken-links-panel";
import { ContentIssuesPanel } from "@/components/site/content-issues-panel";
import { ExternalLinksPanel } from "@/components/site/external-links-panel";
import { ImagesPanel } from "@/components/site/images-panel";
import { InternalLinksPanel } from "@/components/site/internal-links-panel";
import { ProductsPanel } from "@/components/site/products-panel";
import {
  AlertTriangle,
  Bot,
  Briefcase,
  ChevronRight,
  Compass,
  Gauge,
  Globe,
  Loader2,
  Radar,
  Search,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  Wrench,
} from "lucide-react";

type WorkspaceTab = "overview" | "ai" | "search" | "store" | "deep-dive";
type DeepDiveTab = "pages" | "content" | "link-health" | "internal" | "external" | "images" | "products";

function getWorkspaceCopy(locale: "en" | "ar", audience: "owner" | "consultant") {
  if (locale === "ar") {
    return {
      audienceLabel: audience === "owner" ? "وضع صاحب الموقع" : "وضع الوكالة",
      assistantSummary: audience === "owner"
        ? "نرتب لك الأولويات بلغة واضحة حتى تعرف ما الذي يؤثر على ظهور موقعك في جوجل وأدوات الذكاء."
        : "نرتب النتائج كمسار مراجعة سريع يمكنك استخدامه مع العملاء أو الفرق الداخلية دون إغراق تقني.",
      helpsTitle: "ما الذي تساعدك عليه بصيرة",
      helpsItems: [
        "توضح أين يفقد الموقع فرص الظهور في البحث وأدوات الذكاء.",
        "تفحص جاهزية الصفحات للقراءة من قبل LLMs والعناكب والـ agents.",
        "تكشف فجوات المتجر والمحتوى التي تؤثر على الفهم والاستخراج.",
      ],
      modules: {
        overview: "الملخص",
        ai: "جاهزية الذكاء",
        search: "البحث والأرشفة",
        store: "جاهزية المتجر",
        deepDive: "تفاصيل متقدمة",
      },
      summaryCards: {
        overall: "الصحة العامة",
        ai: "جاهزية الذكاء",
        search: "صحة الأرشفة",
        store: "جاهزية المتجر",
        pages: "الصفحات المفحوصة",
      },
    prioritiesTitle: "أهم 3 أولويات الآن",
      quickWinsTitle: "خطوات سريعة سهلة",
      strengthsTitle: "ما الذي يعمل بشكل جيد",
      whyItMatters: "لماذا هذا مهم",
      howToFix: "كيف تصلحه",
      overviewIntro: "هذه هي القراءة السريعة للموقع: أين الوضع جيد، وأين تبدأ الإصلاح.",
      aiIntro: "نفحص هنا هل تستطيع أنظمة الذكاء قراءة الموقع وفهمه والوصول إلى محتواه المهم.",
      searchIntro: "هذا القسم يشرح ما الذي قد يربك جوجل أو يضعف الزحف والأرشفة.",
      storeIntro: "إذا كان الموقع تجارياً، فهذا القسم يوضح مدى وضوح بيانات المنتجات للتجربة والبحث والأدوات الذكية.",
      deepDiveIntro: "كل التفاصيل المتقدمة ما زالت هنا، لكننا وضعناها في طبقة ثانية بعد الصورة العامة.",
      metrics: {
        extractable: "صفحات قابلة للاستخراج",
        botProtected: "صفحات محمية",
        structured: "تغطية البيانات المنظمة",
        language: "وضوح اللغة",
        readability: "قابلية القراءة",
        metaCoverage: "تغطية الوصف",
        indexable: "صفحات قابلة للأرشفة",
        brokenLinks: "روابط مكسورة",
        sitemapCoverage: "تغطية خريطة الموقع",
        products: "المنتجات المكتشفة",
        catalogPages: "صفحات متجر",
        dataCoverage: "جودة بيانات المنتجات",
        schemaCoverage: "تغطية Product schema",
      },
      robotsTitle: "إشارات robots.txt و sitemap",
      robotsGood: "لا توجد إشارات حرجة ظاهرة هنا.",
      trackTitle: "المراقبة والتنبيهات",
      trackDescription: "قريباً: متابعة تغييرات المواقع، إطلاق المنتجات، تغيّر الأسعار، وعودة المخزون.",
      competitorsTitle: "المنافسون",
      competitorsDescription: "قريباً: مقارنة المؤشرات والرسائل ونقاط الضعف مع مواقع مشابهة.",
      comingSoon: "قريباً",
      continueCrawl: "فحص الصفحات المتبقية",
      moreDiscovered: "هناك صفحات إضافية مكتشفة لم تُفحص بعد",
      deepDiveTabs: {
        pages: "الصفحات",
        content: "المحتوى",
        linkHealth: "صحة الروابط",
        internal: "الروابط الداخلية",
        external: "الروابط الخارجية",
        images: "الصور",
        products: "المنتجات",
      },
      openPage: "فتح الصفحة",
      noStore: "لم يتم اكتشاف كتالوج منتجات واضح في هذا الفحص.",
      noStoreHint: "إذا كان هذا موقعاً تجارياً، جرّب زيادة عمق الفحص أو مراجعة قوالب صفحات المنتجات.",
    prioritiesEmpty: "لا توجد إشارات حرجة حالياً. يمكن التركيز على التحسينات السريعة والتحسين المستمر.",
    priorityLabels: { high: "عالية", medium: "متوسطة", low: "منخفضة" },
    statusLabels: { strong: "قوي", steady: "مستقر", "at-risk": "يحتاج عناية" },
    remainingNote: "رابطاً إضافياً ما زال بانتظار الفحص.",
    sitemapCoverageNote: (a: number, b: number) => `${a} روابط مفحوصة غير موجودة في الخريطة\n${b} روابط في الخريطة لم نصل لها في هذا الفحص`,
  };
  }

  return {
    audienceLabel: audience === "owner" ? "Site owner mode" : "Agency mode",
    assistantSummary: audience === "owner"
      ? "We keep the guidance plain and action-first so you can see what is hurting visibility without getting buried in technical detail."
      : "We keep the report client-friendly so you can explain what matters fast, then move into the deeper audit when needed.",
    helpsTitle: "What this app helps with",
    helpsItems: [
      "Shows what is hurting discoverability in search and AI tools.",
      "Checks whether LLMs, crawlers, and agents can read and reach key pages.",
      "Finds content and store gaps that weaken extraction, indexing, and trust.",
    ],
    modules: {
      overview: "Overview",
      ai: "AI Readiness",
      search: "Search & Indexing",
      store: "Store Readiness",
      deepDive: "Deep Dive",
    },
    summaryCards: {
      overall: "Overall Health",
      ai: "AI Readiness",
      search: "Indexing Health",
      store: "Store Readiness",
      pages: "Pages Analyzed",
    },
    prioritiesTitle: "Top 3 priorities right now",
    quickWinsTitle: "Quick wins",
    strengthsTitle: "What is already working",
    whyItMatters: "Why this matters",
    howToFix: "How to fix it",
    overviewIntro: "This is the fast read: what looks healthy, what is blocking visibility, and where to start.",
    aiIntro: "This section focuses on whether AI systems can reach, read, and understand your most important pages.",
    searchIntro: "This section explains what may confuse Google, slow crawling, or weaken indexing signals.",
    storeIntro: "For ecommerce sites, this section shows how clearly products are exposed to search engines, AI tools, and future monitoring.",
    deepDiveIntro: "All the detailed audit panels are still here. They now sit behind the guided summary instead of leading the experience.",
    metrics: {
      extractable: "Extractable pages",
      botProtected: "Bot-protected pages",
      structured: "Structured data coverage",
      language: "Language clarity",
      readability: "LLM readability",
      metaCoverage: "Snippet coverage",
      indexable: "Indexable pages",
      brokenLinks: "Broken links",
      sitemapCoverage: "Sitemap coverage",
      products: "Products detected",
      catalogPages: "Catalog pages",
      dataCoverage: "Product data quality",
      schemaCoverage: "Product schema coverage",
    },
    robotsTitle: "robots.txt and sitemap signals",
    robotsGood: "No major crawl-control issues stand out here.",
    trackTitle: "Tracking & alerts",
    trackDescription: "Coming soon: watch websites for launches, price moves, restocks, and important changes.",
    competitorsTitle: "Competitor watch",
    competitorsDescription: "Coming soon: compare positioning, technical gaps, and market movement against similar sites.",
    comingSoon: "Coming soon",
    continueCrawl: "Crawl remaining pages",
    moreDiscovered: "More pages were discovered and are still waiting to be checked.",
    deepDiveTabs: {
      pages: "Pages",
      content: "Content",
      linkHealth: "Link Health",
      internal: "Internal Links",
      external: "External Links",
      images: "Images",
      products: "Products",
    },
    openPage: "Open page",
    noStore: "No clear product catalog was detected in this crawl.",
    noStoreHint: "If this is an ecommerce site, try a deeper crawl or review how product pages are exposed.",
    prioritiesEmpty: "No urgent blockers stand out right now. Focus on polish and incremental improvements.",
    priorityLabels: { high: "High", medium: "Medium", low: "Low" },
    statusLabels: { strong: "Strong", steady: "Steady", "at-risk": "At risk" },
    remainingNote: "extra URLs are still waiting to be checked.",
    sitemapCoverageNote: (a: number, b: number) => `${a} crawled URLs missing from sitemap\n${b} sitemap URLs not reached in this crawl`,
  };
}

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-500";
  if (score >= 55) return "text-amber-500";
  return "text-rose-500";
}

function formatDomain(rootUrl: string) {
  try {
    return new URL(rootUrl).hostname;
  } catch {
    return rootUrl;
  }
}

function formatPath(url: string) {
  try {
    const path = new URL(url).pathname;
    return path || "/";
  } catch {
    return url;
  }
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  note?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: string;
}) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card/90 p-4 shadow-sm shadow-black/5">
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <div className={`text-2xl font-semibold ${tone ?? ""}`}>{value}</div>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function ActionCard({
  action,
  copy,
}: {
  action: PriorityAction;
  copy: ReturnType<typeof getWorkspaceCopy>;
}) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card/95 p-5 shadow-sm shadow-black/5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <Badge variant={action.priority === "high" ? "default" : action.priority === "medium" ? "secondary" : "outline"}>
            {copy.priorityLabels[action.priority]}
          </Badge>
          <h3 className="mt-3 text-base font-semibold">{action.title}</h3>
        </div>
        {action.metric ? (
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {action.metric}
          </span>
        ) : null}
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {copy.whyItMatters}
          </div>
          <p className="text-sm leading-6 text-foreground/80">{action.whyItMatters}</p>
        </div>
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {copy.howToFix}
          </div>
          <p className="text-sm leading-6 text-foreground/80">{action.howToFix}</p>
        </div>
      </div>
    </div>
  );
}

function TeaserCard({
  title,
  description,
  icon: Icon,
  badge,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
}) {
  return (
    <div className="rounded-[2rem] border border-dashed border-border bg-card/70 p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-2xl bg-muted p-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{title}</h3>
          <Badge variant="outline">{badge}</Badge>
        </div>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function PageExplorer({
  pages,
  crawlId,
  cta,
}: {
  pages: CrawlPageResult[];
  crawlId: string;
  cta: string;
}) {
  const router = useRouter();
  const sortedPages = useMemo(() => [...pages].sort((a, b) => {
    return scoreSeo({ url: b.url, title: b.title, seo: b.seo }).score -
      scoreSeo({ url: a.url, title: a.title, seo: a.seo }).score;
  }), [pages]);

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      {sortedPages.map((page) => {
        const result = scoreSeo({ url: page.url, title: page.title, seo: page.seo });
        return (
          <div
            key={page.url}
            className="rounded-3xl border border-border/70 bg-card/95 p-4 shadow-sm shadow-black/5"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {page.title || formatPath(page.url)}
                </div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">
                  {formatPath(page.url)}
                </div>
              </div>
              <div className={`text-lg font-semibold ${scoreTone(result.score)}`}>
                {result.score}
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <Badge variant="outline">{page.seo.wordCount} words</Badge>
              <Badge variant="outline">{page.seo.internalLinkCount} internal links</Badge>
              {page.botProtection ? <Badge variant="secondary">{page.botProtection}</Badge> : null}
              {!page.seo.meta.description ? <Badge variant="secondary">No description</Badge> : null}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(sitePageUrl(crawlId, page.url))}
            >
              {cta}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export function SiteWorkspace() {
  const { locale } = useLocale();
  const { audience } = useAudience();
  const { crawlId, crawlResult, discoveredUrls, setCrawlResult, setDiscoveredUrls } = useSiteContext();
  const copy = getWorkspaceCopy(locale, audience);
  const addPagesToCrawl = useMutation(api.crawls.addPagesToCrawl);
  const updateCrawlMetadata = useMutation(api.crawls.updateCrawlMetadata);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [deepDiveTab, setDeepDiveTab] = useState<DeepDiveTab>("pages");
  const [continueCrawling, setContinueCrawling] = useState(false);
  const [continueProgress, setContinueProgress] = useState({ current: 0, total: 0 });
  const [continueError, setContinueError] = useState("");
  const pages = useMemo(() => deduplicatePages(crawlResult?.pages ?? []), [crawlResult?.pages]);
  const summary = useMemo(() => (
    crawlResult ? buildSiteWorkspaceSummary(crawlResult) : null
  ), [crawlResult]);
  const products = useMemo(() =>
    pages.flatMap((page) => (page.products ?? []).map((product) => ({ ...product, pageUrl: page.url }))),
  [pages]);

  if (!crawlResult || !summary) return null;

  const rootUrl = crawlResult.rootUrl;
  const domain = formatDomain(rootUrl);

  async function handleContinueCrawl() {
    if (discoveredUrls.length === 0 || !crawlResult) return;
    const currentCrawl = crawlResult;
    const crawlDocId = currentCrawl._id;
    if (!crawlDocId) {
      console.error("Continue crawl failed: missing crawl document id");
      return;
    }

    setContinueError("");
    setContinueCrawling(true);
    setContinueProgress({ current: 0, total: Math.min(discoveredUrls.length, 50) });

    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: rootUrl,
          maxDepth: 2,
          maxPages: Math.min(discoveredUrls.length, 50),
          onlyUrls: discoveredUrls.slice(0, 50),
        }),
      });

      if (!res.ok) throw new Error("Crawl failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

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
          const event = JSON.parse(line.slice(6)) as {
            type: "page_crawled" | "complete";
            index?: number;
            total?: number;
            result?: CrawlResult;
          };
          if (event.type === "page_crawled") {
            setContinueProgress({ current: event.index ?? 0, total: event.total ?? 0 });
          } else if (event.type === "complete" && event.result) {
            const existingUrls = new Set(currentCrawl.pages.map((page) => page.url));
            const newPages = event.result.pages.filter((page: CrawlPageResult) => !existingUrls.has(page.url));
            const merged = {
              ...currentCrawl,
              pages: [...currentCrawl.pages, ...newPages],
              discoveredUrls: event.result.discoveredUrls ?? [],
              brokenLinks: event.result.brokenLinks ?? currentCrawl.brokenLinks ?? [],
              redirectChains: event.result.redirectChains ?? currentCrawl.redirectChains ?? [],
              robotsSitemap: event.result.robotsSitemap ?? currentCrawl.robotsSitemap,
            };

            setCrawlResult(merged);
            setDiscoveredUrls(merged.discoveredUrls);

            if (newPages.length > 0) {
              const pagePlan = createCrawlStoragePlan({
                rootUrl: currentCrawl.rootUrl,
                pages: newPages,
                discoveredUrls: [],
                brokenLinks: [],
                redirectChains: [],
              });

              for (const chunk of pagePlan.pageChunks) {
                if (chunk.length === 0) continue;
                await runGuardedConvexSave(
                  () => addPagesToCrawl({
                    crawlId: crawlDocId as Id<"crawls">,
                    pages: chunk,
                  }),
                  locale
                );
              }
            }

            await runGuardedConvexSave(
              () => updateCrawlMetadata({
                crawlId: crawlDocId as Id<"crawls">,
                ...createCrawlStorageMetadata(merged),
              }),
              locale
            );
          }
        }
      }
    } catch (error) {
      setContinueError(getConvexSaveErrorMessage(error, locale));
      console.error("Continue crawl failed:", error);
    } finally {
      setContinueCrawling(false);
    }
  }

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,rgba(13,148,136,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(217,119,6,0.12),transparent_28%)] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] border border-border/70 bg-card/90 p-5 shadow-lg shadow-black/5 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{copy.audienceLabel}</Badge>
                <Badge variant="outline">{domain}</Badge>
              </div>
              <h1 className="font-heading text-3xl tracking-tight md:text-5xl">
                {domain}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                {summary.health.summary}
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-foreground/75">
                {copy.assistantSummary}
              </p>
            </div>

            <div className="grid w-full max-w-xl grid-cols-2 gap-3 md:grid-cols-3">
              <MetricCard
                label={copy.summaryCards.overall}
                value={summary.health.overallScore}
                note={copy.statusLabels[summary.health.status]}
                icon={Gauge}
                tone={scoreTone(summary.health.overallScore)}
              />
              <MetricCard
                label={copy.summaryCards.ai}
                value={summary.ai.score}
                icon={Bot}
                tone={scoreTone(summary.ai.score)}
              />
              <MetricCard
                label={copy.summaryCards.search}
                value={summary.search.score}
                icon={Search}
                tone={scoreTone(summary.search.score)}
              />
              <MetricCard
                label={copy.summaryCards.store}
                value={summary.store.score ?? "—"}
                icon={ShoppingBag}
                tone={summary.store.score !== null ? scoreTone(summary.store.score) : undefined}
              />
              <MetricCard
                label={copy.summaryCards.pages}
                value={summary.health.pagesAnalyzed}
                icon={Globe}
                note={rootUrl}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-[1.75rem] bg-muted/50 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Compass className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">{copy.helpsTitle}</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {copy.helpsItems.map((item) => (
                  <div key={item} className="rounded-3xl border border-border/60 bg-background/80 p-4 text-sm leading-6 text-foreground/80">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-dashed border-border bg-background/70 p-5">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">{copy.quickWinsTitle}</h2>
              </div>
              <div className="space-y-3">
                {(summary.health.quickWins.length > 0 ? summary.health.quickWins : summary.health.topPriorities.slice(0, 2)).map((action) => (
                  <div key={action.id} className="rounded-3xl border border-border/70 bg-card/90 p-4">
                    <div className="text-sm font-medium">{action.title}</div>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">{action.howToFix}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {discoveredUrls.length > 0 ? (
          <section className="rounded-[1.75rem] border border-amber-500/25 bg-amber-500/8 p-4 md:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-medium">{copy.moreDiscovered}</div>
                <div className="text-xs text-muted-foreground">
                  {discoveredUrls.length} {copy.remainingNote}
                </div>
              </div>
              {continueCrawling ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {continueProgress.current}/{continueProgress.total}
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={handleContinueCrawl}>
                  {copy.continueCrawl}
                </Button>
              )}
            </div>
            {continueError ? (
              <p className="mt-3 text-sm leading-6 text-rose-600 dark:text-rose-400">
                {continueError}
              </p>
            ) : null}
          </section>
        ) : null}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkspaceTab)}>
          <TabsList className="flex w-full flex-wrap justify-start gap-1 rounded-[1.5rem] bg-card/90 p-2">
            <TabsTrigger value="overview">{copy.modules.overview}</TabsTrigger>
            <TabsTrigger value="ai">{copy.modules.ai}</TabsTrigger>
            <TabsTrigger value="search">{copy.modules.search}</TabsTrigger>
            <TabsTrigger value="store">{copy.modules.store}</TabsTrigger>
            <TabsTrigger value="deep-dive">{copy.modules.deepDive}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 pt-4">
            <section>
              <p className="mb-4 text-sm leading-7 text-muted-foreground">{copy.overviewIntro}</p>
              {summary.health.topPriorities.length > 0 ? (
                <>
                  <h2 className="mb-4 text-lg font-semibold">{copy.prioritiesTitle}</h2>
                  <div className="grid gap-4 xl:grid-cols-3">
                    {summary.health.topPriorities.map((action) => (
                      <ActionCard key={action.id} action={action} copy={copy} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-[1.75rem] border border-border bg-card/90 p-6 text-sm text-muted-foreground">
                  {copy.prioritiesEmpty}
                </div>
              )}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.75rem] border border-border/70 bg-card/90 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">{copy.strengthsTitle}</h2>
                </div>
                <div className="space-y-3">
                  {summary.health.strengths.map((strength) => (
                    <div key={strength} className="rounded-3xl bg-muted/50 p-4 text-sm leading-6 text-foreground/80">
                      {strength}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <TeaserCard
                  title={copy.trackTitle}
                  description={copy.trackDescription}
                  icon={Radar}
                  badge={copy.comingSoon}
                />
                <TeaserCard
                  title={copy.competitorsTitle}
                  description={copy.competitorsDescription}
                  icon={Target}
                  badge={copy.comingSoon}
                />
              </div>
            </section>
          </TabsContent>

          <TabsContent value="ai" className="space-y-6 pt-4">
            <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-5">
              <p className="text-sm leading-7 text-muted-foreground">{copy.aiIntro}</p>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <MetricCard label={copy.metrics.extractable} value={summary.ai.extractablePageCount} icon={Wrench} />
                <MetricCard label={copy.metrics.botProtected} value={summary.ai.botProtectedPageCount} icon={AlertTriangle} />
                <MetricCard label={copy.metrics.structured} value={`${summary.ai.structuredDataCoverage}%`} icon={Briefcase} tone={scoreTone(summary.ai.structuredDataCoverage)} />
                <MetricCard label={copy.metrics.language} value={`${summary.ai.languageClarityCoverage}%`} icon={Globe} tone={scoreTone(summary.ai.languageClarityCoverage)} />
                <MetricCard label={copy.metrics.readability} value={`${summary.ai.llmReadabilityCoverage}%`} icon={Bot} tone={scoreTone(summary.ai.llmReadabilityCoverage)} />
              </div>
              <p className="mt-4 text-sm leading-7 text-foreground/80">{summary.ai.summary}</p>
            </section>

            <div className="grid gap-4 xl:grid-cols-3">
              {summary.ai.topPriorities.map((action) => (
                <ActionCard key={action.id} action={action} copy={copy} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="search" className="space-y-6 pt-4">
            <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-5">
              <p className="text-sm leading-7 text-muted-foreground">{copy.searchIntro}</p>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label={copy.metrics.metaCoverage} value={`${summary.search.metaCoverage}%`} icon={Search} tone={scoreTone(summary.search.metaCoverage)} />
                <MetricCard label={copy.metrics.indexable} value={summary.search.indexablePages} icon={Globe} />
                <MetricCard label={copy.metrics.brokenLinks} value={summary.search.brokenLinksCount} icon={AlertTriangle} tone={summary.search.brokenLinksCount > 0 ? "text-rose-500" : undefined} />
                <MetricCard label={copy.metrics.sitemapCoverage} value={`${summary.search.sitemapCoverage}%`} icon={Compass} tone={scoreTone(summary.search.sitemapCoverage)} />
              </div>
              <p className="mt-4 text-sm leading-7 text-foreground/80">{summary.search.summary}</p>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
              <div className="grid gap-4 xl:grid-cols-2">
                {summary.search.actions.map((action) => (
                  <ActionCard key={action.id} action={action} copy={copy} />
                ))}
              </div>

              <div className="rounded-[1.75rem] border border-border/70 bg-card/90 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Compass className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">{copy.robotsTitle}</h2>
                </div>

                {crawlResult.robotsSitemap ? (
                  <div className="space-y-4">
                    <div className="rounded-3xl bg-muted/50 p-4">
                      <div className="text-sm font-medium">robots.txt</div>
                      <p className="mt-1 text-xs leading-6 text-muted-foreground">
                        {crawlResult.robotsSitemap.robotsTxt.issues[0] ?? copy.robotsGood}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-muted/50 p-4">
                      <div className="text-sm font-medium">sitemap.xml</div>
                      <p className="mt-1 text-xs leading-6 text-muted-foreground">
                        {crawlResult.robotsSitemap.sitemap.issues[0] ?? copy.robotsGood}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-muted/50 p-4 text-xs leading-6 text-muted-foreground">
                      {copy.sitemapCoverageNote(
                        crawlResult.robotsSitemap.coverage.crawledNotInSitemap.length,
                        crawlResult.robotsSitemap.coverage.inSitemapNotCrawled.length
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{copy.robotsGood}</p>
                )}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="store" className="space-y-6 pt-4">
            <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-5">
              <p className="text-sm leading-7 text-muted-foreground">{copy.storeIntro}</p>
              {summary.store.productCount > 0 ? (
                <>
                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label={copy.metrics.products} value={summary.store.productCount} icon={ShoppingBag} />
                    <MetricCard label={copy.metrics.catalogPages} value={summary.store.pagesWithProducts} icon={Globe} />
                    <MetricCard label={copy.metrics.dataCoverage} value={`${summary.store.productDataCoverage}%`} icon={Gauge} tone={scoreTone(summary.store.productDataCoverage)} />
                    <MetricCard label={copy.metrics.schemaCoverage} value={`${summary.store.schemaBackedCoverage}%`} icon={Briefcase} tone={scoreTone(summary.store.schemaBackedCoverage)} />
                  </div>
                  <p className="mt-4 text-sm leading-7 text-foreground/80">{summary.store.summary}</p>
                </>
              ) : (
                <div className="mt-4 rounded-[1.75rem] border border-dashed border-border bg-background/60 p-6">
                  <p className="text-sm font-medium">{copy.noStore}</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{copy.noStoreHint}</p>
                </div>
              )}
            </section>

            {summary.store.productCount > 0 ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {summary.store.actions.map((action) => (
                  <ActionCard key={action.id} action={action} copy={copy} />
                ))}
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="deep-dive" className="space-y-5 pt-4">
            <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-5">
              <p className="text-sm leading-7 text-muted-foreground">{copy.deepDiveIntro}</p>
            </section>

            <Tabs value={deepDiveTab} onValueChange={(value) => setDeepDiveTab(value as DeepDiveTab)}>
              <TabsList variant="line" className="flex w-full flex-wrap justify-start gap-1 rounded-none bg-transparent p-0">
                <TabsTrigger value="pages">{copy.deepDiveTabs.pages}</TabsTrigger>
                <TabsTrigger value="content">{copy.deepDiveTabs.content}</TabsTrigger>
                <TabsTrigger value="link-health">{copy.deepDiveTabs.linkHealth}</TabsTrigger>
                <TabsTrigger value="internal">{copy.deepDiveTabs.internal}</TabsTrigger>
                <TabsTrigger value="external">{copy.deepDiveTabs.external}</TabsTrigger>
                <TabsTrigger value="images">{copy.deepDiveTabs.images}</TabsTrigger>
                {products.length > 0 ? <TabsTrigger value="products">{copy.deepDiveTabs.products}</TabsTrigger> : null}
              </TabsList>

              <TabsContent value="pages" className="pt-4">
                <PageExplorer pages={pages} crawlId={crawlId} cta={copy.openPage} />
              </TabsContent>
              <TabsContent value="content" className="pt-4">
                <ContentIssuesPanel pages={pages} />
              </TabsContent>
              <TabsContent value="link-health" className="pt-4">
                <BrokenLinksPanel
                  brokenLinks={crawlResult.brokenLinks ?? []}
                  redirectChains={crawlResult.redirectChains ?? []}
                />
              </TabsContent>
              <TabsContent value="internal" className="pt-4">
                <InternalLinksPanel pages={pages} />
              </TabsContent>
              <TabsContent value="external" className="pt-4">
                <ExternalLinksPanel pages={pages} />
              </TabsContent>
              <TabsContent value="images" className="pt-4">
                <ImagesPanel pages={pages} />
              </TabsContent>
              {products.length > 0 ? (
                <TabsContent value="products" className="pt-4">
                  <ProductsPanel products={products} />
                </TabsContent>
              ) : null}
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
