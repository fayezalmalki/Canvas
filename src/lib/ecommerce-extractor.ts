import type * as cheerio from "cheerio";
import type { StructuredDataEntry, ProductData } from "@/types/canvas";
import { extractProductData } from "./schema-validator";

/**
 * Extract products from a page using multiple strategies in priority order.
 * Deduplicates by name, keeping the higher-priority source.
 */
export function extractProducts(
  $: cheerio.CheerioAPI,
  structuredData?: StructuredDataEntry[]
): ProductData[] {
  const allProducts: ProductData[] = [];

  // Strategy 1: JSON-LD (highest priority)
  if (structuredData && structuredData.length > 0) {
    const jsonLdProducts = extractFromJsonLd(structuredData);
    allProducts.push(...jsonLdProducts);
  }

  // Strategy 2: Microdata
  const microdataProducts = extractFromMicrodata($);
  allProducts.push(...microdataProducts);

  // Strategy 3: OG meta tags
  const ogProducts = extractFromOgTags($);
  allProducts.push(...ogProducts);

  // Strategy 4: HTML patterns (lowest priority)
  const htmlProducts = extractFromHtmlPatterns($);
  allProducts.push(...htmlProducts);

  // Normalize availability and compute discounts for all products
  const normalized = allProducts.map((p) => {
    const availability = normalizeAvailability(p.availability);
    const discountPercent = computeDiscount(p.price, p.originalPrice);
    return {
      ...p,
      availability,
      discountPercent,
    };
  });

  return deduplicateProducts(normalized);
}

// ---- Availability Normalization ----

function normalizeAvailability(raw?: string): string | undefined {
  if (!raw) return undefined;

  // Strip schema.org URL prefix
  let cleaned = raw;
  if (cleaned.includes("schema.org/")) {
    cleaned = cleaned.split("/").pop() || cleaned;
  }

  // Normalize to canonical values
  const lower = cleaned.toLowerCase().replace(/[_\s-]+/g, "");
  if (lower === "instock" || lower === "instockitem") return "InStock";
  if (lower === "outofstock" || lower === "soldout") return "OutOfStock";
  if (lower === "preorder" || lower === "presale") return "PreOrder";
  if (lower === "discontinued") return "Discontinued";
  if (lower === "limitedavailability") return "LimitedAvailability";
  if (lower === "backorder" || lower === "backordered") return "BackOrder";

  // Return cleaned value if unrecognized
  return cleaned;
}

// ---- Discount Computation ----

function computeDiscount(price?: string, originalPrice?: string): number | undefined {
  if (!price || !originalPrice) return undefined;
  const current = parseFloat(price);
  const original = parseFloat(originalPrice);
  if (isNaN(current) || isNaN(original) || original <= 0 || current >= original) return undefined;
  const percent = Math.round((1 - current / original) * 100);
  return percent > 0 && percent <= 99 ? percent : undefined;
}

// ---- Strategy 1: JSON-LD ----

function extractFromJsonLd(entries: StructuredDataEntry[]): ProductData[] {
  const raw = extractProductData(entries);
  return raw.map((p) => {
    const entry = entries.find((e) => e.type === "Product");
    const data = entry?.data;
    const brand = data?.brand
      ? typeof data.brand === "object" && data.brand !== null
        ? String((data.brand as Record<string, unknown>).name || "")
        : String(data.brand)
      : undefined;
    const sku = data?.sku ? String(data.sku) : undefined;
    const rating = data?.aggregateRating
      ? String((data.aggregateRating as Record<string, unknown>).ratingValue || "")
      : undefined;
    const reviewCount = data?.aggregateRating
      ? Number((data.aggregateRating as Record<string, unknown>).reviewCount) || undefined
      : undefined;

    // Description
    const description = data?.description
      ? String(data.description).slice(0, 200)
      : undefined;

    // Category
    const category = data?.category
      ? String(data.category)
      : undefined;

    // Detect original price (sale)
    let originalPrice: string | undefined;
    let price = p.price || undefined;
    if (data?.offers) {
      const offers = Array.isArray(data.offers) ? data.offers : [data.offers];
      const offer = offers[0] as Record<string, unknown> | undefined;
      if (offer?.highPrice && offer?.lowPrice && String(offer.highPrice) !== String(offer.lowPrice)) {
        originalPrice = String(offer.highPrice);
      }
      // Also check individual offer price vs list price
      if (!originalPrice && offer?.price && offer?.priceValidUntil) {
        // Has a sale end date — implies sale pricing
      }
    }

    return {
      name: p.name,
      price,
      currency: p.currency || undefined,
      availability: p.availability || undefined,
      originalPrice,
      imageUrl: p.imageUrl,
      brand: brand || undefined,
      sku,
      rating: rating || undefined,
      reviewCount,
      description: description || undefined,
      category: category || undefined,
      source: "json-ld" as const,
    };
  });
}

