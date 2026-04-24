import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const outgoingLinkValidator = v.object({
  url: v.string(),
  anchorText: v.string(),
  context: v.union(
    v.literal("nav"),
    v.literal("header"),
    v.literal("footer"),
    v.literal("main"),
    v.literal("other")
  ),
});

const seoValidator = v.object({
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
});

const productValidator = v.object({
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
});

const robotsSitemapValidator = v.object({
  robotsTxt: v.object({
    found: v.boolean(),
    sitemapUrls: v.array(v.string()),
    blockedPaths: v.array(v.string()),
    issues: v.array(v.string()),
  }),
  sitemap: v.object({
    found: v.boolean(),
    urls: v.array(v.object({
      loc: v.string(),
      lastmod: v.optional(v.string()),
    })),
    issues: v.array(v.string()),
  }),
  coverage: v.object({
    inSitemapNotCrawled: v.array(v.string()),
    crawledNotInSitemap: v.array(v.string()),
  }),
});

const pageValidator = v.object({
  url: v.string(),
  title: v.string(),
  screenshot: v.string(),
  bodyText: v.string(),
  outgoingLinks: v.array(outgoingLinkValidator),
  seo: seoValidator,
  products: v.optional(v.array(productValidator)),
  botProtection: v.optional(v.string()),
});

export const storeCrawlResult = mutation({
  args: {
    rootUrl: v.string(),
    pages: v.array(pageValidator),
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
    robotsSitemap: v.optional(robotsSitemapValidator),
  },
  handler: async (ctx, args) => {
    // Generate a short unique slug (8 chars, alphanumeric)
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let slug: string;
    let attempts = 0;
    do {
      slug = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      const existing = await ctx.db
        .query("crawls")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (!existing) break;
      attempts++;
    } while (attempts < 5);

    const crawlId = await ctx.db.insert("crawls", {
      rootUrl: args.rootUrl,
      slug,
      pagesCount: args.pages.length,
      discoveredUrls: args.discoveredUrls ?? [],
      brokenLinks: args.brokenLinks,
      redirectChains: args.redirectChains,
      robotsSitemap: args.robotsSitemap,
      createdAt: Date.now(),
    });

    for (const page of args.pages) {
      await ctx.db.insert("pages", {
        crawlId,
        url: page.url,
        title: page.title,
        screenshot: page.screenshot,
        bodyText: page.bodyText,
        outgoingLinks: page.outgoingLinks,
        seo: page.seo,
        products: page.products,
        botProtection: page.botProtection,
      });
    }

    return slug;
  },
});

export const getCrawlBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    // Try slug first
    let crawl = await ctx.db
      .query("crawls")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    // Fallback: try as Convex _id for backward compat with old URLs
    if (!crawl) {
      try {
        const doc = await ctx.db.get(args.slug as any) as any;
        if (doc && "rootUrl" in doc && "pagesCount" in doc) {
          crawl = doc;
        }
      } catch {
        // Invalid ID format — not found
      }
    }

    if (!crawl) return null;

    const pages = await ctx.db
      .query("pages")
      .withIndex("by_crawl_id", (q) => q.eq("crawlId", crawl._id))
      .collect();

    return {
      _id: crawl._id,
      slug: crawl.slug ?? args.slug,
      rootUrl: crawl.rootUrl,
      discoveredUrls: crawl.discoveredUrls ?? [],
      brokenLinks: crawl.brokenLinks ?? [],
      redirectChains: crawl.redirectChains ?? [],
      robotsSitemap: crawl.robotsSitemap,
      createdAt: crawl.createdAt,
      pages: pages.map((p) => ({
        url: p.url,
        title: p.title,
        screenshot: p.screenshot,
        bodyText: p.bodyText,
        outgoingLinks: p.outgoingLinks,
        seo: p.seo,
        products: p.products,
        botProtection: p.botProtection,
      })),
    };
  },
});

export const getCrawlByUrl = query({
  args: { rootUrl: v.string() },
  handler: async (ctx, args) => {
    const crawl = await ctx.db
      .query("crawls")
      .withIndex("by_root_url", (q) => q.eq("rootUrl", args.rootUrl))
      .order("desc")
      .first();

    if (!crawl) return null;

    const pages = await ctx.db
      .query("pages")
      .withIndex("by_crawl_id", (q) => q.eq("crawlId", crawl._id))
      .collect();

    return {
      _id: crawl._id,
      rootUrl: crawl.rootUrl,
      discoveredUrls: crawl.discoveredUrls ?? [],
      brokenLinks: crawl.brokenLinks ?? [],
      redirectChains: crawl.redirectChains ?? [],
      robotsSitemap: crawl.robotsSitemap,
      createdAt: crawl.createdAt,
      pages: pages.map((p) => ({
        url: p.url,
        title: p.title,
        screenshot: p.screenshot,
        bodyText: p.bodyText,
        outgoingLinks: p.outgoingLinks,
        seo: p.seo,
        products: p.products,
        botProtection: p.botProtection,
      })),
    };
  },
});

export const storeAnalysis = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    // Upsert: delete existing analysis for this pageUrl, then insert new
    const existing = await ctx.db
      .query("analyses")
      .withIndex("by_page_url", (q) => q.eq("pageUrl", args.pageUrl))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    await ctx.db.insert("analyses", {
      pageUrl: args.pageUrl,
      crawlId: args.crawlId,
      seoScore: args.seoScore,
      seoIssues: args.seoIssues,
      contentAnalysis: args.contentAnalysis,
      features: args.features,
      recommendations: args.recommendations,
    });
  },
});

export const getAnalysis = query({
  args: { pageUrl: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("analyses")
      .withIndex("by_page_url", (q) => q.eq("pageUrl", args.pageUrl))
      .first();
  },
});

export const listRecentCrawls = query({
  args: {},
  handler: async (ctx) => {
    // Get the 20 most recent crawls
    const crawls = await ctx.db
      .query("crawls")
      .order("desc")
      .take(20);

    // Deduplicate by rootUrl (keep only the latest per site)
    const seen = new Set<string>();
    const unique = [];
    for (const crawl of crawls) {
      if (!seen.has(crawl.rootUrl)) {
        seen.add(crawl.rootUrl);
        unique.push({
          _id: crawl._id,
          slug: crawl.slug,
          rootUrl: crawl.rootUrl,
          pagesCount: crawl.pagesCount,
          discoveredCount: (crawl.discoveredUrls ?? []).length,
          createdAt: crawl.createdAt,
        });
      }
    }
    return unique;
  },
});
