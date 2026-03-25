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

  return deduplicateProducts(allProducts);
}

// ---- Strategy 1: JSON-LD ----

function extractFromJsonLd(entries: StructuredDataEntry[]): ProductData[] {
  const raw = extractProductData(entries);
  return raw.map((p) => {
    // Also extract brand and sku from the raw entry
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

    // Detect original price (sale)
    let originalPrice: string | undefined;
    if (data?.offers) {
      const offers = Array.isArray(data.offers) ? data.offers : [data.offers];
      const offer = offers[0] as Record<string, unknown> | undefined;
      if (offer?.highPrice && offer?.lowPrice && String(offer.highPrice) !== String(offer.lowPrice)) {
        originalPrice = String(offer.highPrice);
      }
    }

    return {
      name: p.name,
      price: p.price || undefined,
      currency: p.currency || undefined,
      availability: p.availability || undefined,
      originalPrice,
      imageUrl: p.imageUrl,
      brand: brand || undefined,
      sku,
      rating: rating || undefined,
      reviewCount,
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
    let availability = getItempropAttr($c, "availability", "href") ||
      getItempropAttr($c, "availability", "content");
    if (availability?.includes("schema.org/")) {
      availability = availability.split("/").pop() || availability;
    }

    const imageUrl = $c.find('[itemprop="image"]').attr("src") ||
      $c.find('[itemprop="image"]').attr("content") || undefined;
    const brand = getItemprop($c, "brand");
    const sku = getItempropAttr($c, "sku", "content") || getItemprop($c, "sku");
    const rating = getItempropAttr($c, "ratingValue", "content");
    const reviewCountStr = getItempropAttr($c, "reviewCount", "content");

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
  let availability = getMeta($, "product:availability") || undefined;
  if (availability?.includes("schema.org/")) {
    availability = availability.split("/").pop() || availability;
  }
  const imageUrl = getMeta($, "og:image") || undefined;

  return [{
    name,
    price: priceAmount,
    currency,
    availability,
    imageUrl,
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
  "del .amount",
  "s .amount",
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

  return [{
    name,
    price,
    currency,
    originalPrice,
    availability,
    imageUrl,
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
