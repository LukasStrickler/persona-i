"use client";

import { getUserVsModels } from "@/stores/analysis-helpers";
import { useQuestionnaireSlug } from "@/stores/selectors";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface UserVsModelsChartProps {
  questionId: string;
  sessionId: string;
}

/**
 * Example chart component comparing user session vs all models
 */
export function UserVsModelsChart({
  questionId,
  sessionId,
}: UserVsModelsChartProps) {
  const slug = useQuestionnaireSlug();
  const { user, models } = getUserVsModels(questionId, sessionId, slug);

  return (
    <Card>
      <CardHeader>
        <CardTitle>User vs Models</CardTitle>
        <CardDescription>
          Compare your response with all model responses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {user && (
            <div className="border-primary bg-primary/5 rounded-md border-2 p-3">
              <div className="flex items-center justify-between">
                <Badge variant="default">Your Response</Badge>
                <span className="font-mono font-semibold">
                  {String(user.value)}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Model Responses</h4>
            {models.map((model) => (
              <div
                key={model.modelId}
                className="flex items-center justify-between rounded-md border p-2 text-sm"
              >
                <Badge variant="outline">{model.displayName}</Badge>
                <span className="font-mono">{String(model.value)}</span>
              </div>
            ))}
            {models.length === 0 && (
              <p className="text-muted-foreground text-sm">
                No model responses available
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
