import * as React from "react";
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
  onChange: (value: string | undefined) => void;
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
      <div
        role="radiogroup"
        aria-label={question.prompt}
        className="question-card-focus-gradient grid gap-2 p-1 outline-none"
        tabIndex={-1} // CardContent stays the single tab stop; we handle keyboard at the card level
      >
        {question.config.options.map((option, _optionIndex) => {
          const isSelected = value === option.value;
          return (
            <motion.div
              key={option.value}
              whileTap={{ scale: 0.99 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.3 }}
              className={cn(
                "group relative flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all duration-300",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border/50 hover:border-primary/50 hover:bg-primary/5",
                disabled && "cursor-not-allowed opacity-50",
              )}
              onClick={() => {
                if (disabled) return;
                if (isSelected) {
                  onChange(undefined);
                  return;
                }
                onChange(option.value);
              }}
              role="radio"
              aria-checked={isSelected}
              aria-disabled={disabled}
              tabIndex={-1}
            >
              <Label
                htmlFor={option.value}
                className="pointer-events-none flex w-full cursor-pointer items-center gap-3"
              >
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
              </Label>

              {/* Selection Highlight Effect */}
              {isSelected && (
                <motion.div
                  layoutId={`selection-highlight-${question.id}`}
                  className="border-primary pointer-events-none absolute inset-0 rounded-lg border-2"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{
                    type: "spring",
                    stiffness: 250,
                    damping: 25,
                  }}
                  style={{ willChange: "transform, opacity" }}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </QuestionCard>
  );
}
