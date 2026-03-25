"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Globe,
  Loader2,
  Search,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface CrawledPage {
  url: string;
  title: string;
}

export default function Home() {
  const router = useRouter();
  const storeCrawl = useMutation(api.crawls.storeCrawlResult);
  const [url, setUrl] = useState("");
  const [maxDepth, setMaxDepth] = useState(2);
  const [maxPages, setMaxPages] = useState(20);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [crawledPages, setCrawledPages] = useState<CrawledPage[]>([]);
  const [crawlCount, setCrawlCount] = useState({ current: 0, total: 20 });
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCrawledPages([]);
    setCrawlCount({ current: 0, total: maxPages });

    let normalizedUrl = url.trim();
    if (!normalizedUrl) return;
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    setCrawling(true);

    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl, maxDepth, maxPages }),
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
              setCrawlCount({ current: event.index, total: event.total });
            } else if (event.type === "complete" && event.result) {
              await storeCrawl({
                rootUrl: normalizedUrl,
                pages: event.result.pages,
              });
              router.push(`/site/${encodeURIComponent(normalizedUrl)}`);
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
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Globe className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Site Analyzer</h1>
          </div>
          <p className="text-muted-foreground">
            Crawl any website to analyze its SEO, content structure, and features
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="example.com"
              className="h-12 pl-10 text-base font-mono"
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
              Advanced options
            </button>
          )}

          {showAdvanced && !crawling && (
            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <label className="text-xs text-muted-foreground">
                  Max Depth
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
                  Max Pages
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
                Crawling...
              </>
            ) : (
              "Analyze Site"
            )}
          </Button>
        </form>

        {/* Live crawl progress */}
        {crawling && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Crawled {crawlCount.current} of {crawlCount.total} pages
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {progressPercent}%
              </span>
            </div>
            <Progress value={progressPercent} />

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
                    <span className="ml-auto text-muted-foreground/50 font-mono text-[10px] truncate max-w-[120px]">
                      {new URL(page.url).pathname}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
              This may take a few minutes depending on the site size
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
