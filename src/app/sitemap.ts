import type { MetadataRoute } from "next";

/**
 * Sitemap for SEO - includes all publicly accessible pages.
 * Excludes: /account, /login, /auth/error (user-specific/auth pages)
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

const sitemapRoutes: SitemapRoute[] = [
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
    path: "/docs",
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
    // Static page - use fixed date or omit lastModified
  },
  {
    path: "/terms",
    changeFrequency: "yearly",
    priority: 0.3,
    // Static page - use fixed date or omit lastModified
  },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://personai.review");

  return sitemapRoutes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    ...(route.lastModified && { lastModified: route.lastModified }),
  }));
}
