import type { MetadataRoute } from "next";
import { db } from "@/server/db";
import { questionnaire } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * Sitemap for SEO - includes all publicly accessible pages.
 * Excludes: /account, /login, /auth/error (user-specific/auth pages)
 * Dynamically includes all public questionnaire analysis pages
 */

type SitemapRoute = {
  path: string;
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority: number;
  lastModified?: Date;
};

const staticRoutes: SitemapRoute[] = [
  {
    path: "",
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/tests",
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    path: "/models",
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    path: "/benchmarks",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/documentation",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/contact",
    changeFrequency: "monthly",
    priority: 0.5,
  },
  {
    path: "/privacy",
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    path: "/terms",
    changeFrequency: "yearly",
    priority: 0.3,
  },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://personai.review");

  // Get all public questionnaires for analysis pages
  let publicQuestionnaires: Array<{ slug: string; updatedAt: Date | null }> =
    [];
  try {
    publicQuestionnaires = await db
      .select({
        slug: questionnaire.slug,
        updatedAt: questionnaire.updatedAt,
      })
      .from(questionnaire)
      .where(eq(questionnaire.isPublic, true));
  } catch (error) {
    // If DB is not available (e.g., during build), just use static routes
    console.warn("Failed to fetch questionnaires for sitemap:", error);
  }

  // Combine static routes with dynamic questionnaire routes
  const allRoutes: SitemapRoute[] = [
    ...staticRoutes,
    ...publicQuestionnaires.map((q) => ({
      path: `/tests/${q.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      lastModified: q.updatedAt ?? undefined,
    })),
  ];

  return allRoutes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    ...(route.lastModified && { lastModified: route.lastModified }),
  }));
}
