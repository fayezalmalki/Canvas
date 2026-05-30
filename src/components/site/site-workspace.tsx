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
import type { CrawlPageResult, CrawlResult } from "@/types/canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrokenLinksPanel } from "@/components/site/broken-links-panel";
import { ContentIssuesPanel } from "@/components/site/content-issues-panel";
import { ExternalLinksPanel } from "@/components/site/external-links-panel";
import { ImagesPanel } from "@/components/site/images-panel";
import { InternalLinksPanel } from "@/components/site/internal-links-panel";
import { ProductsPanel } from "@/components/site/products-panel";
import {
  FixCard,
  LinkRow,
  ScoreStat,
  SURFACE,
  SURFACE_SUBTLE,
  DASHED,
} from "@/components/site/workspace-cards";
import { AiRewritesModule } from "@/components/site/ai-rewrites-module";
import {
  CompetitorsModule,
  MonitoringModule,
  PriceStockModule,
  WORKSPACE_MODULES,
  type WorkspaceModuleId,
} from "@/components/site/capability-modules";
import {
  AlertTriangle,
  Bot,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Compass,
  Gauge,
  Globe,
  Link2,
  Loader2,
  Search,
  ShoppingBag,
  Wrench,
} from "lucide-react";

type DeepDiveTab = "pages" | "content" | "link-health" | "internal" | "external" | "images" | "products";

export type WorkspaceCopy = ReturnType<typeof getWorkspaceCopy>;

