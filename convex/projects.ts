import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const cadenceArg = v.union(v.literal("off"), v.literal("daily"), v.literal("weekly"));

export const createProject = mutation({
  args: { rootUrl: v.string(), label: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const ownerId = await getAuthUserId(ctx);
    if (!ownerId) throw new Error("Not signed in");
    return await ctx.db.insert("projects", {
      ownerId,
      rootUrl: args.rootUrl,
      label: args.label,
      cadence: "off",
      createdAt: Date.now(),
    });
  },
});

export const listMyProjects = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await getAuthUserId(ctx);
    if (!ownerId) return [];
    return await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .order("desc")
      .collect();
  },
});

export const getProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const ownerId = await getAuthUserId(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.ownerId !== ownerId) return null;
    return project;
  },
});

export const updateProjectSettings = mutation({
  args: {
    projectId: v.id("projects"),
    cadence: v.optional(cadenceArg),
    label: v.optional(v.string()),
    alertEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ownerId = await getAuthUserId(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.ownerId !== ownerId) throw new Error("Project not found");
    await ctx.db.patch(args.projectId, {
      ...(args.cadence !== undefined ? { cadence: args.cadence } : {}),
      ...(args.label !== undefined ? { label: args.label } : {}),
      ...(args.alertEmail !== undefined ? { alertEmail: args.alertEmail } : {}),
    });
    return { ok: true };
  },
});

// Turn an anonymous crawl into the first snapshot of a saved project for the
// signed-in user (reusing an existing project for the same root URL if any).
export const claimCrawlIntoProject = mutation({
  args: { crawlId: v.id("crawls") },
  handler: async (ctx, args) => {
    const ownerId = await getAuthUserId(ctx);
    if (!ownerId) throw new Error("Not signed in");
    const crawl = await ctx.db.get(args.crawlId);
    if (!crawl) throw new Error("Crawl not found");

    const mine = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();
    const match = mine.find((p) => p.rootUrl === crawl.rootUrl);
    const projectId = match
      ? match._id
      : await ctx.db.insert("projects", {
          ownerId,
          rootUrl: crawl.rootUrl,
          cadence: "off",
          createdAt: Date.now(),
        });

    await ctx.db.patch(args.crawlId, { ownerId, projectId });
    return { projectId };
  },
});
