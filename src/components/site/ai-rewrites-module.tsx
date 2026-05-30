"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { CrawlPageResult } from "@/types/canvas";
import { scoreSeo } from "@/lib/seo-scorer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SURFACE, DASHED } from "@/components/site/workspace-cards";
import { Bot, Check, Copy, Loader2, Sparkles } from "lucide-react";

export interface RewritesCopy {
  title: string;
  description: string;
  noWeakPages: string;
  generate: string;
  regenerate: string;
  generating: string;
  fTitle: string;
  fDescription: string;
  fAlt: string;
  fSchema: string;
  copy: string;
  copied: string;
  noKey: string;
}

interface FixDoc {
  pageUrl: string;
  locale: "en" | "ar";
  title: string;
  metaDescription: string;
  altTextSuggestions: { imageHint: string; alt: string }[];
  jsonLd: { type: string; json: string };
  provider: string | null;
}

function CopyButton({ text, copy }: { text: string; copy: RewritesCopy }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      {done ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? copy.copied : copy.copy}
    </button>
  );
}

function FixField({ label, value, copy }: { label: string; value: string; copy: RewritesCopy }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {label} · {value.length}
        </span>
        <CopyButton text={value} copy={copy} />
      </div>
      <p className="text-sm leading-6 text-foreground/90" dir="auto">{value}</p>
    </div>
  );
}

export function AiRewritesModule({
  crawlDocId,
  pages,
  copy,
  locale,
}: {
  crawlDocId: string | undefined;
  pages: CrawlPageResult[];
  copy: RewritesCopy;
  locale: "en" | "ar";
}) {
  const storePageFix = useMutation(api.crawls.storePageFix);
  const existing = useQuery(
    api.crawls.listPageFixesForCrawl,
    crawlDocId ? { crawlId: crawlDocId as Id<"crawls"> } : "skip"
  );
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [noKey, setNoKey] = useState(false);

  const fixByUrl = useMemo(() => {
    const map = new Map<string, FixDoc>();
    for (const f of existing ?? []) {
      if (f.locale === locale) map.set(f.pageUrl, f as FixDoc);
    }
    return map;
  }, [existing, locale]);

  const weakPages = useMemo(() => {
    return pages
      .map((page) => ({ page, score: scoreSeo({ url: page.url, title: page.title, seo: page.seo }).score }))
      .filter(({ page, score }) =>
        score < 75 || !page.seo.meta.description || !page.title || page.title.length < 30 || page.title.length > 60
      )
      .sort((a, b) => a.score - b.score)
      .slice(0, 8);
  }, [pages]);

  async function generate(page: CrawlPageResult) {
    if (!crawlDocId) return;
    setPending((s) => ({ ...s, [page.url]: true }));
    try {
      const res = await fetch("/api/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: page.url, title: page.title, bodyText: page.bodyText, seo: page.seo, locale }),
      });
      const data = await res.json();
      if (!data.fixes) {
        setNoKey(true);
        return;
      }
      await storePageFix({
        crawlId: crawlDocId as Id<"crawls">,
        pageUrl: page.url,
        locale,
        title: String(data.fixes.title ?? ""),
        metaDescription: String(data.fixes.metaDescription ?? ""),
        altTextSuggestions: Array.isArray(data.fixes.altTextSuggestions) ? data.fixes.altTextSuggestions : [],
        jsonLd: data.fixes.jsonLd ?? { type: "", json: "" },
        provider: data.provider ?? null,
      });
    } catch {
      /* keep row in un-generated state */
    } finally {
      setPending((s) => ({ ...s, [page.url]: false }));
    }
  }

  if (weakPages.length === 0) {
    return (
      <div className={DASHED}>
        <div className="mb-2 flex items-center gap-2.5">
          <div className="rounded-xl bg-muted p-1.5"><Bot className="h-4 w-4 text-muted-foreground" /></div>
          <h3 className="font-semibold">{copy.title}</h3>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{copy.noWeakPages}</p>
      </div>
    );
  }

  return (
    <section className={SURFACE}>
      <div className="mb-1 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">{copy.title}</h2>
      </div>
      <p className="mb-4 text-sm leading-6 text-muted-foreground">{copy.description}</p>

      {noKey ? (
        <div className={`${DASHED} mb-4`}>
          <p className="text-sm leading-6 text-muted-foreground">{copy.noKey}</p>
        </div>
      ) : null}

      <div className="space-y-3">
        {weakPages.map(({ page, score }) => {
          const fix = fixByUrl.get(page.url);
          const isPending = pending[page.url];
          return (
            <div key={page.url} className="rounded-2xl border border-border/70 bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium" dir="auto">{page.title || page.url}</div>
                  <div className="truncate font-mono text-[11px] text-muted-foreground" dir="ltr">{page.url}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline">{score}</Badge>
                  <Button variant="outline" size="sm" onClick={() => generate(page)} disabled={isPending || !crawlDocId}>
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {isPending ? copy.generating : fix ? copy.regenerate : copy.generate}
                  </Button>
                </div>
              </div>

              {fix ? (
                <div className="mt-3 space-y-2.5 border-t border-border/60 pt-3">
                  <FixField label={copy.fTitle} value={fix.title} copy={copy} />
                  <FixField label={copy.fDescription} value={fix.metaDescription} copy={copy} />
                  {fix.altTextSuggestions.length > 0 ? (
                    <div>
                      <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{copy.fAlt}</div>
                      <ul className="space-y-1">
                        {fix.altTextSuggestions.map((a, i) => (
                          <li key={i} className="text-xs leading-6 text-foreground/80" dir="auto">• {a.alt}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {fix.jsonLd?.json ? (
                    <div>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          {copy.fSchema} · {fix.jsonLd.type}
                        </span>
                        <CopyButton text={fix.jsonLd.json} copy={copy} />
                      </div>
                      <pre dir="ltr" className="max-h-44 overflow-auto rounded-xl bg-muted/60 p-3 font-mono text-[10px] leading-5 text-foreground/80">{fix.jsonLd.json}</pre>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
