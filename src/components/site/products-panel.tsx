"use client";

import { useState, useMemo } from "react";
import type { ProductData } from "@/types/canvas";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Package,
  DollarSign,
  CheckCircle2,
  XCircle,
  Tag,
  Star,
  ShoppingCart,
  Filter,
  Search,
  ArrowUpDown,
  Percent,
  HelpCircle,
  BarChart3,
} from "lucide-react";

interface ProductWithPage extends ProductData {
  pageUrl: string;
}

type StockFilter = "all" | "in-stock" | "out-of-stock" | "on-sale" | "unknown";
type SortOption = "name-asc" | "price-low" | "price-high" | "discount";

function isInStock(p: ProductWithPage) {
  return p.availability === "InStock" || p.availability === "LimitedAvailability";
}

function isOutOfStock(p: ProductWithPage) {
  return p.availability === "OutOfStock" || p.availability === "Discontinued";
}

function isUnknownStock(p: ProductWithPage) {
  return !p.availability || (!isInStock(p) && !isOutOfStock(p) && p.availability !== "PreOrder" && p.availability !== "BackOrder");
}

const QUALITY_FIELDS: (keyof ProductData)[] = ["price", "currency", "availability", "imageUrl", "brand", "description", "rating"];

function dataQuality(p: ProductData): number {
  const filled = QUALITY_FIELDS.filter((f) => p[f] !== undefined && p[f] !== null && p[f] !== "").length;
  return Math.round((filled / QUALITY_FIELDS.length) * 100);
}

export function ProductsPanel({ products }: { products: ProductWithPage[] }) {
  const [filter, setFilter] = useState<StockFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("name-asc");

  const inStock = products.filter(isInStock);
  const outOfStock = products.filter(isOutOfStock);
  const unknownStock = products.filter(isUnknownStock);
  const onSale = products.filter((p) => p.discountPercent && p.discountPercent > 0);

  // Price range
  const prices = products
    .map((p) => parseFloat(p.price ?? ""))
    .filter((n) => !isNaN(n));
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
  const currency = products.find((p) => p.currency)?.currency ?? "";

  // Average data quality
  const avgQuality = products.length > 0
    ? Math.round(products.reduce((s, p) => s + dataQuality(p), 0) / products.length)
    : 0;

  // Filter + search + sort
  const filtered = useMemo(() => {
    let result = products;

    // Stock filter
    if (filter === "in-stock") result = result.filter(isInStock);
    else if (filter === "out-of-stock") result = result.filter(isOutOfStock);
    else if (filter === "on-sale") result = result.filter((p) => p.discountPercent && p.discountPercent > 0);
    else if (filter === "unknown") result = result.filter(isUnknownStock);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sort) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "price-low": {
          const pa = parseFloat(a.price ?? "Infinity");
          const pb = parseFloat(b.price ?? "Infinity");
          return pa - pb;
        }
        case "price-high": {
          const pa = parseFloat(a.price ?? "0");
          const pb = parseFloat(b.price ?? "0");
          return pb - pa;
        }
        case "discount":
          return (b.discountPercent ?? 0) - (a.discountPercent ?? 0);
        default:
          return 0;
      }
    });

    return result;
  }, [products, filter, search, sort]);

  const filters: { key: StockFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: products.length },
    { key: "in-stock", label: "In Stock", count: inStock.length },
    { key: "out-of-stock", label: "Unavailable", count: outOfStock.length },
    { key: "on-sale", label: "On Sale", count: onSale.length },
    { key: "unknown", label: "Unknown", count: unknownStock.length },
  ];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard label="Total Products" value={products.length} icon={Package} />
        <SummaryCard label="In Stock" value={inStock.length} icon={CheckCircle2} color="text-emerald-500" />
        <SummaryCard label="Unavailable" value={outOfStock.length} icon={XCircle} color={outOfStock.length > 0 ? "text-red-500" : undefined} />
        <SummaryCard label="On Sale" value={onSale.length} icon={Percent} color={onSale.length > 0 ? "text-orange-500" : undefined} />
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
        <SummaryCard label="Data Quality" value={`${avgQuality}%`} icon={BarChart3} isText color={avgQuality >= 70 ? "text-emerald-500" : avgQuality >= 40 ? "text-amber-500" : "text-red-500"} />
      </div>

      {/* Search + Sort + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="h-8 pl-8 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground"
          >
            <option value="name-asc">Name A-Z</option>
            <option value="price-low">Price: Low → High</option>
            <option value="price-high">Price: High → Low</option>
            <option value="discount">Discount %</option>
          </select>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((product, i) => (
          <ProductCard key={`${product.name}-${i}`} product={product} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 space-y-2">
          <ShoppingCart className="h-8 w-8 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">
            {search || filter !== "all"
              ? "No products match the current filters."
              : "No products detected on this site."}
          </p>
          {(search || filter !== "all") && (
            <button
              onClick={() => { setSearch(""); setFilter("all"); }}
              className="text-xs text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
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

  const hasDiscount = product.discountPercent && product.discountPercent > 0;
  const quality = dataQuality(product);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Image */}
      <div className="relative">
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
        {/* Discount badge overlay */}
        {hasDiscount && (
          <div className="absolute top-2 right-2 rounded-md bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
            -{product.discountPercent}%
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        {/* Name */}
        <div className="text-sm font-medium line-clamp-2">{product.name}</div>

        {/* Description */}
        {product.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-2">{product.description}</p>
        )}

        {/* Price */}
        {product.price && (
          <div className="flex items-center gap-2">
            <span className={`text-base font-semibold font-mono ${hasDiscount ? "text-red-500" : ""}`}>
              {product.currency && <span className="text-xs text-muted-foreground mr-0.5">{product.currency}</span>}
              {product.price}
            </span>
            {product.originalPrice && product.originalPrice !== product.price && (
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
            <AvailabilityBadge availability={product.availability} />
          )}
          {!product.availability && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground/50">
              <HelpCircle className="h-2.5 w-2.5 mr-0.5" />
              Unknown
            </Badge>
          )}

          {/* Category */}
          {product.category && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {product.category}
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

        {/* Footer: SKU + Page + Quality */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="min-w-0">
            {product.sku && <span className="mr-2">SKU: {product.sku}</span>}
            <span className="font-mono truncate block">{pathname}</span>
          </div>
          <div className="shrink-0 ml-2">
            <span className={`font-mono ${quality >= 70 ? "text-emerald-500" : quality >= 40 ? "text-amber-500" : "text-red-500"}`}>
              {quality}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AvailabilityBadge({ availability }: { availability: string }) {
  let color = "text-muted-foreground";
  let label = availability;

  switch (availability) {
    case "InStock":
      color = "text-emerald-500 border-emerald-500/30";
      label = "In Stock";
      break;
    case "OutOfStock":
      color = "text-red-500 border-red-500/30";
      label = "Out of Stock";
      break;
    case "Discontinued":
      color = "text-red-500 border-red-500/30";
      label = "Discontinued";
      break;
    case "PreOrder":
      color = "text-blue-500 border-blue-500/30";
      label = "Pre-Order";
      break;
    case "BackOrder":
      color = "text-amber-500 border-amber-500/30";
      label = "Back Order";
      break;
    case "LimitedAvailability":
      color = "text-amber-500 border-amber-500/30";
      label = "Limited";
      break;
  }

  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${color}`}>
      {label}
    </Badge>
  );
}
