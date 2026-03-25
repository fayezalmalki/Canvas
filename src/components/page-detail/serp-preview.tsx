"use client";

import type { PageMetadata } from "@/types/canvas";

interface SerpPreviewProps {
  url: string;
  title: string;
  meta: PageMetadata;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

function charIndicator(length: number, min: number, max: number) {
  if (length === 0) return { color: "text-red-500", label: "Missing" };
  if (length < min) return { color: "text-amber-500", label: "Too short" };
  if (length > max) return { color: "text-amber-500", label: "Too long" };
  return { color: "text-emerald-500", label: "Good" };
}

function buildBreadcrumb(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return u.hostname;
    return u.hostname + " › " + parts.join(" › ");
  } catch {
    return url;
  }
}

function detectRtl(text: string): boolean {
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  return arabicRegex.test(text);
}

export function SerpPreview({ url, title, meta }: SerpPreviewProps) {
  const displayTitle = title || "Untitled Page";
  const description = meta.description || "";
  const isRtl = detectRtl(displayTitle) || detectRtl(description);

  const titleIndicator = charIndicator(displayTitle.length, 30, 60);
  const descIndicator = charIndicator(description.length, 70, 160);
  const breadcrumb = buildBreadcrumb(url);

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          SERP Preview
        </h3>
        <div className="flex items-center gap-3 text-[11px]">
          <span className={titleIndicator.color}>
            Title: {displayTitle.length}/60 — {titleIndicator.label}
          </span>
          <span className={descIndicator.color}>
            Desc: {description.length}/160 — {descIndicator.label}
          </span>
        </div>
      </div>

      {/* Google-style result card */}
      <div
        className="rounded-lg border border-border/50 bg-background p-4 space-y-1"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* URL breadcrumb */}
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
            <svg viewBox="0 0 16 16" className="h-3 w-3 text-muted-foreground">
              <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <text x="8" y="11" textAnchor="middle" fontSize="8" fill="currentColor">
                {(() => {
                  try { return new URL(url).hostname[0].toUpperCase(); } catch { return "?"; }
                })()}
              </text>
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground truncate font-mono">
              {(() => { try { return new URL(url).hostname; } catch { return url; } })()}
            </div>
            <div className="text-[11px] text-muted-foreground/70 truncate">
              {breadcrumb}
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-normal text-blue-500 hover:underline cursor-pointer leading-snug">
          {truncate(displayTitle, 60)}
        </h3>

        {/* Description */}
        {description ? (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {truncate(description, 160)}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground/50 italic">
            No meta description set — Google will auto-generate a snippet from page content
          </p>
        )}
      </div>
    </div>
  );
}
