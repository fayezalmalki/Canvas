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
  statusCode: v.number(),
});

const pageValidator = v.object({
  url: v.string(),
  title: v.string(),
  screenshot: v.string(),
  bodyText: v.string(),
  outgoingLinks: v.array(outgoingLinkValidator),
  seo: seoValidator,
});

export const storeCrawlResult = mutation({
  args: {
    rootUrl: v.string(),
    pages: v.array(pageValidator),
  },
  handler: async (ctx, args) => {
    const crawlId = await ctx.db.insert("crawls", {
      rootUrl: args.rootUrl,
      pagesCount: args.pages.length,
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
      });
    }

    return crawlId;
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
      rootUrl: crawl.rootUrl,
      pages: pages.map((p) => ({
        url: p.url,
        title: p.title,
        screenshot: p.screenshot,
        bodyText: p.bodyText,
        outgoingLinks: p.outgoingLinks,
        seo: p.seo,
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
