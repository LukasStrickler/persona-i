"use client";

import { getModelComparison } from "@/stores/analysis-helpers";
import { useQuestionnaireSlug } from "@/stores/selectors";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ModelComparisonChartProps {
  questionId: string;
}

/**
 * Example chart component comparing all models side-by-side
 */
export function ModelComparisonChart({
  questionId,
}: ModelComparisonChartProps) {
  const slug = useQuestionnaireSlug();
  const models = getModelComparison(questionId, slug);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model Comparison</CardTitle>
        <CardDescription>
          Compare all models' responses for this question
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {models.map((model) => (
            <div
              key={model.modelId}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <Badge variant="outline">{model.displayName}</Badge>
              <span className="font-mono text-sm">{String(model.value)}</span>
            </div>
          ))}
          {models.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No model responses available
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