function getWorkspaceCopy(locale: "en" | "ar", audience: "owner" | "consultant") {
  if (locale === "ar") {
    return {
      audienceLabel: audience === "owner" ? "وضع صاحب الموقع" : "وضع الوكالة",
      assistantSummary: audience === "owner"
        ? "نرتب لك الأولويات بلغة واضحة حتى تعرف ما الذي يؤثر على ظهور موقعك في جوجل وأدوات الذكاء."
        : "نرتب النتائج كمسار مراجعة سريع يمكنك استخدامه مع العملاء أو الفرق الداخلية دون إغراق تقني.",
      modules: {
        search: "البحث و SEO",
        ai: "جاهزية الذكاء",
        commerce: "الكتالوج والمتجر",
        monitoring: "المراقبة",
        competitors: "المنافسون",
        pages: "الصفحات",
      },
      summaryCards: {
        overall: "الصحة العامة",
        ai: "جاهزية الذكاء",
        search: "صحة الأرشفة",
        store: "جاهزية المتجر",
        pages: "الصفحات المفحوصة",
      },
      overviewIntro: "القراءة السريعة: أين الوضع جيد، وما الذي يجب إصلاحه أولاً.",
      prioritiesTitle: "أهم الأولويات الآن",
      quickWinsTitle: "خطوات سريعة سهلة",
      strengthsTitle: "ما الذي يعمل بشكل جيد",
      prioritiesEmpty: "لا توجد إشارات حرجة حالياً. يمكن التركيز على التحسينات السريعة والتحسين المستمر.",
      whyItMatters: "لماذا هذا مهم",
      howToFix: "كيف تصلحه",
      guidedFixesTitle: "إصلاحات موجهة",
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
      aiRewrites: {
        title: "إعادة صياغة بالذكاء",
        description: "أنشئ عناوين وأوصافاً ونصوصاً بديلة وبيانات schema أفضل لأضعف صفحاتك، استناداً إلى محتوى كل صفحة الفعلي.",
        noWeakPages: "لا توجد صفحات ضعيفة — بياناتك الوصفية تبدو جيدة.",
        generate: "إنشاء",
        regenerate: "إعادة الإنشاء",
        generating: "جارٍ الإنشاء…",
        fTitle: "العنوان",
        fDescription: "وصف الميتا",
        fAlt: "نص الصور البديل",
        fSchema: "JSON-LD",
        copy: "نسخ",
        copied: "تم النسخ",
        noKey: "أضف مفتاح مزود ذكاء (MISTRAL_API_KEY أو OPENAI_API_KEY) لإنشاء الصياغات.",
      },
      links: {
        health: "صحة الروابط",
        allClear: "لا توجد روابط مكسورة أو سلاسل تحويل.",
        broken: "روابط مكسورة",
        redirects: "تحويلات",
        foundOn: (n: number) => `في ${n} صفحة`,
        hops: (n: number) => `${n} تحويلة`,
        more: (n: number) => `+${n} أخرى`,
        sitemapMissing: "مفحوصة وغير موجودة في الخريطة",
        sitemapUnreached: "في الخريطة ولم تُفحص",
        botProtected: "صفحات محمية من الزحف",
      },
      priceStock: {
        title: "الأسعار والمخزون الآن",
        inStock: "متوفر",
        outOfStock: "غير متوفر",
        onSale: "عليه خصم",
        priceRange: "نطاق السعر",
        topDiscounts: "أعلى الخصومات",
      },
      priceHistory: {
        title: "سجل الأسعار والتنبيهات",
        description: "قريباً: نتتبّع تغيّر الأسعار وعودة المخزون انطلاقاً من هذا الفحص.",
        points: [
          "كشف انخفاض الأسعار وارتفاعها",
          "تنبيهات عند عودة المنتج للمخزون",
          "رسم بياني لتاريخ الأسعار",
        ],
      },
      monitoring: {
        intro: "نلتقط هنا حالة الموقع الحالية كنقطة انطلاق لمتابعة التغييرات.",
        baseline: "تم التقاط نقطة الأساس.",
        baselineNote: (n: number) => `${n} صفحة محفوظة كأساس للمقارنة في الفحوصات القادمة.`,
        title: "تتبّع تغييرات المحتوى",
        description: "قريباً: نراقب التغييرات المهمة منذ هذا الفحص.",
        points: [
          "كشف تغيّر المحتوى والأسعار والمخزون",
          "تنبيهات عبر البريد أو داخل التطبيق",
          "سجل زمني لكل التغييرات",
        ],
      },
      competitors: {
        title: "مقارنة المنافسين",
        description: "قريباً: قارن موقعك مع مواقع مشابهة جنباً إلى جنب.",
        points: [
          "مقارنة الدرجات جنباً إلى جنب",
          "تغطية البيانات المنظمة وحجم الكتالوج",
          "تموضع الأسعار وفجوات المحتوى",
        ],
        addLabel: "أضف منافساً",
        addPlaceholder: "أضف رابط منافس",
      },
      comingSoon: "قريباً",
      continueCrawl: "فحص الصفحات المتبقية",
      moreDiscovered: "هناك صفحات إضافية مكتشفة لم تُفحص بعد",
      remainingNote: "رابطاً إضافياً ما زال بانتظار الفحص.",
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
      priorityLabels: { high: "عالية", medium: "متوسطة", low: "منخفضة" },
      statusLabels: { strong: "قوي", steady: "مستقر", "at-risk": "يحتاج عناية" },
      sitemapCoverageNote: (a: number, b: number) => `${a} روابط مفحوصة غير موجودة في الخريطة\n${b} روابط في الخريطة لم نصل لها في هذا الفحص`,
    };
  }

  return {
    audienceLabel: audience === "owner" ? "Site owner mode" : "Agency mode",
    assistantSummary: audience === "owner"
      ? "We keep the guidance plain and action-first so you can see what is hurting visibility without getting buried in technical detail."
      : "We keep the report client-friendly so you can explain what matters fast, then move into the deeper audit when needed.",
    modules: {
      search: "Search & SEO",
      ai: "AI Readiness",
      commerce: "Catalog & Commerce",
      monitoring: "Monitoring",
      competitors: "Competitors",
      pages: "Pages",
    },
    summaryCards: {
      overall: "Overall Health",
      ai: "AI Readiness",
      search: "Indexing Health",
      store: "Store Readiness",
      pages: "Pages Analyzed",
    },
    overviewIntro: "The fast read: what looks healthy, and what to fix first.",
    prioritiesTitle: "Top priorities right now",
    quickWinsTitle: "Quick wins",
    strengthsTitle: "What is already working",
    prioritiesEmpty: "No urgent blockers stand out right now. Focus on polish and incremental improvements.",
    whyItMatters: "Why this matters",
    howToFix: "How to fix it",
    guidedFixesTitle: "Guided fixes",
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
    aiRewrites: {
      title: "AI rewrites",
      description: "Generate stronger titles, descriptions, alt text, and schema for your weakest pages — grounded in each page's real content.",
      noWeakPages: "No weak pages found — your metadata looks solid.",
      generate: "Generate",
      regenerate: "Regenerate",
      generating: "Generating…",
      fTitle: "Title",
      fDescription: "Meta description",
      fAlt: "Image alt text",
      fSchema: "JSON-LD",
      copy: "Copy",
      copied: "Copied",
      noKey: "Add an AI provider key (MISTRAL_API_KEY or OPENAI_API_KEY) to generate rewrites.",
    },
    links: {
      health: "Link health",
      allClear: "No broken links or redirect chains found.",
      broken: "Broken links",
      redirects: "Redirects",
      foundOn: (n: number) => `on ${n} page${n === 1 ? "" : "s"}`,
      hops: (n: number) => `${n} hop${n === 1 ? "" : "s"}`,
      more: (n: number) => `+${n} more`,
      sitemapMissing: "Crawled, missing from sitemap",
      sitemapUnreached: "In sitemap, not reached",
      botProtected: "Bot-protected pages",
    },
    priceStock: {
      title: "Price & stock today",
      inStock: "In stock",
      outOfStock: "Out of stock",
      onSale: "On sale",
      priceRange: "Price range",
      topDiscounts: "Biggest discounts",
    },
    priceHistory: {
      title: "Price history & alerts",
      description: "Coming soon: track price moves and restocks starting from this crawl.",
      points: [
        "Price drop and increase detection",
        "Back-in-stock alerts",
        "Price history charts",
      ],
    },
    monitoring: {
      intro: "This captures the site's current state as a baseline for tracking changes over time.",
      baseline: "Baseline captured.",
      baselineNote: (n: number) => `${n} pages saved as the baseline for future crawls to compare against.`,
      title: "Content-change tracking",
      description: "Coming soon: watch for meaningful changes since this crawl.",
      points: [
        "Content, price, and stock change detection",
        "Email or in-app alerts",
        "A timeline of every change",
      ],
    },
    competitors: {
      title: "Competitor benchmarking",
      description: "Coming soon: compare your site side by side with similar ones.",
      points: [
        "Side-by-side scores",
        "Structured-data coverage and catalog size",
        "Price positioning and content gaps",
      ],
      addLabel: "Add a competitor",
      addPlaceholder: "Add a competitor URL",
    },
    comingSoon: "Coming soon",
    continueCrawl: "Crawl remaining pages",
    moreDiscovered: "More pages were discovered and are still waiting to be checked.",
    remainingNote: "extra URLs are still waiting to be checked.",
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
    priorityLabels: { high: "High", medium: "Medium", low: "Low" },
    statusLabels: { strong: "Strong", steady: "Steady", "at-risk": "At risk" },
    sitemapCoverageNote: (a: number, b: number) => `${a} crawled URLs missing from sitemap\n${b} sitemap URLs not reached in this crawl`,
  };
}

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-500";
  if (score >= 55) return "text-amber-500";
  return "text-rose-500";
}

