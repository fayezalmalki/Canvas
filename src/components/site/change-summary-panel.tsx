"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useLocale } from "@/context/locale-context";
import { SURFACE, ScoreStat } from "@/components/site/workspace-cards";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  FilePlus2,
  FileMinus2,
  Unlink,
  Link2,
  Pencil,
  AlignLeft,
  CircleCheck,
  Radar,
} from "lucide-react";

function getDiffCopy(locale: "en" | "ar") {
  if (locale === "ar") {
    return {
      heading: "ما الذي تغيّر",
      baselineTitle: "هذه أول لقطة للموقع",
      baselineBody:
        "حفظنا هذا الفحص كنقطة أساس. عند إعادة فحص الموقع لاحقاً سنعرض لك هنا كل ما تغيّر منذ الآن.",
      noChangesTitle: "لا تغييرات مهمة",
      noChangesBody: (n: number) => `قارنّا هذا الفحص مع الفحص السابق (${n} لقطة محفوظة) ولم نجد تغييرات تستحق الانتباه.`,
      comparing: "مقارنة مع الفحص السابق",
      ago: "منذ",
      stats: {
        pages: "إجمالي الصفحات",
        newPages: "صفحات جديدة",
        removedPages: "صفحات مفقودة",
        newBroken: "روابط مكسورة جديدة",
      },
      pagesAdded: "صفحات جديدة",
      pagesRemoved: "صفحات لم تعد موجودة",
      brokenAdded: "روابط مكسورة جديدة",
      brokenResolved: "روابط تم إصلاحها",
      titleChanges: "عناوين تغيّرت",
      contentChanges: "تغيّر كبير في المحتوى",
      words: "كلمة",
      andMore: (n: number) => `و${n} أخرى`,
      loading: "نحسب التغييرات…",
    };
  }
  return {
    heading: "What changed",
    baselineTitle: "This is the site's first snapshot",
    baselineBody:
      "We saved this crawl as a baseline. The next time you audit this site, everything that changed since now will show up here.",
    noChangesTitle: "No meaningful changes",
    noChangesBody: (n: number) => `We compared this crawl with the previous one (${n} snapshots saved) and found nothing worth flagging.`,
    comparing: "Compared with the previous crawl",
    ago: "",
    stats: {
      pages: "Total pages",
      newPages: "New pages",
      removedPages: "Missing pages",
      newBroken: "New broken links",
    },
    pagesAdded: "New pages",
    pagesRemoved: "Pages no longer found",
    brokenAdded: "New broken links",
    brokenResolved: "Broken links fixed",
    titleChanges: "Titles changed",
    contentChanges: "Major content changes",
    words: "words",
    andMore: (n: number) => `and ${n} more`,
    loading: "Computing changes…",
  };
}

function timeAgo(ts: number, locale: "en" | "ar"): string {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor(diff / 3_600_000);
  if (locale === "ar") {
    if (days >= 1) return `${days} يوم`;
    if (hours >= 1) return `${hours} ساعة`;
    return "أقل من ساعة";
  }
  if (days >= 1) return `${days}d ago`;
  if (hours >= 1) return `${hours}h ago`;
  return "just now";
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === "/" ? u.hostname : u.pathname;
  } catch {
    return url;
  }
}

const MAX_ROWS = 8;

