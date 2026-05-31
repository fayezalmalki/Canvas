"use client";

import type { ProductData } from "@/types/canvas";
import { Input } from "@/components/ui/input";
import { isInStock, isOutOfStock } from "@/components/site/products-panel";
import { ScoreStat, RoadmapPlaceholder, SURFACE } from "@/components/site/workspace-cards";
import { ChangeSummaryPanel } from "@/components/site/change-summary-panel";
import type { WorkspaceCopy } from "@/components/site/site-workspace";
import {
  Bot,
  CheckCircle2,
  Layers,
  LineChart,
  Radar,
  Search,
  ShoppingBag,
  Tag,
  Target,
  XCircle,
} from "lucide-react";

interface ProductWithPage extends ProductData {
  pageUrl: string;
}

// The module navigation is data-driven so adding a module later is a one-line entry.
export const WORKSPACE_MODULES = [
  { id: "search", icon: Search },
  { id: "ai", icon: Bot },
  { id: "commerce", icon: ShoppingBag },
  { id: "monitoring", icon: Radar },
  { id: "competitors", icon: Target },
  { id: "pages", icon: Layers },
] as const;

export type WorkspaceModuleId = (typeof WORKSPACE_MODULES)[number]["id"];

export function PriceStockModule({
  products,
  copy,
}: {
  products: ProductWithPage[];
  copy: WorkspaceCopy;
}) {
  const inStock = products.filter(isInStock).length;
  const outOfStock = products.filter(isOutOfStock).length;
  const onSale = products.filter((p) => p.discountPercent && p.discountPercent > 0);

  const prices = products
    .map((p) => parseFloat(p.price ?? ""))
    .filter((n) => !Number.isNaN(n));
  const currency = products.find((p) => p.currency)?.currency ?? "";
  const priceRange = prices.length > 0
    ? `${currency}${Math.min(...prices)} – ${currency}${Math.max(...prices)}`
    : "—";

  const topDiscounts = [...onSale]
    .sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0))
    .slice(0, 5);

  return (
    <>
      <section className={SURFACE}>
        <h2 className="mb-4 font-semibold">{copy.priceStock.title}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <ScoreStat
            label={copy.priceStock.inStock}
            value={inStock}
            icon={CheckCircle2}
            tone={inStock > 0 ? "text-emerald-500" : undefined}
          />
          <ScoreStat
            label={copy.priceStock.outOfStock}
            value={outOfStock}
            icon={XCircle}
            tone={outOfStock > 0 ? "text-rose-500" : undefined}
          />
          <ScoreStat
            label={copy.priceStock.onSale}
            value={onSale.length}
            icon={Tag}
            tone={onSale.length > 0 ? "text-amber-500" : undefined}
          />
          <ScoreStat label={copy.priceStock.priceRange} value={priceRange} icon={LineChart} />
        </div>

        {topDiscounts.length > 0 ? (
          <div className="mt-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {copy.priceStock.topDiscounts}
            </div>
            <div className="space-y-2">
              {topDiscounts.map((product) => (
                <div
                  key={`${product.pageUrl}-${product.name}`}
                  className="flex items-center gap-3 rounded-2xl bg-muted/40 px-4 py-2.5"
                >
                  <span className="min-w-0 flex-1 truncate text-sm" dir="auto">
                    {product.name}
                  </span>
                  {product.price ? (
                    <span className="font-mono text-xs text-muted-foreground">
                      {product.currency} {product.price}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    -{product.discountPercent}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <RoadmapPlaceholder
        icon={LineChart}
        title={copy.priceHistory.title}
        description={copy.priceHistory.description}
        points={copy.priceHistory.points}
        badge={copy.comingSoon}
      />
    </>
  );
}

export function MonitoringModule({
  copy,
  pagesAnalyzed,
  crawlId,
}: {
  copy: WorkspaceCopy;
  pagesAnalyzed: number;
  crawlId: string;
}) {
  return (
    <section className="space-y-4">
      <div className={SURFACE}>
        <p className="text-sm leading-7 text-muted-foreground">{copy.monitoring.intro}</p>
        <div className="mt-4 rounded-2xl bg-muted/40 px-4 py-3 text-sm">
          <span className="font-medium">{copy.monitoring.baseline}</span>{" "}
          <span className="text-muted-foreground">{copy.monitoring.baselineNote(pagesAnalyzed)}</span>
        </div>
      </div>

      {/* Snapshot diff: "what changed since the previous crawl of this site". */}
      <ChangeSummaryPanel slug={crawlId} />

      <RoadmapPlaceholder
        icon={Radar}
        title={copy.monitoring.scheduleTitle}
        description={copy.monitoring.scheduleDescription}
        points={copy.monitoring.schedulePoints}
        badge={copy.comingSoon}
      />
    </section>
  );
}

export function CompetitorsModule({ copy }: { copy: WorkspaceCopy }) {
  return (
    <section className="space-y-4">
      <RoadmapPlaceholder
        icon={Target}
        title={copy.competitors.title}
        description={copy.competitors.description}
        points={copy.competitors.points}
        badge={copy.comingSoon}
      />
      <div className={SURFACE}>
        <label className="mb-2 block text-sm font-medium">{copy.competitors.addLabel}</label>
        <Input
          disabled
          placeholder={copy.competitors.addPlaceholder}
          className="h-11 w-full rounded-2xl border-border/70 bg-background font-mono"
        />
      </div>
    </section>
  );
}
