import type { StructuredDataEntry } from "@/types/canvas";

interface SchemaTypeRequirements {
  required: string[];
  recommended: string[];
}

const SCHEMA_REQUIREMENTS: Record<string, SchemaTypeRequirements> = {
  Product: {
    required: ["name", "image"],
    recommended: ["description", "offers", "brand", "sku"],
  },
  Article: {
    required: ["headline", "author"],
    recommended: ["datePublished", "image", "publisher", "dateModified"],
  },
  Organization: {
    required: ["name"],
    recommended: ["url", "logo", "contactPoint", "sameAs"],
  },
  LocalBusiness: {
    required: ["name", "address"],
    recommended: ["telephone", "openingHours", "geo", "image"],
  },
  FAQPage: {
    required: ["mainEntity"],
    recommended: [],
  },
  BreadcrumbList: {
    required: ["itemListElement"],
    recommended: [],
  },
  WebSite: {
    required: ["name", "url"],
    recommended: ["potentialAction"],
  },
  WebPage: {
    required: ["name"],
    recommended: ["description", "url"],
  },
};

export function validateStructuredData(
  jsonLdStrings: string[]
): StructuredDataEntry[] {
  const entries: StructuredDataEntry[] = [];

  for (const raw of jsonLdStrings) {
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        // Handle @graph
        if (item["@graph"] && Array.isArray(item["@graph"])) {
          for (const graphItem of item["@graph"]) {
            entries.push(validateSingleSchema(graphItem));
          }
        } else {
          entries.push(validateSingleSchema(item));
        }
      }
    } catch {
      entries.push({
        type: "Unknown",
        data: {},
        issues: ["Invalid JSON-LD: could not parse"],
      });
    }
  }

  return entries;
}

function validateSingleSchema(item: Record<string, unknown>): StructuredDataEntry {
  const type = extractType(item);
  const issues: string[] = [];

  const requirements = SCHEMA_REQUIREMENTS[type];
  if (requirements) {
    for (const field of requirements.required) {
      if (!item[field] && !item[`@${field}`]) {
        issues.push(`Missing required field: ${field}`);
      }
    }
    for (const field of requirements.recommended) {
      if (!item[field] && !item[`@${field}`]) {
        issues.push(`Missing recommended field: ${field}`);
      }
    }
  }

  // Product-specific: validate offers
  if (type === "Product" && item.offers) {
    const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
    for (const offer of offers) {
      if (typeof offer === "object" && offer !== null) {
        const o = offer as Record<string, unknown>;
        if (!o.price && !o.lowPrice) issues.push("Product offer missing price");
        if (!o.priceCurrency) issues.push("Product offer missing priceCurrency");
        if (!o.availability) issues.push("Product offer missing availability");
      }
    }
  }

  return { type, data: item, issues };
}

function extractType(item: Record<string, unknown>): string {
  const rawType = item["@type"];
  if (typeof rawType === "string") return rawType;
  if (Array.isArray(rawType) && rawType.length > 0) return String(rawType[0]);
  return "Unknown";
}

/**
 * Extract product data from structured data entries.
 */
export function extractProductData(entries: StructuredDataEntry[]): {
  name: string;
  price?: string;
  currency?: string;
  availability?: string;
  imageUrl?: string;
}[] {
  const products: ReturnType<typeof extractProductData> = [];

  for (const entry of entries) {
    if (entry.type !== "Product") continue;
    const d = entry.data;
    const name = String(d.name || "Unknown Product");
    let price: string | undefined;
    let currency: string | undefined;
    let availability: string | undefined;

    if (d.offers) {
      const offers = Array.isArray(d.offers) ? d.offers : [d.offers];
      const offer = offers[0] as Record<string, unknown> | undefined;
      if (offer) {
        price = String(offer.price ?? offer.lowPrice ?? "");
        currency = String(offer.priceCurrency ?? "");
        availability = String(offer.availability ?? "");
        // Clean up schema.org URL format
        if (availability.includes("schema.org/")) {
          availability = availability.split("/").pop() || availability;
        }
      }
    }

    const imageUrl = typeof d.image === "string"
      ? d.image
      : Array.isArray(d.image)
        ? String(d.image[0])
        : undefined;

    products.push({ name, price, currency, availability, imageUrl });
  }

  return products;
}