function UrlList({
  urls,
  icon: Icon,
  title,
  tone,
  andMore,
}: {
  urls: string[];
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tone: string;
  andMore: (n: number) => string;
}) {
  if (urls.length === 0) return null;
  const shown = urls.slice(0, MAX_ROWS);
  const extra = urls.length - shown.length;
  return (
    <div className={SURFACE}>
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${tone}`} />
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="outline" className="ms-auto">{urls.length}</Badge>
      </div>
      <ul className="space-y-1.5">
        {shown.map((url) => (
          <li key={url} className="truncate font-mono text-xs text-muted-foreground" dir="ltr" title={url}>
            {shortUrl(url)}
          </li>
        ))}
      </ul>
      {extra > 0 ? <p className="mt-2 text-xs text-muted-foreground/70">{andMore(extra)}</p> : null}
    </div>
  );
}

export function ChangeSummaryPanel({ slug }: { slug: string }) {
  const { locale } = useLocale();
  const copy = getDiffCopy(locale);
  const diff = useQuery(api.crawls.getCrawlDiff, { slug });

  if (diff === undefined) {
    return (
      <div className={SURFACE}>
        <p className="text-sm text-muted-foreground">{copy.loading}</p>
      </div>
    );
  }
  if (diff === null) return null;

  // First-ever crawl of this site — nothing to compare against yet.
  if (!diff.hasPrevious) {
    return (
      <section className={SURFACE}>
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-muted p-1.5">
            <Radar className="h-4 w-4 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">{copy.baselineTitle}</h3>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.baselineBody}</p>
      </section>
    );
  }

  if (!diff.hasMeaningfulChanges) {
    return (
      <section className={SURFACE}>
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-emerald-500/10 p-1.5">
            <CircleCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <h3 className="font-semibold">{copy.noChangesTitle}</h3>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {copy.noChangesBody(diff.totalSnapshots)}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className={SURFACE}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">{copy.heading}</h2>
          {diff.previous ? (
            <Badge variant="outline" className="ms-auto font-normal">
              {copy.comparing} · {timeAgo(diff.previous.createdAt, locale)}
            </Badge>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <ScoreStat
            label={copy.stats.pages}
            value={diff.current.pagesCount}
            note={diff.pagesCountDelta !== 0 ? `${diff.pagesCountDelta > 0 ? "+" : ""}${diff.pagesCountDelta}` : undefined}
            icon={AlignLeft}
          />
          <ScoreStat
            label={copy.stats.newPages}
            value={diff.pagesAdded.length}
            icon={FilePlus2}
            tone={diff.pagesAdded.length > 0 ? "text-emerald-500" : undefined}
          />
          <ScoreStat
            label={copy.stats.removedPages}
            value={diff.pagesRemoved.length}
            icon={FileMinus2}
            tone={diff.pagesRemoved.length > 0 ? "text-amber-500" : undefined}
          />
          <ScoreStat
            label={copy.stats.newBroken}
            value={diff.brokenLinksAdded.length}
            icon={Unlink}
            tone={diff.brokenLinksAdded.length > 0 ? "text-rose-500" : undefined}
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <UrlList urls={diff.pagesAdded} icon={FilePlus2} title={copy.pagesAdded} tone="text-emerald-500" andMore={copy.andMore} />
        <UrlList urls={diff.pagesRemoved} icon={FileMinus2} title={copy.pagesRemoved} tone="text-amber-500" andMore={copy.andMore} />
        <UrlList urls={diff.brokenLinksAdded.map((b) => b.url)} icon={Unlink} title={copy.brokenAdded} tone="text-rose-500" andMore={copy.andMore} />
        <UrlList urls={diff.brokenLinksResolved.map((b) => b.url)} icon={Link2} title={copy.brokenResolved} tone="text-emerald-500" andMore={copy.andMore} />
      </div>

      {diff.titleChanges.length > 0 ? (
        <section className={SURFACE}>
          <div className="mb-3 flex items-center gap-2">
            <Pencil className="h-4 w-4 text-sky-500" />
            <h3 className="text-sm font-semibold">{copy.titleChanges}</h3>
            <Badge variant="outline" className="ms-auto">{diff.titleChanges.length}</Badge>
          </div>
          <ul className="space-y-3">
            {diff.titleChanges.slice(0, MAX_ROWS).map((change) => (
              <li key={change.url} className="space-y-1">
                <div className="truncate font-mono text-xs text-muted-foreground/70" dir="ltr" title={change.url}>
                  {shortUrl(change.url)}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground line-through" dir="auto">{change.before || "—"}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                  <span className="font-medium" dir="auto">{change.after || "—"}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {diff.contentChanges.length > 0 ? (
        <section className={SURFACE}>
          <div className="mb-3 flex items-center gap-2">
            <AlignLeft className="h-4 w-4 text-sky-500" />
            <h3 className="text-sm font-semibold">{copy.contentChanges}</h3>
            <Badge variant="outline" className="ms-auto">{diff.contentChanges.length}</Badge>
          </div>
          <ul className="space-y-2">
            {diff.contentChanges.slice(0, MAX_ROWS).map((change) => (
              <li key={change.url} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground" dir="ltr" title={change.url}>
                  {shortUrl(change.url)}
                </span>
                <span className={`shrink-0 font-mono text-xs ${change.deltaWords > 0 ? "text-emerald-500" : "text-amber-500"}`}>
                  {change.deltaWords > 0 ? "+" : ""}{change.deltaWords} {copy.words}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
