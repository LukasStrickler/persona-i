"use client";

import { getResponseDistribution } from "@/stores/analysis-helpers";
import { useQuestionnaireSlug } from "@/stores/selectors";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ResponseDistributionChartProps {
  questionId: string;
  type?: "numeric" | "categorical";
}

/**
 * Example chart component showing response distribution
 * Can be used with recharts for visual charts
 */
export function ResponseDistributionChart({
  questionId,
  type = "numeric",
}: ResponseDistributionChartProps) {
  const slug = useQuestionnaireSlug();
  const distribution = getResponseDistribution(questionId, slug, type);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Response Distribution</CardTitle>
        <CardDescription>
          Distribution of responses for this question
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {type === "numeric"
            ? // Histogram data for numeric values
              distribution.map((bin, index) => {
                if ("count" in bin) {
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {bin.label}
                        </span>
                        <span className="font-semibold">{bin.count}</span>
                      </div>
                      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full"
                          style={{
                            width: `${
                              (bin.count /
                                Math.max(
                                  ...distribution
                                    .filter(
                                      (
                                        b,
                                      ): b is {
                                        bin: number;
                                        count: number;
                                        label: string;
                                      } => "count" in b,
                                    )
                                    .map((b) => b.count),
                                  1,
                                )) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                }
                return null;
              })
            : // Categorical distribution
              distribution.map((item, index) => {
                if ("value" in item) {
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-md border p-2"
                    >
                      <span className="text-sm">{item.label}</span>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                  );
                }
                return null;
              })}
          {distribution.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No distribution data available
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
