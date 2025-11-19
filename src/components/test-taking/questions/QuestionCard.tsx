"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";

export interface QuestionCardProps {
  questionNumber?: number;
  prompt: string;
  children: React.ReactNode;
}

/**
 * Reusable question card component that provides consistent styling
 * for question number badge and prompt across all question types
 */
export function QuestionCard({
  questionNumber,
  prompt,
  children,
}: QuestionCardProps) {
  return (
    <div className="space-y-0">
      <div className="flex items-start gap-4">
        {questionNumber !== undefined && (
          <div className="bg-primary/10 text-primary mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">
            {questionNumber}
          </div>
        )}
        <Label className="pt-1 text-lg leading-snug font-medium">
          {prompt}
        </Label>
      </div>
      <div className="pr-4 pl-4 md:pr-12 md:pl-12">{children}</div>
    </div>
  );
}
