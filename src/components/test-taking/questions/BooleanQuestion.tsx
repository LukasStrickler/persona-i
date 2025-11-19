"use client";

import * as React from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { BooleanConfig } from "@/lib/types/question-types";
import { QuestionCard } from "./QuestionCard";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface BooleanQuestionProps {
  question: {
    id: string;
    prompt: string;
    config: BooleanConfig;
  };
  value?: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  questionNumber?: number;
}

export function BooleanQuestion({
  question,
  value,
  onChange,
  disabled = false,
  questionNumber,
}: BooleanQuestionProps) {
  const trueLabel = question.config.trueLabel ?? "Yes";
  const falseLabel = question.config.falseLabel ?? "No";

  const handleValueChange = (newValue: string) => {
    onChange(newValue === "true");
  };

  const options = [
    { value: "true", label: trueLabel },
    { value: "false", label: falseLabel },
  ];

  return (
    <QuestionCard prompt={question.prompt} questionNumber={questionNumber}>
      <RadioGroup
        value={value === undefined ? undefined : value ? "true" : "false"}
        onValueChange={handleValueChange}
        disabled={disabled}
        className="grid grid-cols-2 gap-2" // L/R layout
      >
        {options.map((option) => {
          const isSelected =
            (value === undefined ? undefined : value ? "true" : "false") ===
            option.value;
          return (
            <motion.div
              key={option.value}
              whileTap={{ scale: 0.975 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.3 }}
            >
              <Label
                htmlFor={`${question.id}-${option.value}`}
                className={cn(
                  "group relative mx-auto flex w-16 cursor-pointer items-center justify-center gap-2 rounded-lg border p-2 text-center transition-all duration-400 md:w-48",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/50 hover:border-primary/50 hover:bg-primary/5",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <RadioGroupItem
                  value={option.value}
                  id={`${question.id}-${option.value}`}
                  className="sr-only"
                />

                <span
                  className={cn(
                    "z-10 text-sm font-medium transition-colors sm:text-base",
                    isSelected ? "text-primary" : "text-foreground/80",
                  )}
                >
                  {option.label}
                </span>

                {/* Selection Highlight Effect */}
                {isSelected && (
                  <motion.div
                    layoutId={`selection-highlight-bool-${question.id}`}
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
