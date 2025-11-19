"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Props for the TestAnalysisPageSkeleton component
 */
export interface TestAnalysisPageSkeletonProps {
  /** Optional title to display immediately (from SSR) */
  title?: string;
  /** Optional description to display immediately (from SSR) */
  description?: string;
}

/**
 * Generic skeleton loading component for test analysis pages
 * Reusable across different questionnaire/test pages
 *
 * Features:
 * - Accepts title and description from SSR to show immediately
 * - Generic layout that doesn't match specific UI elements
 * - Responsive design (mobile/desktop)
 * - Soft border colors for better visual appearance
 */
export function TestAnalysisPageSkeleton({
  title,
  description,
}: TestAnalysisPageSkeletonProps) {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-16 sm:py-24">
      <div className="space-y-8">
        {/* Header area - show real title/description if available */}
        <div className="mb-8 space-y-4">
          {title ? (
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {title}
            </h1>
          ) : (
            <Skeleton className="h-10 w-3/4 sm:h-12 sm:w-1/2" />
          )}
          {description ? (
            <p className="text-muted-foreground text-lg">{description}</p>
          ) : title ? (
            <Skeleton className="h-5 w-full max-w-2xl" />
          ) : (
            <Skeleton className="h-5 w-full max-w-2xl" />
          )}
        </div>

        {/* Content cards - generic grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="border-border/30 space-y-4 rounded-lg border p-6"
            >
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom section */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </main>
  );
}
