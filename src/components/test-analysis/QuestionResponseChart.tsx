"use client";

import { useQuestionResponses, useQuestionnaireSlug } from "@/stores/selectors";
import { getQuestionStatistics } from "@/stores/analysis-helpers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface QuestionResponseChartProps {
  questionId: string;
}

/**
 * Example chart component showing all responses for a question
 * Uses analysis helpers for data access
 */
export function QuestionResponseChart({
  questionId,
}: QuestionResponseChartProps) {
  const slug = useQuestionnaireSlug();
  const responses = useQuestionResponses(questionId);
  const models = responses.models;
  const humans = responses.humans;
  const stats = getQuestionStatistics(questionId, slug);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Question Responses</CardTitle>
        <CardDescription>
          All model and user responses for this question
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.mean !== null && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-muted-foreground text-sm">Mean</div>
                <div className="text-lg font-semibold">
                  {stats.mean.toFixed(2)}
                </div>
              </div>
              {stats.median !== null && (
                <div>
                  <div className="text-muted-foreground text-sm">Median</div>
                  <div className="text-lg font-semibold">
                    {stats.median.toFixed(2)}
                  </div>
                </div>
              )}
              {stats.mode !== null && (
                <div>
                  <div className="text-muted-foreground text-sm">Mode</div>
                  <div className="text-lg font-semibold">
                    {String(stats.mode)}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">
              Model Responses ({models.length})
            </h4>
            <div className="space-y-1">
              {models.map((m) => (
                <div
                  key={m.modelId}
                  className="bg-muted flex items-center justify-between rounded-md px-3 py-2 text-sm"
                >
                  <span>{m.displayName}</span>
                  <span className="font-mono">{String(m.value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">
              User Responses ({humans.length})
            </h4>
            <div className="space-y-1">
              {humans.map((h) => (
                <div
                  key={h.sessionId}
                  className="bg-muted flex items-center justify-between rounded-md px-3 py-2 text-sm"
                >
                  <span>{h.displayName}</span>
                  <span className="font-mono">{String(h.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
