"use client";

import { useEffect, Component, type ReactNode, useState } from "react";
import { useTestAnalysisData } from "@/hooks/useTestAnalysisData";
import { createTestAnalysisStore } from "@/stores/useTestAnalysisStore";
import { QuestionnaireSlugProvider } from "@/stores/selectors";
import { TestAnalysisPageSkeleton } from "./TestAnalysisPageSkeleton";

interface TestAnalysisClientProps {
  questionnaireSlug: string;
  initialData?: {
    questionnaire?: {
      id: string;
      slug: string;
      title: string;
      version: number;
      versionId: string;
    };
  };
  ssrData?: {
    title?: string;
    description?: string;
  };
  children?: React.ReactNode;
}

class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: (error: Error) => ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: {
    children: ReactNode;
    fallback?: (error: Error) => ReactNode;
  }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("TestAnalysisClient error:", error);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        this.props.fallback?.(this.state.error) ?? (
          <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
            <h2 className="text-destructive text-lg font-semibold">
              Error loading analysis data
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {this.state.error.message}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded-md px-4 py-2 text-sm"
            >
              Try again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Client wrapper component for test analysis
 * Handles store initialization with server data for SSR hydration
 * Uses useTestAnalysisData hook internally for data loading
 *
 * Strategy:
 * - SSR provides only questionnaire metadata (for SEO)
 * - Analysis data (models, users, analysis rules) is fetched client-side
 * - Client-side fetching checks: Zustand cache → React Query cache → API
 * - This ensures fast SSR (~100ms) while maintaining instant client loading
 */
export function TestAnalysisClient({
  questionnaireSlug,
  initialData,
  ssrData,
  children,
}: TestAnalysisClientProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  // Get per-slug store instance
  const store = createTestAnalysisStore(questionnaireSlug);
  const loadQuestionnaireContent = store.getState().loadQuestionnaireContent;

  // Track client-side mount to prevent hydration mismatches
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Optionally initialize questionnaire metadata from SSR
  // Full questionnaire content (questions) is always fetched client-side
  useEffect(() => {
    if (isInitialized || !initialData?.questionnaire) return;

    const storeState = store.getState();
    const currentMeta = storeState.meta;

    // Only initialize if we don't have this exact data already
    const needsInit =
      !currentMeta ||
      currentMeta.id !== initialData.questionnaire.id ||
      currentMeta.version !== initialData.questionnaire.version;

    if (needsInit) {
      // Only cache questionnaire metadata here; questions will be fetched via tRPC
      loadQuestionnaireContent({
        meta: initialData.questionnaire,
        questions: [],
      });
    }

    setIsInitialized(true);
  }, [initialData?.questionnaire?.id]);

  // Use the hook for background syncing and updates
  // This will skip fetching if data is already loaded from SSR
  const { isLoading, isError, syncStatus } = useTestAnalysisData(
    questionnaireSlug,
    initialData,
  );

  if (isError) {
    return (
      <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
        <h2 className="text-destructive text-lg font-semibold">
          Failed to load analysis data
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Please refresh the page to try again.
        </p>
      </div>
    );
  }

  // During SSR and initial client render, always show skeleton to prevent hydration mismatch
  // Only check store state after component has mounted on the client
  if (!isMounted) {
    return (
      <TestAnalysisPageSkeleton
        title={ssrData?.title}
        description={ssrData?.description}
      />
    );
  }

  // Show skeleton loading while initial analysis data is being fetched
  // Check if store has meaningful data to determine if we should show skeleton
  const storeState = store.getState();
  const hasQuestions = storeState.questions.size > 0;
  const hasMeta = !!storeState.meta;

  // Show skeleton if:
  // 1. Hook says we're loading, OR
  // 2. We don't have meta yet, OR
  // 3. We don't have questions yet (even if we have meta from SSR)
  const shouldShowSkeleton = isLoading || !hasMeta || !hasQuestions;

  if (shouldShowSkeleton) {
    return (
      <TestAnalysisPageSkeleton
        title={ssrData?.title}
        description={ssrData?.description}
      />
    );
  }

  return (
    <QuestionnaireSlugProvider value={questionnaireSlug}>
      <ErrorBoundary>
        {children}
        {syncStatus.isSyncing && (
          <div className="bg-primary/90 text-primary-foreground fixed right-4 bottom-4 rounded-md px-3 py-2 text-xs">
            Syncing...
          </div>
        )}
      </ErrorBoundary>
    </QuestionnaireSlugProvider>
  );
}
