"use client";

import * as React from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { SingleChoiceConfig } from "@/lib/types/question-types";
import { QuestionCard } from "./QuestionCard";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface SingleChoiceQuestionProps {
  question: {
    id: string;
    prompt: string;
    config: SingleChoiceConfig;
  };
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  questionNumber?: number;
}

export function SingleChoiceQuestion({
  question,
  value,
  onChange,
  disabled = false,
  questionNumber,
}: SingleChoiceQuestionProps) {
  return (
    <QuestionCard prompt={question.prompt} questionNumber={questionNumber}>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        className="grid gap-2"
      >
        {question.config.options.map((option) => {
          const isSelected = value === option.value;
          return (
            <motion.div
              key={option.value}
              whileTap={{ scale: 0.99 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.3 }}
            >
              <Label
                htmlFor={option.value}
                className={cn(
                  "group relative flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all duration-300",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/50 hover:border-primary/50 hover:bg-primary/5",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <RadioGroupItem
                  value={option.value}
                  id={option.value}
                  className="sr-only"
                />
                <div
                  className={cn(
                    "border-primary/30 ring-offset-background group-hover:border-primary/80 h-4 w-4 shrink-0 rounded-full border transition-colors",
                    isSelected &&
                      "border-primary bg-primary text-primary-foreground",
                  )}
                >
                  {isSelected && (
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="bg-primary-foreground h-2 w-2 rounded-full" />
                    </div>
                  )}
                </div>

                <span className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 sm:text-base">
                  {option.label}
                </span>

                {/* Selection Highlight Effect */}
                {isSelected && (
                  <motion.div
                    layoutId={`selection-highlight-${question.id}`}
                    className="border-primary pointer-events-none absolute inset-0 rounded-lg border-2"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 250, damping: 25 }}
                  />
                )}
              </Label>
            </motion.div>
          );
        })}
      </RadioGroup>
    </QuestionCard>
  );
}
