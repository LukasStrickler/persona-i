"use client";

import { useState, useEffect, useMemo } from "react";
import {
  useQuestions,
  useHumanResponses,
  useQuestionnaireSlug,
  useModelResponses,
} from "@/stores/selectors";
import { createTestAnalysisStore } from "@/stores/useTestAnalysisStore";
import { QuestionResponseChart } from "./QuestionResponseChart";
import { ModelComparisonChart } from "./ModelComparisonChart";
import { ResponseDistributionChart } from "./ResponseDistributionChart";
import { UserVsModelsChart } from "./UserVsModelsChart";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

/**
 * Example showcase of all chart components
 * Displays charts for the first available question with data
 */
export function ChartExamples() {
  const [isHydrated, setIsHydrated] = useState(false);
  const slug = useQuestionnaireSlug();
  const store = createTestAnalysisStore(slug);

  // Wait for Zustand persist to hydrate from localStorage
  useEffect(() => {
    const unsubscribe = store.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });

    // If already hydrated, set immediately
    if (store.persist.hasHydrated()) {
      setIsHydrated(true);
    }

    return unsubscribe;
  }, [store]);

  const questions = useQuestions();
  const humanResponses = useHumanResponses();
  const modelResponses = useModelResponses();

  // Memoize finding the first question with data to avoid calling getState() during render
  const questionWithData = useMemo(() => {
    if (!isHydrated) return null;

    return questions.find((q) => {
      // Check if any model or user has responded to this question
      const hasModelResponse = modelResponses.some((session) =>
        session.responses.has(q.id),
      );
      const hasUserResponse = humanResponses.some((session) =>
        session.responses.has(q.id),
      );
      return hasModelResponse || hasUserResponse;
    });
  }, [questions, modelResponses, humanResponses, isHydrated]);

  // Get first user session ID if available
  const firstUserSessionId =
    humanResponses.length > 0 ? humanResponses[0]?.sessionId : null;

  if (!questionWithData) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          No question data available yet. Complete a test or wait for model
          responses to load to see chart examples.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Badge variant="outline" className="mb-2">
          Example Question:{" "}
          {questionWithData.code || questionWithData.id.slice(0, 8)}
        </Badge>
        <p className="text-muted-foreground text-sm">
          {questionWithData.prompt}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Question Response Chart */}
        <QuestionResponseChart questionId={questionWithData.id} />

        {/* Model Comparison Chart */}
        <ModelComparisonChart questionId={questionWithData.id} />

        {/* Response Distribution Chart - Numeric */}
        <ResponseDistributionChart
          questionId={questionWithData.id}
          type="numeric"
        />

        {/* Response Distribution Chart - Categorical */}
        <ResponseDistributionChart
          questionId={questionWithData.id}
          type="categorical"
        />
      </div>

      {/* User vs Models Chart - Only show if we have a user session */}
      {firstUserSessionId && (
        <UserVsModelsChart
          questionId={questionWithData.id}
          sessionId={firstUserSessionId}
        />
      )}

      {!firstUserSessionId && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm">User vs Models Chart</CardTitle>
            <CardDescription className="text-xs">
              Complete a test to see your responses compared with model
              responses
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
