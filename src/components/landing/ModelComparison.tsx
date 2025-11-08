"use client";

import Link from "next/link";
import { Cell, PolarGrid, RadialBar, RadialBarChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ExternalLink, Sparkles, Award } from "lucide-react";

// Order: Best fitting first (Gemini), then Deepseek, GPT-5, Claude
// This order matches the grid layout: [Fits you best (2-col)] [Gemini] | [Deepseek] [GPT-5] [Claude]
const discData = [
  {
    model: "Gemini 2.5 Pro",
    D: 88,
    I: 72,
    S: 78,
    C: 82,
  },
  {
    model: "Deepseek R1",
    D: 78,
    I: 68,
    S: 85,
    C: 90,
  },
  {
    model: "GPT-5 High",
    D: 85,
    I: 90,
    S: 65,
    C: 88,
  },
  {
    model: "Claude Sonnet 4.5",
    D: 70,
    I: 75,
    S: 92,
    C: 95,
  },
];

// Mock similarity data for "Fits you best" ranking
const similarityRanking = [
  { model: "Gemini 2.5 Pro", similarity: 92 },
  { model: "Deepseek R1", similarity: 87 },
  { model: "GPT-5 High", similarity: 72 },
  { model: "Claude Sonnet 4.5", similarity: 66 },
];

const discDimensions = [
  {
    key: "D",
    label: "Dominance",
    description: "Direct, decisive, results-oriented",
  },
  {
    key: "I",
    label: "Influence",
    description: "Enthusiastic, optimistic, people-oriented",
  },
  {
    key: "S",
    label: "Steadiness",
    description: "Patient, stable, team-oriented",
  },
  {
    key: "C",
    label: "Conscientiousness",
    description: "Analytical, precise, quality-oriented",
  },
];

// Transform data for radial charts (per model)
const getModelRadialData = (modelName: string) => {
  const model = discData.find((m) => m.model === modelName);
  if (!model) return [];

  const colorMap: Record<string, string> = {
    d: "hsl(224 45% 55%)",
    i: "hsl(192 40% 60%)",
    s: "hsl(144 35% 55%)",
    c: "hsl(144 15% 40%)",
  };

  return discDimensions.map((dim) => ({
    dimension: dim.key.toLowerCase(),
    label: dim.label,
    value: model[dim.key as keyof typeof model] as number,
    fill: colorMap[dim.key.toLowerCase()] ?? "hsl(224 45% 55%)",
  }));
};

// Chart config with harmonious colors matching the theme palette
// Based on primary (blue), secondary (cyan), accent (green), and purple variant
const chartConfig = {
  d: {
    label: "Dominance",
    color: "hsl(224 45% 55%)", // Primary blue variant - matches primary
  },
  i: {
    label: "Influence",
    color: "hsl(192 40% 60%)", // Secondary cyan variant - matches secondary
  },
  s: {
    label: "Steadiness",
    color: "hsl(144 35% 55%)", // Accent green variant - matches accent
  },
  c: {
    label: "Conscientiousness",
    color: "hsl(144 15% 40%)", // Dark greenish - less saturated, matches accent hover color
  },
} satisfies ChartConfig;