// ---- Strategy 2: Microdata ----

function extractFromMicrodata($: cheerio.CheerioAPI): ProductData[] {
  const products: ProductData[] = [];

  $('[itemtype*="schema.org/Product"]').each((_, container) => {
    const $c = $(container);
    const name = getItemprop($c, "name");
    if (!name) return;

    const price = getItemprop($c, "price");
    const currency = getItempropAttr($c, "priceCurrency", "content");
    const availability = getItempropAttr($c, "availability", "href") ||
      getItempropAttr($c, "availability", "content");

    const imageUrl = $c.find('[itemprop="image"]').attr("src") ||
      $c.find('[itemprop="image"]').attr("content") || undefined;
    const brand = getItemprop($c, "brand");
    const sku = getItempropAttr($c, "sku", "content") || getItemprop($c, "sku");
    const rating = getItempropAttr($c, "ratingValue", "content");
    const reviewCountStr = getItempropAttr($c, "reviewCount", "content");
    const description = getItemprop($c, "description")?.slice(0, 200) || undefined;
    const category = getItemprop($c, "category") || undefined;

    products.push({
      name,
      price: price || undefined,
      currency: currency || undefined,
      availability: availability || undefined,
      imageUrl,
      brand: brand || undefined,
      sku: sku || undefined,
      rating: rating || undefined,
      reviewCount: reviewCountStr ? Number(reviewCountStr) || undefined : undefined,
      description,
      category,
      source: "microdata",
    });
  });

  return products;
}

function getItemprop($container: cheerio.Cheerio<any>, prop: string): string | null {
  const el = $container.find(`[itemprop="${prop}"]`);
  if (el.length === 0) return null;
  return el.attr("content") || el.text().trim().slice(0, 200) || null;
}

function getItempropAttr(
  $container: cheerio.Cheerio<any>,
  prop: string,
  attr: string
): string | null {
  const el = $container.find(`[itemprop="${prop}"]`);
  if (el.length === 0) return null;
  return el.attr(attr) || null;
}

// ---- Strategy 3: OG Meta Tags ----

function extractFromOgTags($: cheerio.CheerioAPI): ProductData[] {
  const priceAmount = getMeta($, "product:price:amount");
  if (!priceAmount) return [];

  const name = getMeta($, "og:title") || $("title").first().text().trim();
  if (!name) return [];

  const currency = getMeta($, "product:price:currency") || undefined;
  const availability = getMeta($, "product:availability") || undefined;
  const imageUrl = getMeta($, "og:image") || undefined;
  const description = getMeta($, "og:description")?.slice(0, 200) || undefined;

  return [{
    name,
    price: priceAmount,
    currency,
    availability,
    imageUrl,
    description,
    source: "og-tags",
  }];
}

function getMeta($: cheerio.CheerioAPI, name: string): string | null {
  return $(`meta[property="${name}"]`).attr("content") ||
    $(`meta[name="${name}"]`).attr("content") || null;
}

// ---- Strategy 4: HTML Patterns ----

const PRICE_SELECTORS = [
  ".product-price",
  ".price .amount",
  ".price",
  ".woocommerce-Price-amount",
  "[data-price]",
  ".shopify-price",
  ".product__price",
  ".price-current",
  ".sale-price",
  ".current-price",
];

const NAME_SELECTORS = [
  "h1.product-title",
  "h1.product-name",
  "h1.product_title",
  ".product-title",
  ".product-name",
  ".product_title",
  ".product__title",
  "[data-product-title]",
  "h1[itemprop='name']",
];

const ORIGINAL_PRICE_SELECTORS = [
  ".price del",
  ".price .was-price",
  ".original-price",
  ".compare-price",
  ".price-compare",
  ".price-was",
  ".list-price",
  "[data-compare-price]",
  ".product__price--compare",
  "del .amount",
  "s .amount",
];

const DESCRIPTION_SELECTORS = [
  ".product-description",
  ".product__description",
  "[data-product-description]",
  ".product-short-description",
  ".woocommerce-product-details__short-description",
];

