"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { CrawlPageResult } from "@/types/canvas";
import { scoreAeo } from "@/lib/aeo-scorer";
import { scoreSeo } from "@/lib/seo-scorer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreStat, FixCard, SURFACE, DASHED } from "@/components/site/workspace-cards";
import type { WorkspaceCopy } from "@/components/site/site-workspace";
import { Bot, Briefcase, Gauge, Globe, Loader2, MessagesSquare, Sparkles } from "lucide-react";

type Cite = "yes" | "partly" | "no";

interface AeoTestDoc {
  pageUrl: string;
  locale: "en" | "ar";
  whatItOffers: string;
  couldCiteConfidently: Cite;
  confidence: number;
  missingForCitation: string[];
  detectedEntities: string[];
}

function scoreTone(s: number) {
  return s >= 80 ? "text-emerald-500" : s >= 55 ? "text-amber-500" : "text-rose-500";
}
function citeTone(c: Cite) {
  return c === "yes"
    ? "text-emerald-500 border-emerald-500/30"
    : c === "partly"
    ? "text-amber-500 border-amber-500/30"
    : "text-rose-500 border-rose-500/30";
}

export function AiVisibilityPanel({
  crawlDocId,
  pages,
  copy,
  locale,
}: {
  crawlDocId: string | undefined;
  pages: CrawlPageResult[];
  copy: WorkspaceCopy;
  locale: "en" | "ar";
}) {
  const c = copy.aiVisibility;
  const aeo = useMemo(() => scoreAeo(pages), [pages]);
  const storeAeoTest = useMutation(api.crawls.storeAeoTest);
  const tests = useQuery(
    api.crawls.listAeoTestsForCrawl,
    crawlDocId ? { crawlId: crawlDocId as Id<"crawls"> } : "skip"
  );
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [noKey, setNoKey] = useState(false);

  const testByUrl = useMemo(() => {
    const m = new Map<string, AeoTestDoc>();
    for (const t of tests ?? []) if (t.locale === locale) m.set(t.pageUrl, t as AeoTestDoc);
    return m;
  }, [tests, locale]);

  const testPages = useMemo(
    () =>
      [...pages]
        .sort(
          (a, b) =>
            scoreSeo({ url: b.url, title: b.title, seo: b.seo }).score -
            scoreSeo({ url: a.url, title: a.title, seo: a.seo }).score
        )
        .slice(0, 8),
    [pages]
  );

  async function runTest(page: CrawlPageResult) {
    if (!crawlDocId) return;
    setPending((s) => ({ ...s, [page.url]: true }));
    try {
      const res = await fetch("/api/aeo-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: page.url, title: page.title, bodyText: page.bodyText, headings: page.seo.headings, locale }),
      });
      const data = await res.json();
      if (!data.result) {
        setNoKey(true);
        return;
      }
      await storeAeoTest({
        crawlId: crawlDocId as Id<"crawls">,
        pageUrl: page.url,
        locale,
        whatItOffers: String(data.result.whatItOffers ?? ""),
        couldCiteConfidently: (data.result.couldCiteConfidently ?? "no") as Cite,
        confidence: Number(data.result.confidence ?? 0),
        missingForCitation: Array.isArray(data.result.missingForCitation) ? data.result.missingForCitation : [],
        detectedEntities: Array.isArray(data.result.detectedEntities) ? data.result.detectedEntities : [],
      });
    } catch {
      /* keep row untested */
    } finally {
      setPending((s) => ({ ...s, [page.url]: false }));
    }
  }

  const citeLabel: Record<Cite, string> = { yes: c.citeYes, partly: c.citePartly, no: c.citeNo };

  return (
    <div className="space-y-4">
      <section className={SURFACE}>
        <div className="mb-1 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">{c.title}</h2>
        </div>
        <p className="mb-4 text-sm leading-6 text-muted-foreground">{c.description}</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <ScoreStat label={c.scoreLabel} value={aeo.score} icon={Gauge} tone={scoreTone(aeo.score)} bar={aeo.score} />
          <ScoreStat label={c.sigSchema} value={`${aeo.schemaCoverage}%`} icon={Briefcase} tone={scoreTone(aeo.schemaCoverage)} bar={aeo.schemaCoverage} />
          <ScoreStat label={c.sigFaq} value={aeo.hasFaq ? c.faqYes : c.faqNo} icon={MessagesSquare} tone={aeo.hasFaq ? "text-emerald-500" : "text-amber-500"} />
          <ScoreStat label={c.sigClarity} value={`${aeo.clarityCoverage}%`} icon={Bot} tone={scoreTone(aeo.clarityCoverage)} bar={aeo.clarityCoverage} />
          <ScoreStat label={c.sigExtractable} value={`${aeo.extractableCoverage}%`} icon={Globe} tone={scoreTone(aeo.extractableCoverage)} bar={aeo.extractableCoverage} />
        </div>
      </section>

      {aeo.actions.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">{c.actionsTitle}</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {aeo.actions.map((a) => (
              <FixCard key={a.id} action={a} copy={copy} density="compact" />
            ))}
          </div>
        </div>
      ) : null}

      <section className={SURFACE}>
        <div className="mb-1 flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">{c.testTitle}</h2>
        </div>
        <p className="mb-3 text-sm leading-6 text-muted-foreground">{c.testDescription}</p>
        {noKey ? (
          <div className={`${DASHED} mb-3`}>
            <p className="text-sm leading-6 text-muted-foreground">{c.noKey}</p>
          </div>
        ) : null}
        <div className="space-y-2.5">
          {testPages.map((page) => {
            const t = testByUrl.get(page.url);
            const isPending = pending[page.url];
            return (
              <div key={page.url} className="rounded-2xl border border-border/70 bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium" dir="auto">{page.title || page.url}</div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground" dir="ltr">{page.url}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {t ? (
                      <Badge variant="outline" className={citeTone(t.couldCiteConfidently)}>
                        {citeLabel[t.couldCiteConfidently]} · {t.confidence}
                      </Badge>
                    ) : null}
                    <Button variant="outline" size="sm" onClick={() => runTest(page)} disabled={isPending || !crawlDocId}>
                      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      {isPending ? c.running : t ? c.retest : c.run}
                    </Button>
                  </div>
                </div>
                {t ? (
                  <div className="mt-3 space-y-2 border-t border-border/60 pt-3 text-sm">
                    <p className="leading-6 text-foreground/85" dir="auto">
                      <span className="text-muted-foreground">{c.whatItOffers}: </span>
                      {t.whatItOffers}
                    </p>
                    {t.missingForCitation.length > 0 ? (
                      <div>
                        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{c.missing}</div>
                        <ul className="mt-1 space-y-1">
                          {t.missingForCitation.map((m, i) => (
                            <li key={i} className="text-xs leading-6 text-foreground/80" dir="auto">• {m}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {t.detectedEntities.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {t.detectedEntities.map((e, i) => (
                          <span key={i} className="rounded-full border border-border/70 bg-card px-2 py-0.5 text-[11px] text-muted-foreground" dir="auto">{e}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
