"use client";

import type { PageSeoData } from "@/types/canvas";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Heading1,
  Image,
  Link2,
  Code,
} from "lucide-react";

function MetaRow({
  label,
  value,
  warning,
}: {
  label: string;
  value: string | null;
  warning?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border last:border-0">
      <div className="w-32 shrink-0 text-xs text-muted-foreground">{label}</div>
      <div className="flex-1 min-w-0">
        {value ? (
          <span className="text-sm break-words">{value}</span>
        ) : (
          <span className="text-sm text-muted-foreground/50 italic flex items-center gap-1">
            {warning && <AlertTriangle className="h-3 w-3 text-amber-500" />}
            Not set
          </span>
        )}
      </div>
    </div>
  );
}

export function SeoOverview({ seo }: { seo: PageSeoData }) {
  const h1Count = seo.headings.filter((h) => h.tag === "h1").length;

  return (
    <div className="space-y-6">
      {/* Quick checks */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QuickCheck
          label="Meta Description"
          pass={!!seo.meta.description}
        />
        <QuickCheck label="Canonical URL" pass={!!seo.meta.canonical} />
        <QuickCheck label="Open Graph" pass={!!seo.meta.ogTitle} />
        <QuickCheck
          label="Structured Data"
          pass={seo.hasStructuredData}
        />
        <QuickCheck label="Single H1" pass={h1Count === 1} />
        <QuickCheck
          label="All Images Have Alt"
          pass={seo.imagesWithoutAlt === 0}
        />
        <QuickCheck label="Viewport Set" pass={!!seo.meta.viewport} />
        <QuickCheck label="Language Set" pass={!!seo.meta.language} />
      </div>

      {/* Meta tags */}
      <div>
        <h3 className="text-sm font-medium mb-2">Meta Tags</h3>
        <div className="rounded-lg border border-border bg-card p-3">
          <MetaRow label="Description" value={seo.meta.description} warning />
          <MetaRow label="Keywords" value={seo.meta.keywords} />
          <MetaRow label="Canonical" value={seo.meta.canonical} />
          <MetaRow label="Robots" value={seo.meta.robots} />
          <MetaRow label="OG Title" value={seo.meta.ogTitle} />
          <MetaRow label="OG Description" value={seo.meta.ogDescription} />
          <MetaRow label="OG Image" value={seo.meta.ogImage} />
          <MetaRow label="Language" value={seo.meta.language} />
        </div>
      </div>

      {/* Heading structure */}
      <div>
        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Heading1 className="h-4 w-4" />
          Heading Structure ({seo.headings.length})
        </h3>
        {seo.headings.length > 0 ? (
          <div className="rounded-lg border border-border bg-card p-3 space-y-1">
            {seo.headings.map((h, i) => {
              const indent = parseInt(h.tag[1]) - 1;
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm"
                  style={{ paddingLeft: `${indent * 16}px` }}
                >
                  <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono shrink-0">
                    {h.tag}
                  </Badge>
                  <span className="truncate">{h.text}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No headings found</p>
        )}
      </div>

      {/* Stats row */}
      <div className="flex gap-6 text-sm">
        <div className="flex items-center gap-1.5">
          <Image className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{seo.imageCount} images</span>
          {seo.imagesWithoutAlt > 0 && (
            <span className="text-amber-500">
              ({seo.imagesWithoutAlt} missing alt)
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{seo.internalLinkCount} internal, {seo.externalLinkCount} external</span>
        </div>
        {seo.hasStructuredData && (
          <div className="flex items-center gap-1.5">
            <Code className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Has structured data</span>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickCheck({ label, pass }: { label: string; pass: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
      {pass ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
      )}
      <span className="text-xs">{label}</span>
    </div>
  );
}
