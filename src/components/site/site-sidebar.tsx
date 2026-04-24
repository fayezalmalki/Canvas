"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSiteContext } from "@/context/site-context";
import { useLocale } from "@/context/locale-context";
import { sitePageUrl } from "@/lib/navigation";
import { buildUrlTree, filterTree } from "@/lib/url-tree";
import { deduplicatePages } from "@/lib/dedup-pages";
import { UrlTree } from "./url-tree";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, Search, FileText, ShoppingCart, Radar, Target } from "lucide-react";
import type { ProductData } from "@/types/canvas";

type SidebarTab = "pages" | "products";

interface ProductWithPage extends ProductData {
  pageUrl: string;
  pageTitle: string;
}

export function SiteSidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const { crawlId, crawlResult } = useSiteContext();
  const { t, locale } = useLocale();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<SidebarTab>("pages");
  const router = useRouter();

  const dedupedPages = useMemo(() => {
    if (!crawlResult) return [];
    return deduplicatePages(crawlResult.pages);
  }, [crawlResult]);

  const tree = useMemo(() => {
    if (dedupedPages.length === 0) return null;
    return buildUrlTree(dedupedPages);
  }, [dedupedPages]);

  const filteredTree = useMemo(() => {
    if (!tree) return null;
    if (!search.trim()) return tree;
    return filterTree(tree, search.trim());
  }, [tree, search]);

  // Aggregate all products across pages
  const allProducts = useMemo(() => {
    const products: ProductWithPage[] = [];
    for (const page of dedupedPages) {
      if (page.products && page.products.length > 0) {
        for (const p of page.products) {
          products.push({
            ...p,
            pageUrl: page.url,
            pageTitle: page.title || page.url,
          });
        }
      }
    }
    return products;
  }, [dedupedPages]);

  const hasProducts = allProducts.length > 0;

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return allProducts;
    const q = search.toLowerCase();
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
    );
  }, [allProducts, search]);

  // Group products by page
  const productsByPage = useMemo(() => {
    const grouped = new Map<string, { title: string; url: string; products: ProductWithPage[] }>();
    for (const p of filteredProducts) {
      const existing = grouped.get(p.pageUrl);
      if (existing) {
        existing.products.push(p);
      } else {
        grouped.set(p.pageUrl, { title: p.pageTitle, url: p.pageUrl, products: [p] });
      }
    }
    return Array.from(grouped.values());
  }, [filteredProducts]);

  if (!crawlResult) return null;

  function navigateToPage(url: string) {
    router.push(sitePageUrl(crawlId, url));
    onNavigate?.();
  }

  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      <div className="border-b border-border p-3 space-y-2">
        {/* Tab toggle: Pages / Products */}
        {hasProducts ? (
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setTab("pages")}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium transition-colors ${
                tab === "pages"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-3 w-3" />
              {t("sidebar.pages")}
            </button>
            <button
              onClick={() => setTab("products")}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium transition-colors ${
                tab === "products"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShoppingCart className="h-3 w-3" />
              {t("sidebar.products")}
              <Badge variant="outline" className="text-[9px] px-1 py-0 ml-0.5">
                {allProducts.length}
              </Badge>
            </button>
          </div>
        ) : (
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t("sidebar.sitemap")}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === "pages" ? "Filter pages..." : "Search products..."}
            className="h-7 pl-7 text-xs"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {tab === "pages"
            ? `${dedupedPages.length} pages crawled`
            : `${filteredProducts.length} products found`}
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        {tab === "pages" ? (
          filteredTree ? (
            <UrlTree node={filteredTree} onNavigate={onNavigate} />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Folder className="mb-2 h-6 w-6 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">No matches</p>
            </div>
          )
        ) : (
          // Products tab
          filteredProducts.length > 0 ? (
            <div className="space-y-3">
              {productsByPage.map((group) => {
                let pathname = "/";
                try { pathname = new URL(group.url).pathname; } catch {}

                return (
                  <div key={group.url}>
                    <button
                      onClick={() => navigateToPage(group.url)}
                      className="text-[10px] text-muted-foreground font-mono truncate w-full text-left hover:text-foreground mb-1"
                    >
                      {pathname}
                    </button>
                    {group.products.map((product, i) => (
                      <button
                        key={`${product.name}-${i}`}
                        onClick={() => navigateToPage(group.url)}
                        className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-accent transition-colors"
                      >
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt=""
                            className="h-6 w-6 rounded object-cover shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <ShoppingCart className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs" dir="auto">{product.name}</div>
                          <div className="flex items-center gap-1">
                            {product.price && (
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {product.currency} {product.price}
                              </span>
                            )}
                            {product.availability && (
                              <span className={`text-[9px] ${
                                product.availability === "InStock" ? "text-emerald-500" :
                                product.availability === "OutOfStock" ? "text-red-500" :
                                "text-muted-foreground"
                              }`}>
                                {product.availability === "InStock" ? "●" :
                                 product.availability === "OutOfStock" ? "●" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                        {product.discountPercent && product.discountPercent > 0 && (
                          <span className="text-[9px] font-bold text-red-500 shrink-0">
                            -{product.discountPercent}%
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ShoppingCart className="mb-2 h-6 w-6 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">
                {search ? "No products match" : "No products found"}
              </p>
            </div>
          )
        )}
      </ScrollArea>

      <div className="border-t border-border p-3 space-y-2">
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Radar className="h-3.5 w-3.5 text-muted-foreground" />
            {locale === "ar" ? "المراقبة" : "Monitoring"}
          </div>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            {locale === "ar"
              ? "قريباً: تنبيهات على التغييرات، الإطلاقات، الأسعار، وعودة المخزون."
              : "Coming soon: alerts for site changes, launches, prices, and restocks."}
          </p>
        </div>

        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
            {locale === "ar" ? "المنافسون" : "Competitors"}
          </div>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            {locale === "ar"
              ? "قريباً: مقارنة الرسائل والفجوات مع مواقع مشابهة."
              : "Coming soon: benchmark positioning and gaps against similar sites."}
          </p>
        </div>
      </div>
    </div>
  );
}
