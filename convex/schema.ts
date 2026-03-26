import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  crawls: defineTable({
    rootUrl: v.string(),
    slug: v.optional(v.string()),
    pagesCount: v.number(),
    discoveredUrls: v.optional(v.array(v.string())),
    brokenLinks: v.optional(v.array(v.object({
      url: v.string(),
      statusCode: v.number(),
      referringPages: v.array(v.string()),
    }))),
    redirectChains: v.optional(v.array(v.object({
      from: v.string(),
      to: v.string(),
      hops: v.number(),
      statusCodes: v.array(v.number()),
    }))),
    createdAt: v.number(),
  }).index("by_root_url", ["rootUrl"])
    .index("by_slug", ["slug"]),

  pages: defineTable({
    crawlId: v.id("crawls"),
    url: v.string(),
    title: v.string(),
    screenshot: v.string(),
    bodyText: v.string(),
    outgoingLinks: v.array(
      v.object({
        url: v.string(),
        anchorText: v.string(),
        context: v.union(
          v.literal("nav"),
          v.literal("header"),
          v.literal("footer"),
          v.literal("main"),
          v.literal("other")
        ),
      })
    ),
    seo: v.object({
      meta: v.object({
        description: v.union(v.string(), v.null()),
        keywords: v.union(v.string(), v.null()),
        canonical: v.union(v.string(), v.null()),
        ogTitle: v.union(v.string(), v.null()),
        ogDescription: v.union(v.string(), v.null()),
        ogImage: v.union(v.string(), v.null()),
        robots: v.union(v.string(), v.null()),
        viewport: v.union(v.string(), v.null()),
        language: v.union(v.string(), v.null()),
      }),
      headings: v.array(
        v.object({
          tag: v.union(
            v.literal("h1"),
            v.literal("h2"),
            v.literal("h3"),
            v.literal("h4"),
            v.literal("h5"),
            v.literal("h6")
          ),
          text: v.string(),
        })
      ),
      imageCount: v.number(),
      imagesWithoutAlt: v.number(),
      wordCount: v.number(),
      internalLinkCount: v.number(),
      externalLinkCount: v.number(),
      hasStructuredData: v.boolean(),
      structuredData: v.optional(v.array(v.object({
        type: v.string(),
        data: v.any(),
        issues: v.array(v.string()),
      }))),
      statusCode: v.number(),
      performance: v.optional(v.object({
        responseTimeMs: v.number(),
        htmlSizeBytes: v.number(),
        hasCompression: v.boolean(),
        cacheControl: v.union(v.string(), v.null()),
        serverHeader: v.union(v.string(), v.null()),
      })),
      i18n: v.optional(v.object({
        dir: v.union(v.string(), v.null()),
        hreflangLinks: v.array(v.object({
          lang: v.string(),
          url: v.string(),
        })),
        hasArabicContent: v.boolean(),
        arabicRatio: v.number(),
      })),
    }),
    products: v.optional(v.array(v.object({
      name: v.string(),
      price: v.optional(v.string()),
      currency: v.optional(v.string()),
      availability: v.optional(v.string()),
      originalPrice: v.optional(v.string()),
      discountPercent: v.optional(v.number()),
      imageUrl: v.optional(v.string()),
      brand: v.optional(v.string()),
      sku: v.optional(v.string()),
      rating: v.optional(v.string()),
      reviewCount: v.optional(v.number()),
      description: v.optional(v.string()),
      category: v.optional(v.string()),
      productUrl: v.optional(v.string()),
      source: v.union(
        v.literal("json-ld"),
        v.literal("microdata"),
        v.literal("html-patterns"),
        v.literal("og-tags")
      ),
    }))),
    botProtection: v.optional(v.string()),
  }).index("by_crawl_id", ["crawlId"]),

  analyses: defineTable({
    pageUrl: v.string(),
    crawlId: v.id("crawls"),
    seoScore: v.number(),
    seoIssues: v.array(
      v.object({
        severity: v.union(
          v.literal("error"),
          v.literal("warning"),
          v.literal("info")
        ),
        category: v.string(),
        title: v.string(),
        description: v.string(),
        pointsDeducted: v.number(),
      })
    ),
    contentAnalysis: v.union(
      v.object({
        summary: v.string(),
        readabilityScore: v.number(),
        keyTopics: v.array(v.string()),
        contentGaps: v.array(v.string()),
      }),
      v.null()
    ),
    features: v.union(
      v.object({
        detected: v.array(v.string()),
        technologies: v.array(v.string()),
      }),
      v.null()
    ),
    recommendations: v.array(
      v.object({
        priority: v.union(
          v.literal("high"),
          v.literal("medium"),
          v.literal("low")
        ),
        title: v.string(),
        description: v.string(),
      })
    ),
  }).index("by_page_url", ["pageUrl"]),
});