const CURRENCY_MAP: Record<string, string> = {
  "$": "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₹": "INR",
  "₩": "KRW",
  "₺": "TRY",
  "ر.س": "SAR",
  "د.إ": "AED",
  "ر.ع": "OMR",
  "د.ك": "KWD",
  "ر.ق": "QAR",
  "د.ب": "BHD",
  "ج.م": "EGP",
  "د.ج": "DZD",
  "د.م": "MAD",
  "ل.ل": "LBP",
  "د.ع": "IQD",
  "ل.س": "SYP",
  "د.ت": "TND",
  "د.ل": "LYD",
  "ريال": "SAR",
  "SAR": "SAR",
  "AED": "AED",
  "USD": "USD",
  "EUR": "EUR",
  "GBP": "GBP",
};

function extractFromHtmlPatterns($: cheerio.CheerioAPI): ProductData[] {
  // Find product name
  let name: string | null = null;
  for (const sel of NAME_SELECTORS) {
    const text = $(sel).first().text().trim();
    if (text && text.length > 2 && text.length < 300) {
      name = text;
      break;
    }
  }

  // Find price
  let priceText: string | null = null;
  for (const sel of PRICE_SELECTORS) {
    const el = $(sel).first();
    const dataPriceAttr = el.attr("data-price");
    if (dataPriceAttr) {
      priceText = dataPriceAttr;
      break;
    }
    const text = el.text().trim();
    if (text && text.length > 0 && text.length < 50) {
      priceText = text;
      break;
    }
  }

  if (!name || !priceText) return [];

  const { price, currency } = parsePriceText(priceText);
  if (!price) return [];

  // Find original price (for sale detection)
  let originalPrice: string | undefined;
  for (const sel of ORIGINAL_PRICE_SELECTORS) {
    const text = $(sel).first().text().trim();
    if (text) {
      const parsed = parsePriceText(text);
      if (parsed.price) {
        originalPrice = parsed.price;
        break;
      }
    }
  }

  // Check stock status from common patterns
  let availability: string | undefined;
  const bodyText = $("body").text().toLowerCase();
  const outOfStockPatterns = ["out of stock", "sold out", "نفذت الكمية", "غير متوفر", "unavailable"];
  const inStockPatterns = ["in stock", "add to cart", "أضف إلى السلة", "متوفر", "available"];

  for (const pattern of outOfStockPatterns) {
    if (bodyText.includes(pattern)) {
      availability = "OutOfStock";
      break;
    }
  }
  if (!availability) {
    for (const pattern of inStockPatterns) {
      if (bodyText.includes(pattern)) {
        availability = "InStock";
        break;
      }
    }
  }

  // Find image
  const imageUrl = $(".product-image img, .product__image img, [data-product-image]").first().attr("src") || undefined;

  // Find description
  let description: string | undefined;
  for (const sel of DESCRIPTION_SELECTORS) {
    const text = $(sel).first().text().trim();
    if (text && text.length > 10) {
      description = text.slice(0, 200);
      break;
    }
  }

  return [{
    name,
    price,
    currency,
    originalPrice,
    availability,
    imageUrl,
    description,
    source: "html-patterns",
  }];
}

function parsePriceText(text: string): { price: string | null; currency: string | undefined } {
  // Try to match currency symbol + number
  for (const [symbol, code] of Object.entries(CURRENCY_MAP)) {
    if (text.includes(symbol)) {
      const numMatch = text.match(/[\d,]+\.?\d*/);
      if (numMatch) {
        return { price: numMatch[0].replace(/,/g, ""), currency: code };
      }
    }
  }

  // Try to extract just a number
  const numMatch = text.match(/[\d,]+\.?\d*/);
  if (numMatch) {
    return { price: numMatch[0].replace(/,/g, ""), currency: undefined };
  }

  return { price: null, currency: undefined };
}

// ---- Deduplication ----

const SOURCE_PRIORITY: Record<string, number> = {
  "json-ld": 0,
  "microdata": 1,
  "og-tags": 2,
  "html-patterns": 3,
};

function deduplicateProducts(products: ProductData[]): ProductData[] {
  const seen = new Map<string, ProductData>();

  // Sort by source priority (highest first)
  const sorted = [...products].sort(
    (a, b) => SOURCE_PRIORITY[a.source] - SOURCE_PRIORITY[b.source]
  );

  for (const product of sorted) {
    const key = product.name.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, product);
    }
  }

  return [...seen.values()];
}
