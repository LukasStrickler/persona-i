import * as React from "react";
import { Label } from "@/components/ui/label";
import type { BooleanConfig } from "@/lib/types/question-types";
import { QuestionCard } from "./QuestionCard";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function handleBooleanKeyboardNavigation(
  event: React.KeyboardEvent<HTMLDivElement>,
  questionId: string,
  currentValue: boolean | undefined,
  onResponseChange: (questionId: string, value: boolean | undefined) => void,
): boolean {
  // Boolean (yes/no) cards: arrows pick a side, Enter/Space toggles
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    onResponseChange(questionId, true);
    return true;
  }
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    onResponseChange(questionId, false);
    return true;
  }
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (typeof currentValue === "boolean") {
      onResponseChange(questionId, undefined);
    } else {
      onResponseChange(questionId, true);
    }
    return true;
  }
  return false;
}

export interface BooleanQuestionProps {
  question: {
    id: string;
    prompt: string;
    config: BooleanConfig;
  };
  value?: boolean;
  onChange: (value: boolean | undefined) => void;
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        onChange(true);
        break;
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        onChange(false);
        break;
      default:
        break;
    }
  };

  return (
    <QuestionCard prompt={question.prompt} questionNumber={questionNumber}>
      <div
        role="radiogroup"
        aria-label={question.prompt}
        className="question-card-focus-gradient grid grid-cols-2 gap-2 p-1 outline-none"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
      >
        {options.map((option, _index) => {
          const isSelected =
            (value === undefined ? undefined : value ? "true" : "false") ===
            option.value;
          return (
            <motion.div
              key={option.value}
              whileTap={{ scale: 0.975 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.3 }}
              className={cn(
                "group relative mx-auto flex w-16 cursor-pointer items-center justify-center gap-2 rounded-lg border p-2 text-center transition-all duration-400 md:w-48",
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
                handleValueChange(option.value);
              }}
            >
              <Label
                htmlFor={`${question.id}-${option.value}`}
                className="pointer-events-none flex h-full w-full cursor-pointer items-center justify-center"
              >
                <span
                  className={cn(
                    "z-10 text-sm font-medium transition-colors sm:text-base",
                    isSelected ? "text-primary" : "text-foreground/80",
                  )}
                >
                  {option.label}
                </span>
              </Label>

              {/* Selection Highlight Effect */}
              {isSelected && (
                <motion.div
                  layoutId={`selection-highlight-bool-${question.id}`}
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
