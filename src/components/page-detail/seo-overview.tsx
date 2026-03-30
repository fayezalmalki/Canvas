"use client";

import type { PageSeoData, ProductData } from "@/types/canvas";
import { useLocale } from "@/context/locale-context";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Heading1,
  Image,
  Link2,
  Code,
  ShoppingCart,
  Star,
  Tag,
} from "lucide-react";

function MetaRow({
  label,
  value,
  warning,
  notSetLabel,
}: {
  label: string;
  value: string | null;
  warning?: boolean;
  notSetLabel: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border last:border-0">
      <div className="w-32 shrink-0 text-xs text-muted-foreground">{label}</div>
      <div className="flex-1 min-w-0">
        {value ? (
          <span className="text-sm break-words" dir="auto">{value}</span>
        ) : (
          <span className="text-sm text-muted-foreground/50 italic flex items-center gap-1">
            {warning && <AlertTriangle className="h-3 w-3 text-amber-500" />}
            {notSetLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export function SeoOverview({ seo, products }: { seo: PageSeoData; products?: ProductData[] }) {
  const { t } = useLocale();
  const h1Count = seo.headings.filter((h) => h.tag === "h1").length;
  const notSet = t("seo.notSet");

  return (
    <div className="space-y-6">
      {/* Quick checks */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QuickCheck label={t("seo.metaDesc")} pass={!!seo.meta.description} />
        <QuickCheck label={t("seo.canonicalUrl")} pass={!!seo.meta.canonical} />
        <QuickCheck label={t("seo.openGraph")} pass={!!seo.meta.ogTitle} />
        <QuickCheck label={t("seo.structuredData")} pass={seo.hasStructuredData} />
        <QuickCheck label={t("seo.singleH1")} pass={h1Count === 1} />
        <QuickCheck label={t("seo.allImagesAlt")} pass={seo.imagesWithoutAlt === 0} />
        <QuickCheck label={t("seo.viewportSet")} pass={!!seo.meta.viewport} />
        <QuickCheck label={t("seo.languageSet")} pass={!!seo.meta.language} />
      </div>

      {/* Meta tags */}
      <div>
        <h3 className="text-sm font-medium mb-2">{t("seo.metaTags")}</h3>
        <div className="rounded-lg border border-border bg-card p-3">
          <MetaRow label={t("seo.metaDescription")} value={seo.meta.description} warning notSetLabel={notSet} />
          <MetaRow label={t("seo.keywords")} value={seo.meta.keywords} notSetLabel={notSet} />
          <MetaRow label={t("seo.canonical")} value={seo.meta.canonical} notSetLabel={notSet} />
          <MetaRow label={t("seo.robots")} value={seo.meta.robots} notSetLabel={notSet} />
          <MetaRow label={t("seo.ogTitle")} value={seo.meta.ogTitle} notSetLabel={notSet} />
          <MetaRow label={t("seo.ogDescription")} value={seo.meta.ogDescription} notSetLabel={notSet} />
          <MetaRow label={t("seo.ogImage")} value={seo.meta.ogImage} notSetLabel={notSet} />
          {seo.meta.ogImage && (
            <div className="py-2 border-b border-border last:border-0">
              <div className="w-32 shrink-0 text-xs text-muted-foreground mb-2">{t("seo.ogImagePreview")}</div>
              <div className="rounded-md border border-border overflow-hidden bg-muted max-w-sm">
                <img
                  src={seo.meta.ogImage}
                  alt="Open Graph preview"
                  className="w-full h-auto object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                  }}
                />
                <div className="hidden flex items-center justify-center py-4 text-xs text-muted-foreground">
                  {t("seo.ogImageFailed")}
                </div>
              </div>
            </div>
          )}
          <MetaRow label={t("seo.language")} value={seo.meta.language} notSetLabel={notSet} />
        </div>
      </div>

      {/* Heading structure */}
      <div>
        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Heading1 className="h-4 w-4" />
          {t("seo.headingStructure")} ({seo.headings.length})
        </h3>
        {seo.headings.length > 0 ? (
          <div className="rounded-lg border border-border bg-card p-3 space-y-1">
            {seo.headings.map((h, i) => {
              const indent = parseInt(h.tag[1]) - 1;
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm"
                  style={{ paddingInlineStart: `${indent * 16}px` }}
                >
                  <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono shrink-0">
                    {h.tag}
                  </Badge>
                  <span className="truncate" dir="auto">{h.text}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No headings found</p>
        )}
      </div>

      {/* Stats row */}
      <div className="flex gap-6 text-sm flex-wrap">
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
            <span>{t("seo.hasStructuredData")}</span>
          </div>
        )}
      </div>

      {/* Performance */}
      {seo.performance && (
        <div>
          <h3 className="text-sm font-medium mb-2">{t("seo.performance")}</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <PerfStat
              label={t("seo.responseTime")}
              value={`${seo.performance.responseTimeMs}ms`}
              warning={seo.performance.responseTimeMs > 3000}
            />
            <PerfStat
              label={t("seo.htmlSize")}
              value={formatBytes(seo.performance.htmlSizeBytes)}
              warning={seo.performance.htmlSizeBytes > 200 * 1024}
            />
            <PerfStat
              label={t("seo.compression")}
              value={seo.performance.hasCompression ? t("seo.yes") : t("seo.no")}
              warning={!seo.performance.hasCompression}
            />
            <PerfStat
              label={t("seo.cacheControl")}
              value={seo.performance.cacheControl ? t("seo.set") : t("seo.notSet")}
              warning={!seo.performance.cacheControl}
            />
          </div>
          {seo.performance.serverHeader && (
            <div className="mt-2 text-[11px] text-muted-foreground">
              {t("seo.server")} {seo.performance.serverHeader}
            </div>
          )}
        </div>
      )}

      {/* i18n / RTL */}
      {seo.i18n && (seo.i18n.hasArabicContent || seo.i18n.hreflangLinks.length > 0 || seo.i18n.dir) && (
        <div>
          <h3 className="text-sm font-medium mb-2">{t("seo.i18n")}</h3>
          <div className="rounded-lg border border-border bg-card p-3 space-y-2">
            <div className="flex gap-4 text-xs">
              {seo.i18n.dir && (
                <span>{t("seo.direction")} <strong>{seo.i18n.dir.toUpperCase()}</strong></span>
              )}
              {seo.i18n.hasArabicContent && (
                <span>{t("seo.arabicContent")} <strong>{Math.round(seo.i18n.arabicRatio * 100)}%</strong></span>
              )}
            </div>
            {seo.i18n.hasArabicContent && seo.i18n.dir !== "rtl" && (
              <div className="text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {t("seo.arabicNoRtl")}
              </div>
            )}
            {seo.i18n.hreflangLinks.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{t("seo.hreflang")}</div>
                {seo.i18n.hreflangLinks.map((link, i) => (
                  <div key={i} className="text-[11px] font-mono flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-1 py-0">{link.lang}</Badge>
                    <span className="truncate text-muted-foreground">{link.url}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Structured Data Details */}
      {seo.structuredData && seo.structuredData.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">{t("seo.structuredData")}</h3>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {seo.structuredData.map((entry, i) => (
              <div key={i} className="p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-emerald-500 border-emerald-500/30">
                    {entry.type}
                  </Badge>
                  {entry.issues.length > 0 && (
                    <span className="text-[11px] text-amber-500">
                      {entry.issues.length} issue{entry.issues.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {entry.issues.map((issue, j) => (
                  <div key={j} className="text-[11px] text-amber-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {issue}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products */}
      {products && products.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            {t("seo.productsLabel")} ({products.length})
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {products.map((product, i) => {
              const hasDiscount = product.discountPercent && product.discountPercent > 0;
              return (
                <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-2">
                  <div className="flex items-start gap-3">
                    {product.imageUrl && (
                      <div className="w-12 h-12 rounded bg-muted overflow-hidden shrink-0 relative">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium line-clamp-2" dir="auto">{product.name}</div>
                      {product.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5" dir="auto">{product.description}</p>
                      )}
                      {product.price && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-sm font-semibold font-mono ${hasDiscount ? "text-red-500" : ""}`}>
                            {product.currency && <span className="text-xs text-muted-foreground me-0.5">{product.currency}</span>}
                            {product.price}
                          </span>
                          {product.originalPrice && product.originalPrice !== product.price && (
                            <span className="text-xs text-muted-foreground line-through font-mono">
                              {product.originalPrice}
                            </span>
                          )}
                          {hasDiscount && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 text-red-500 border-red-500/30 font-bold">
                              -{product.discountPercent}%
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {product.availability && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${
                          product.availability === "InStock" || product.availability === "LimitedAvailability"
                            ? "text-emerald-500 border-emerald-500/30"
                            : product.availability === "OutOfStock" || product.availability === "Discontinued"
                              ? "text-red-500 border-red-500/30"
                              : product.availability === "PreOrder" || product.availability === "BackOrder"
                                ? "text-blue-500 border-blue-500/30"
                                : ""
                        }`}
                      >
                        {product.availability === "InStock" ? t("seo.inStock")
                          : product.availability === "OutOfStock" ? t("seo.outOfStock")
                          : product.availability === "LimitedAvailability" ? t("seo.limited")
                          : product.availability}
                      </Badge>
                    )}
                    {product.category && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {product.category}
                      </Badge>
                    )}
                    {product.brand && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        <Tag className="h-2.5 w-2.5 me-0.5" />{product.brand}
                      </Badge>
                    )}
                    {product.rating && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-500 border-amber-500/30">
                        <Star className="h-2.5 w-2.5 me-0.5 fill-amber-500" />{product.rating}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                      {product.source}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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

function PerfStat({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-sm font-mono font-medium ${warning ? "text-amber-500" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