export function ModelComparison() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 pb-8 sm:pb-12 md:mt-4">
      <div className="text-center">
        <h2 className="mt-0 text-2xl font-bold tracking-tight sm:text-3xl">
          How We Compare Models
        </h2>
        <p className="text-muted-foreground mx-auto mt-1 max-w-2xl text-base">
          Compare AI models across personality dimensions using validated
          assessments
        </p>
      </div>

      <div className="mt-4">
        <Card className="bg-background/40 border-primary/10 gap-2 overflow-hidden pt-3 pb-0">
          <CardHeader className="">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xl">
                  DISC Profile Comparison
                </CardTitle>
                <p className="text-muted-foreground mt-0 text-xs">
                  Dominance, Influence, Steadiness, Conscientiousness
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {discData.map((model) => (
                  <Badge key={model.model} variant="outline">
                    {model.model}
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="border-primary/10 border-t p-2 pt-2 sm:p-4">
            <div className="space-y-4">
              {/* Grid with "Fits you best" card and model charts */}
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
                {/* Fits you best card - spans 2 columns */}
                <Card className="border-primary/10 bg-background/60 flex flex-col gap-0 overflow-hidden pb-2 md:col-span-2">
                  <CardHeader className="pb-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
                          <Award className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            Fits Most People Best
                          </CardTitle>
                          <p className="text-muted-foreground mt-0 text-sm">
                            Ranked by personality similarity across all four
                            DISC dimensions
                          </p>
                        </div>
                      </div>
                      <Button
                        asChild
                        size="default"
                        variant="default"
                        className="hidden shrink-0 underline decoration-white underline-offset-2 md:block"
                      >
                        <Link href="/tests">Start Your Own Test</Link>
                      </Button>
                      <Button
                        asChild
                        size="default"
                        variant="default"
                        className="mx-auto shrink-0 underline decoration-white underline-offset-2 md:hidden"
                      >
                        <Link href="/tests">Start Your Own Test</Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-4 pt-0 md:p-6 md:pt-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-5 md:gap-y-5">
                      {/* Mobile: Show top 3, Desktop: Show all 4 */}
                      <div className="contents md:hidden">
                        {similarityRanking.slice(0, 3).map((item, index) => {
                          const modelData = discData.find(
                            (m) => m.model === item.model,
                          );
                          return (
                            <div
                              key={item.model}
                              className="border-primary/10 bg-background/50 hover:border-primary/20 hover:bg-background/70 flex flex-col gap-3 rounded-lg border p-4 transition-all duration-200"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                  <div className="bg-primary text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-md">
                                    {index + 1}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm leading-tight font-semibold">
                                      {item.model}
                                    </div>
                                    {modelData && (
                                      <div className="text-muted-foreground mt-1 text-xs leading-relaxed">
                                        {index === 0 &&
                                          "Strong match across all dimensions"}
                                        {index === 1 &&
                                          "High compatibility with your profile"}
                                        {index === 2 &&
                                          "Good alignment with key traits"}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex shrink-0 flex-col items-end">
                                  <span className="text-primary text-xl font-bold">
                                    {item.similarity}%
                                  </span>
                                  <span className="text-muted-foreground text-xs">
                                    match
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-0">
                                <div className="bg-muted relative h-3 w-full overflow-hidden rounded-full">
                                  <div
                                    className="bg-primary h-full transition-all duration-700 ease-out"
                                    style={{ width: `${item.similarity}%` }}
                                    aria-label={`${item.model} similarity: ${item.similarity}%`}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Desktop: Show all 4 */}
                      <div className="hidden md:contents">
                        {similarityRanking.map((item, index) => {
                          const modelData = discData.find(
                            (m) => m.model === item.model,
                          );
                          return (
                            <div
                              key={item.model}
                              className="border-primary/10 bg-background/50 hover:border-primary/20 hover:bg-background/70 flex flex-col gap-3 rounded-lg border p-4 transition-all duration-200"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                  <div className="bg-primary text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-md">
                                    {index + 1}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm leading-tight font-semibold">
                                      {item.model}
                                    </div>
                                    {modelData && (
                                      <div className="text-muted-foreground mt-1 text-xs leading-relaxed">
                                        {index === 0 &&
                                          "Strong match across all dimensions"}
                                        {index === 1 &&
                                          "High compatibility with your profile"}
                                        {index === 2 &&
                                          "Good alignment with key traits"}
                                        {index === 3 &&
                                          "Moderate similarity overall"}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex shrink-0 flex-col items-end">
                                  <span className="text-primary text-xl font-bold">
                                    {item.similarity}%
                                  </span>
                                  <span className="text-muted-foreground text-xs">
                                    match
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-0">
                                <div className="bg-muted relative h-3 w-full overflow-hidden rounded-full">
                                  <div
                                    className="bg-primary h-full transition-all duration-700 ease-out"
                                    style={{ width: `${item.similarity}%` }}
                                    aria-label={`${item.model} similarity: ${item.similarity}%`}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Model charts - 4 charts in remaining grid positions */}
                {discData.map((model, modelIndex) => {
                  const radialData = getModelRadialData(model.model);
                  const isFirstModel = modelIndex === 0;

                  return (
                    <Card
                      key={model.model}
                      className={`border-primary/10 bg-background/60 flex flex-col gap-0 overflow-hidden ${isFirstModel ? "block" : "hidden md:block"}`}
                    >
                      <CardHeader className="mb-0 items-center pt-0 pb-0">
                        <CardTitle className="text-lg">{model.model}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 pt-0 pb-2">
                        <ChartContainer
                          config={chartConfig}
                          className="mx-auto aspect-square max-h-[180px] md:max-h-[240px]"
                        >
                          <RadialBarChart
                            data={[
                              ...radialData,
                              {
                                dimension: "max",
                                value: 100,
                                fill: "transparent",
                              },
                            ]}
                            innerRadius={30}
                            outerRadius={100}
                            startAngle={90}
                            endAngle={-270}
                          >
                            <ChartTooltip
                              cursor={false}
                              content={(props) => {
                                if (!props || !props.payload || !props.active) {
                                  return null;
                                }
                                // Filter out the "max" entry from the payload
                                const filteredPayload = props.payload.filter(
                                  (item) => {
                                    const dataEntry = item.payload as {
                                      dimension?: string;
                                    };
                                    return (
                                      dataEntry?.dimension !== "max" &&
                                      item.name !== "max"
                                    );
                                  },
                                );
                                // If no valid items after filtering, don't show tooltip
                                if (filteredPayload.length === 0) {
                                  return null;
                                }
                                // Return ChartTooltipContent with filtered payload
                                return (
                                  <ChartTooltipContent
                                    active={props.active}
                                    payload={filteredPayload}
                                    label={props.label as string | undefined}
                                    hideLabel
                                    nameKey="dimension"
                                    className="w-24 max-w-24 min-w-0"
                                    formatter={(value, name, item) => {
                                      if (name === "max" || !item) return null;
                                      const numValue =
                                        typeof value === "number"
                                          ? value
                                          : Number(value);
                                      // Access the original data entry from item.payload
                                      const dataEntry = item.payload as {
                                        dimension?: string;
                                        fill?: string;
                                      };
                                      const fillColor =
                                        dataEntry?.fill ?? item.color;
                                      const dimensionStr =
                                        typeof dataEntry?.dimension === "string"
                                          ? dataEntry.dimension
                                          : typeof name === "string"
                                            ? name
                                            : String(name);

                                      return (
                                        <div className="flex items-center gap-1.5">
                                          <div
                                            className="h-2 w-2 shrink-0 rounded-full"
                                            style={{
                                              backgroundColor: fillColor,
                                            }}
                                          />
                                          <span className="text-muted-foreground uppercase">
                                            {dimensionStr.toUpperCase()}:
                                          </span>
                                          <span className="font-semibold">
                                            {numValue}%
                                          </span>
                                        </div>
                                      );
                                    }}
                                  />
                                );
                              }}
                            />
                            <PolarGrid gridType="circle" />
                            <RadialBar
                              dataKey="value"
                              cornerRadius={4}
                              maxBarSize={100}
                            >
                              {[
                                ...radialData,
                                {
                                  dimension: "max",
                                  value: 100,
                                  fill: "transparent",
                                },
                              ].map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    entry.dimension === "max"
                                      ? "transparent"
                                      : entry.fill
                                  }
                                  stroke={
                                    entry.dimension === "max"
                                      ? "transparent"
                                      : undefined
                                  }
                                />
                              ))}
                            </RadialBar>
                          </RadialBarChart>
                        </ChartContainer>
                      </CardContent>
                      <CardContent className="pt-2 pb-3">
                        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs">
                          {radialData.map((item) => (
                            <div
                              key={item.dimension}
                              className="flex items-center gap-1.5"
                            >
                              <div
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{
                                  backgroundColor: item.fill,
                                }}
                              />
                              <span className="text-muted-foreground uppercase">
                                {item.dimension}:
                              </span>
                              <span className="font-semibold">
                                {item.value}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Methodology */}
              <div className="border-primary/10 from-primary/5 to-primary/10 rounded-lg border bg-gradient-to-br p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/20 text-primary mt-[-4px] flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
                    <Sparkles className="py-auto h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-md font-semibold">Our Methodology</h4>
                    <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                      We analyze how each AI model responds to DISC personality
                      test questions and calculate scores across the four
                      dimensions (Dominance, Influence, Steadiness,
                      Conscientiousness) using validated psychological
                      frameworks. This allows us to compare models directly and
                      understand their behavioral patterns.
                    </p>
                    <Link
                      href="/docs"
                      className="text-primary hover:text-primary/80 mt-2 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                    >
                      Learn more about our comparison methods
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
