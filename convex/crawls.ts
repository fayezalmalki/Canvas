import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { computeCrawlDiff, type CrawlSnapshotInput } from "./crawlDiff";

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

const crawlMetadataArgs = {
  rootUrl: v.string(),
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
  robotsSitemap: v.optional(robotsSitemapValidator),
};

async function generateUniqueSlug(ctx: MutationCtx): Promise<string> {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
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

  return slug;
}

export const createCrawl = mutation({
  args: crawlMetadataArgs,
  handler: async (ctx, args) => {
    const slug = await generateUniqueSlug(ctx);
    const ownerId = await getAuthUserId(ctx);

    const crawlId = await ctx.db.insert("crawls", {
      rootUrl: args.rootUrl,
      slug,
      pagesCount: args.pagesCount,
      discoveredUrls: args.discoveredUrls ?? [],
      brokenLinks: args.brokenLinks,
      redirectChains: args.redirectChains,
      robotsSitemap: args.robotsSitemap,
      ownerId: ownerId ?? undefined,
      createdAt: Date.now(),
    });

    return { crawlId, slug };
  },
});

export const addPagesToCrawl = mutation({
  args: {
    crawlId: v.id("crawls"),
    pages: v.array(pageValidator),
  },
  handler: async (ctx, args) => {
    for (const page of args.pages) {
      await ctx.db.insert("pages", {
        crawlId: args.crawlId,
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
    return { inserted: args.pages.length };
  },
});

export const updateCrawlMetadata = mutation({
  args: {
    crawlId: v.id("crawls"),
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
    robotsSitemap: v.optional(robotsSitemapValidator),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.crawlId, {
      pagesCount: args.pagesCount,
      discoveredUrls: args.discoveredUrls ?? [],
      brokenLinks: args.brokenLinks,
      redirectChains: args.redirectChains,
      robotsSitemap: args.robotsSitemap,
    });
    return { ok: true };
  },
});

export const storeCrawlResult = mutation({
  args: {
    ...crawlMetadataArgs,
    pages: v.array(pageValidator),
  },
  handler: async (ctx, args) => {
    const slug = await generateUniqueSlug(ctx);
    const crawlId = await ctx.db.insert("crawls", {
      rootUrl: args.rootUrl,
      slug,
      pagesCount: args.pagesCount,
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
        const doc = await ctx.db.get(args.slug as Id<"crawls">);
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
    // Privacy: only return the signed-in user's own audits (was previously a
    // global list of everyone's crawls). Anonymous visitors get nothing.
    const ownerId = await getAuthUserId(ctx);
    if (!ownerId) return [];

    const crawls = await ctx.db
      .query("crawls")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .order("desc")
      .take(40);

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
      if (unique.length >= 20) break;
    }
    return unique;
  },
});

// ---- AI fixes (per-page rewrites), cached per crawl + page + locale ----

const localeArg = v.union(v.literal("en"), v.literal("ar"));

export const storePageFix = mutation({
  args: {
    crawlId: v.id("crawls"),
    pageUrl: v.string(),
    locale: localeArg,
    title: v.string(),
    metaDescription: v.string(),
    altTextSuggestions: v.array(v.object({ imageHint: v.string(), alt: v.string() })),
    jsonLd: v.object({ type: v.string(), json: v.string() }),
    provider: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pageFixes")
      .withIndex("by_crawl_page_locale", (q) =>
        q.eq("crawlId", args.crawlId).eq("pageUrl", args.pageUrl).eq("locale", args.locale)
      )
      .first();
    if (existing) await ctx.db.delete(existing._id);

    await ctx.db.insert("pageFixes", {
      crawlId: args.crawlId,
      pageUrl: args.pageUrl,
      locale: args.locale,
      title: args.title.slice(0, 300),
      metaDescription: args.metaDescription.slice(0, 600),
      altTextSuggestions: args.altTextSuggestions.slice(0, 6),
      jsonLd: { type: args.jsonLd.type.slice(0, 60), json: args.jsonLd.json.slice(0, 8000) },
      provider: args.provider,
      createdAt: Date.now(),
    });
  },
});

export const getPageFix = query({
  args: { crawlId: v.id("crawls"), pageUrl: v.string(), locale: localeArg },
  handler: async (ctx, args) =>
    await ctx.db
      .query("pageFixes")
      .withIndex("by_crawl_page_locale", (q) =>
        q.eq("crawlId", args.crawlId).eq("pageUrl", args.pageUrl).eq("locale", args.locale)
      )
      .first(),
});

export const listPageFixesForCrawl = query({
  args: { crawlId: v.id("crawls") },
  handler: async (ctx, args) =>
    await ctx.db
      .query("pageFixes")
      .withIndex("by_crawl_page_locale", (q) => q.eq("crawlId", args.crawlId))
      .collect(),
});

// ---- AEO live citation tests, cached per crawl + page + locale ----

export const storeAeoTest = mutation({
  args: {
    crawlId: v.id("crawls"),
    pageUrl: v.string(),
    locale: localeArg,
    whatItOffers: v.string(),
    couldCiteConfidently: v.union(v.literal("yes"), v.literal("partly"), v.literal("no")),
    confidence: v.number(),
    missingForCitation: v.array(v.string()),
    detectedEntities: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("aeoTests")
      .withIndex("by_crawl_page_locale", (q) =>
        q.eq("crawlId", args.crawlId).eq("pageUrl", args.pageUrl).eq("locale", args.locale)
      )
      .first();
    if (existing) await ctx.db.delete(existing._id);

    await ctx.db.insert("aeoTests", {
      crawlId: args.crawlId,
      pageUrl: args.pageUrl,
      locale: args.locale,
      whatItOffers: args.whatItOffers.slice(0, 600),
      couldCiteConfidently: args.couldCiteConfidently,
      confidence: Math.max(0, Math.min(100, Math.round(args.confidence))),
      missingForCitation: args.missingForCitation.slice(0, 8).map((s) => s.slice(0, 200)),
      detectedEntities: args.detectedEntities.slice(0, 12).map((s) => s.slice(0, 80)),
      createdAt: Date.now(),
    });
  },
});

export const listAeoTestsForCrawl = query({
  args: { crawlId: v.id("crawls") },
  handler: async (ctx, args) =>
    await ctx.db
      .query("aeoTests")
      .withIndex("by_crawl_page_locale", (q) => q.eq("crawlId", args.crawlId))
      .collect(),
});

// Shape a crawl doc + its pages into the dependency-free snapshot the diff
// helper consumes. Shared by getCrawlDiff and (Unit 6) the alert action.
async function toSnapshot(ctx: QueryCtx, crawl: Doc<"crawls">): Promise<CrawlSnapshotInput> {
  const pages = await ctx.db
    .query("pages")
    .withIndex("by_crawl_id", (q) => q.eq("crawlId", crawl._id))
    .collect();
  return {
    createdAt: crawl.createdAt,
    slug: crawl.slug,
    pagesCount: crawl.pagesCount,
    brokenLinks: (crawl.brokenLinks ?? []).map((b) => ({ url: b.url, statusCode: b.statusCode })),
    redirectChains: (crawl.redirectChains ?? []).map((r) => ({ from: r.from, to: r.to })),
    pages: pages.map((p) => ({
      url: p.url,
      title: p.title,
      wordCount: p.seo?.wordCount ?? 0,
      statusCode: p.seo?.statusCode ?? 0,
    })),
  };
}

// "What changed since the previous crawl of this site." Resolves the crawl by
// slug, finds the most recent earlier crawl of the same rootUrl, and diffs
// them. Returns hasPrevious=false for a site's first-ever crawl (the baseline).
export const getCrawlDiff = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    let current = await ctx.db
      .query("crawls")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!current) {
      try {
        const doc = await ctx.db.get(args.slug as Id<"crawls">);
        if (doc && "rootUrl" in doc) current = doc;
      } catch {
        // not a valid id — leave current null
      }
    }
    if (!current) return null;

    // Most recent crawl of the same site strictly before this one.
    const earlier = await ctx.db
      .query("crawls")
      .withIndex("by_root_url", (q) => q.eq("rootUrl", current.rootUrl))
      .order("desc")
      .collect();
    const previous = earlier.find((c) => c.createdAt < current.createdAt) ?? null;

    const currentSnap = await toSnapshot(ctx, current);
    const previousSnap = previous ? await toSnapshot(ctx, previous) : null;

    return {
      rootUrl: current.rootUrl,
      totalSnapshots: earlier.length,
      ...computeCrawlDiff(currentSnap, previousSnap),
    };
  },
});