function healthStatusTone(status: "strong" | "steady" | "at-risk"): "success" | "info" | "warning" {
  if (status === "strong") return "success";
  if (status === "at-risk") return "warning";
  return "info";
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
            className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold" dir="auto">
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
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
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
  const [activeTab, setActiveTab] = useState<WorkspaceModuleId>("search");
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
  const brokenLinks = crawlResult.brokenLinks ?? [];
  const redirectChains = crawlResult.redirectChains ?? [];
  const botProtectedPages = pages.filter((page) => page.botProtection);

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
    <div className="min-h-full bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Header: identity + scores */}
        <section className={SURFACE}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{copy.audienceLabel}</Badge>
                <Badge variant="outline">{domain}</Badge>
              </div>
              <h1 className="font-heading text-2xl tracking-tight" dir="auto">
                {domain}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {summary.health.summary}
              </p>
            </div>

            <div className="flex items-center gap-3 lg:flex-col lg:items-end">
              <StatusBadge status={healthStatusTone(summary.health.status)}>
                {copy.statusLabels[summary.health.status]}
              </StatusBadge>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-4xl font-semibold ${scoreTone(summary.health.overallScore)}`}>
                  {summary.health.overallScore}
                </span>
                <span className="text-xs text-muted-foreground">{copy.summaryCards.overall}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border/60 pt-5 sm:grid-cols-4">
            <ScoreStat
              label={copy.summaryCards.ai}
              value={summary.ai.score}
              icon={Bot}
              tone={scoreTone(summary.ai.score)}
              bar={summary.ai.score}
            />
            <ScoreStat
              label={copy.summaryCards.search}
              value={summary.search.score}
              icon={Search}
              tone={scoreTone(summary.search.score)}
              bar={summary.search.score}
            />
            <ScoreStat
              label={copy.summaryCards.store}
              value={summary.store.score ?? "—"}
              icon={ShoppingBag}
              tone={summary.store.score !== null ? scoreTone(summary.store.score) : undefined}
              bar={summary.store.score ?? undefined}
            />
            <ScoreStat
              label={copy.summaryCards.pages}
              value={summary.health.pagesAnalyzed}
              icon={Globe}
            />
          </div>
        </section>

        {/* Actions */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">{copy.prioritiesTitle}</h2>

          {summary.health.topPriorities.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {summary.health.topPriorities.map((action) => (
                <FixCard key={action.id} action={action} copy={copy} density="compact" />
              ))}
            </div>
          ) : (
            <div className={`${SURFACE} text-sm text-muted-foreground`}>{copy.prioritiesEmpty}</div>
          )}

          {summary.health.strengths.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                {copy.strengthsTitle}
              </span>
              {summary.health.strengths.map((strength) => (
                <span key={strength} className="rounded-full border border-border/70 bg-card px-2.5 py-1 text-xs text-muted-foreground">
                  {strength}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        {/* Crawl remaining pages */}
        {discoveredUrls.length > 0 ? (
          <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4 md:p-5">
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

        {/* Capability modules */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkspaceModuleId)}>
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-2xl border border-border bg-muted/40 p-1">
            {WORKSPACE_MODULES.map((mod) => (
              <TabsTrigger key={mod.id} value={mod.id} className="flex-none gap-1.5 px-3 py-1.5">
                <mod.icon className="h-4 w-4" />
                {copy.modules[mod.id]}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Search & SEO */}
          <TabsContent value="search" className="space-y-4 pt-4">
            <section className={SURFACE}>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <ScoreStat label={copy.metrics.metaCoverage} value={`${summary.search.metaCoverage}%`} icon={Search} tone={scoreTone(summary.search.metaCoverage)} bar={summary.search.metaCoverage} />
                <ScoreStat label={copy.metrics.indexable} value={summary.search.indexablePages} icon={Globe} />
                <ScoreStat label={copy.metrics.brokenLinks} value={summary.search.brokenLinksCount} icon={AlertTriangle} tone={summary.search.brokenLinksCount > 0 ? "text-rose-500" : undefined} />
                <ScoreStat label={copy.metrics.sitemapCoverage} value={`${summary.search.sitemapCoverage}%`} icon={Compass} tone={scoreTone(summary.search.sitemapCoverage)} bar={summary.search.sitemapCoverage} />
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{summary.search.summary}</p>
            </section>

            <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
              <section className={SURFACE}>
                <div className="mb-3 flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">{copy.links.health}</h2>
                  {brokenLinks.length + redirectChains.length > 0 ? (
                    <Badge variant="outline" className="ms-auto">{brokenLinks.length + redirectChains.length}</Badge>
                  ) : null}
                </div>
                {brokenLinks.length === 0 && redirectChains.length === 0 ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {copy.links.allClear}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {brokenLinks.length > 0 ? (
                      <div>
                        <div className="mb-1 text-xs font-medium text-muted-foreground">
                          {copy.links.broken} ({brokenLinks.length})
                        </div>
                        <div className="-mx-2">
                          {brokenLinks.slice(0, 6).map((link) => (
                            <LinkRow
                              key={link.url}
                              href={link.url}
                              label={link.url}
                              badge={
                                <span className="shrink-0 rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-500">
                                  {link.statusCode}
                                </span>
                              }
                              note={link.referringPages.length > 0 ? copy.links.foundOn(link.referringPages.length) : undefined}
                            />
                          ))}
                        </div>
                        {brokenLinks.length > 6 ? (
                          <p className="px-2 pt-1 text-xs text-muted-foreground">{copy.links.more(brokenLinks.length - 6)}</p>
                        ) : null}
                      </div>
                    ) : null}

                    {redirectChains.length > 0 ? (
                      <div>
                        <div className="mb-1 text-xs font-medium text-muted-foreground">
                          {copy.links.redirects} ({redirectChains.length})
                        </div>
                        <div className="-mx-2">
                          {redirectChains.slice(0, 6).map((chain) => (
                            <LinkRow
                              key={chain.from}
                              href={chain.from}
                              label={`${chain.from} → ${chain.to}`}
                              note={copy.links.hops(chain.hops)}
                            />
                          ))}
                        </div>
                        {redirectChains.length > 6 ? (
                          <p className="px-2 pt-1 text-xs text-muted-foreground">{copy.links.more(redirectChains.length - 6)}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )}
              </section>

              <section className={SURFACE}>
                <div className="mb-3 flex items-center gap-2">
                  <Compass className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">{copy.robotsTitle}</h2>
                </div>
                {crawlResult.robotsSitemap ? (
                  <div className="space-y-3">
                    <div className={SURFACE_SUBTLE}>
                      <div className="text-sm font-medium">robots.txt</div>
                      <p className="mt-1 text-xs leading-6 text-muted-foreground">
                        {crawlResult.robotsSitemap.robotsTxt.issues[0] ?? copy.robotsGood}
                      </p>
                    </div>
                    <div className={SURFACE_SUBTLE}>
                      <div className="text-sm font-medium">sitemap.xml</div>
                      <p className="mt-1 text-xs leading-6 text-muted-foreground">
                        {crawlResult.robotsSitemap.sitemap.issues[0] ?? copy.robotsGood}
                      </p>
                    </div>
                    {crawlResult.robotsSitemap.coverage.crawledNotInSitemap.length > 0 ? (
                      <div>
                        <div className="mb-1 text-xs font-medium text-muted-foreground">
                          {copy.links.sitemapMissing} ({crawlResult.robotsSitemap.coverage.crawledNotInSitemap.length})
                        </div>
                        <div className="-mx-2">
                          {crawlResult.robotsSitemap.coverage.crawledNotInSitemap.slice(0, 5).map((url) => (
                            <LinkRow key={url} href={url} label={url} />
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {crawlResult.robotsSitemap.coverage.inSitemapNotCrawled.length > 0 ? (
                      <div>
                        <div className="mb-1 text-xs font-medium text-muted-foreground">
                          {copy.links.sitemapUnreached} ({crawlResult.robotsSitemap.coverage.inSitemapNotCrawled.length})
                        </div>
                        <div className="-mx-2">
                          {crawlResult.robotsSitemap.coverage.inSitemapNotCrawled.slice(0, 5).map((url) => (
                            <LinkRow key={url} href={url} label={url} />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{copy.robotsGood}</p>
                )}
              </section>
            </div>

            <AiRewritesModule
              crawlDocId={crawlResult._id}
              pages={pages}
              copy={copy.aiRewrites}
              locale={locale}
            />
          </TabsContent>

          {/* AI Readiness */}
          <TabsContent value="ai" className="space-y-4 pt-4">
            <section className={SURFACE}>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                <ScoreStat label={copy.metrics.extractable} value={summary.ai.extractablePageCount} icon={Wrench} />
                <ScoreStat label={copy.metrics.botProtected} value={summary.ai.botProtectedPageCount} icon={AlertTriangle} tone={summary.ai.botProtectedPageCount > 0 ? "text-rose-500" : undefined} />
                <ScoreStat label={copy.metrics.structured} value={`${summary.ai.structuredDataCoverage}%`} icon={Briefcase} tone={scoreTone(summary.ai.structuredDataCoverage)} bar={summary.ai.structuredDataCoverage} />
                <ScoreStat label={copy.metrics.language} value={`${summary.ai.languageClarityCoverage}%`} icon={Globe} tone={scoreTone(summary.ai.languageClarityCoverage)} bar={summary.ai.languageClarityCoverage} />
                <ScoreStat label={copy.metrics.readability} value={`${summary.ai.llmReadabilityCoverage}%`} icon={Bot} tone={scoreTone(summary.ai.llmReadabilityCoverage)} bar={summary.ai.llmReadabilityCoverage} />
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{summary.ai.summary}</p>
            </section>

            {botProtectedPages.length > 0 ? (
              <section className={SURFACE}>
                <div className="mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">{copy.links.botProtected}</h2>
                  <Badge variant="outline" className="ms-auto">{botProtectedPages.length}</Badge>
                </div>
                <div className="-mx-2">
                  {botProtectedPages.slice(0, 6).map((page) => (
                    <LinkRow key={page.url} href={page.url} label={page.url} note={page.botProtection} />
                  ))}
                </div>
                {botProtectedPages.length > 6 ? (
                  <p className="px-2 pt-1 text-xs text-muted-foreground">{copy.links.more(botProtectedPages.length - 6)}</p>
                ) : null}
              </section>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-3">
              {summary.ai.topPriorities.map((action) => (
                <FixCard key={action.id} action={action} copy={copy} />
              ))}
            </div>
          </TabsContent>

          {/* Catalog & Commerce */}
          <TabsContent value="commerce" className="space-y-5 pt-4">
            <section className={SURFACE}>
              {summary.store.productCount > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <ScoreStat label={copy.metrics.products} value={summary.store.productCount} icon={ShoppingBag} />
                    <ScoreStat label={copy.metrics.catalogPages} value={summary.store.pagesWithProducts} icon={Globe} />
                    <ScoreStat label={copy.metrics.dataCoverage} value={`${summary.store.productDataCoverage}%`} icon={Gauge} tone={scoreTone(summary.store.productDataCoverage)} bar={summary.store.productDataCoverage} />
                    <ScoreStat label={copy.metrics.schemaCoverage} value={`${summary.store.schemaBackedCoverage}%`} icon={Briefcase} tone={scoreTone(summary.store.schemaBackedCoverage)} bar={summary.store.schemaBackedCoverage} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{summary.store.summary}</p>
                </>
              ) : (
                <div className={DASHED}>
                  <p className="text-sm font-medium">{copy.noStore}</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{copy.noStoreHint}</p>
                </div>
              )}
            </section>

            {summary.store.productCount > 0 ? (
              <PriceStockModule products={products} copy={copy} />
            ) : null}

            {summary.store.productCount > 0 && summary.store.actions.length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-sm font-medium text-muted-foreground">{copy.guidedFixesTitle}</h2>
                <div className="grid gap-4 xl:grid-cols-2">
                  {summary.store.actions.map((action) => (
                    <FixCard key={action.id} action={action} copy={copy} />
                  ))}
                </div>
              </div>
            ) : null}
          </TabsContent>

          {/* Monitoring */}
          <TabsContent value="monitoring" className="pt-4">
            <MonitoringModule copy={copy} pagesAnalyzed={summary.health.pagesAnalyzed} />
          </TabsContent>

          {/* Competitors */}
          <TabsContent value="competitors" className="pt-4">
            <CompetitorsModule copy={copy} />
          </TabsContent>

          {/* Pages (deep dive) */}
          <TabsContent value="pages" className="space-y-5 pt-4">
            <section className={SURFACE}>
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
