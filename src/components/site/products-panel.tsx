"use client";

import { useState } from "react";
import type { ProductData } from "@/types/canvas";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  DollarSign,
  CheckCircle2,
  XCircle,
  Tag,
  Star,
  ShoppingCart,
  Filter,
} from "lucide-react";

interface ProductWithPage extends ProductData {
  pageUrl: string;
}

type StockFilter = "all" | "in-stock" | "out-of-stock";

export function ProductsPanel({ products }: { products: ProductWithPage[] }) {
  const [filter, setFilter] = useState<StockFilter>("all");

  const inStock = products.filter((p) => p.availability === "InStock");
  const outOfStock = products.filter((p) => p.availability === "OutOfStock");

  // Price range
  const prices = products
    .map((p) => parseFloat(p.price ?? ""))
    .filter((n) => !isNaN(n));
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
  const currency = products.find((p) => p.currency)?.currency ?? "";

  const filtered = filter === "all"
    ? products
    : filter === "in-stock"
      ? inStock
      : outOfStock;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Total Products"
          value={products.length}
          icon={Package}
        />
        <SummaryCard
          label="In Stock"
          value={inStock.length}
          icon={CheckCircle2}
          color="text-emerald-500"
        />
        <SummaryCard
          label="Out of Stock"
          value={outOfStock.length}
          icon={XCircle}
          color={outOfStock.length > 0 ? "text-red-500" : undefined}
        />
        <SummaryCard
          label="Price Range"
          value={
            minPrice !== null && maxPrice !== null
              ? minPrice === maxPrice
                ? `${currency} ${minPrice}`
                : `${currency} ${minPrice} – ${maxPrice}`
              : "N/A"
          }
          icon={DollarSign}
          isText
        />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="flex gap-1">
          {(["all", "in-stock", "out-of-stock"] as StockFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : f === "in-stock" ? "In Stock" : "Out of Stock"}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} product{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((product, i) => (
          <ProductCard key={`${product.name}-${i}`} product={product} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No products match the current filter.
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
  isText,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  isText?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${color ?? "text-muted-foreground"}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={`font-semibold font-mono ${isText ? "text-sm" : "text-xl"} ${color ?? ""}`}>
        {value}
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: ProductWithPage }) {
  let pathname = "/";
  try {
    pathname = new URL(product.pageUrl).pathname;
  } catch {}

  const hasDiscount = product.originalPrice && product.price && product.originalPrice !== product.price;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Image */}
      {product.imageUrl ? (
        <div className="aspect-video bg-muted overflow-hidden">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      ) : (
        <div className="aspect-video bg-muted flex items-center justify-center">
          <ShoppingCart className="h-8 w-8 text-muted-foreground/30" />
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* Name */}
        <div className="text-sm font-medium line-clamp-2">{product.name}</div>

        {/* Price */}
        {product.price && (
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold font-mono">
              {product.currency && <span className="text-xs text-muted-foreground mr-0.5">{product.currency}</span>}
              {product.price}
            </span>
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through font-mono">
                {product.originalPrice}
              </span>
            )}
          </div>
        )}

        {/* Details row */}
        <div className="flex flex-wrap gap-1.5">
          {/* Availability */}
          {product.availability && (
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${
                product.availability === "InStock"
                  ? "text-emerald-500 border-emerald-500/30"
                  : product.availability === "OutOfStock"
                    ? "text-red-500 border-red-500/30"
                    : "text-muted-foreground"
              }`}
            >
              {product.availability === "InStock" ? "In Stock" : product.availability === "OutOfStock" ? "Out of Stock" : product.availability}
            </Badge>
          )}

          {/* Brand */}
          {product.brand && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              <Tag className="h-2.5 w-2.5 mr-0.5" />
              {product.brand}
            </Badge>
          )}

          {/* Rating */}
          {product.rating && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-500 border-amber-500/30">
              <Star className="h-2.5 w-2.5 mr-0.5 fill-amber-500" />
              {product.rating}
              {product.reviewCount && (
                <span className="text-muted-foreground ml-0.5">({product.reviewCount})</span>
              )}
            </Badge>
          )}

          {/* Source */}
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
            {product.source}
          </Badge>
        </div>

        {/* SKU + Page */}
        <div className="text-[11px] text-muted-foreground space-y-0.5">
          {product.sku && <div>SKU: {product.sku}</div>}
          <div className="font-mono truncate">{pathname}</div>
        </div>
      </div>
    </div>
  );
}
