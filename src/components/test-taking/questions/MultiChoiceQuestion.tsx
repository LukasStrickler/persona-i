import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { MultiChoiceConfig } from "@/lib/types/question-types";
import { QuestionCard } from "./QuestionCard";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface MultiChoiceQuestionProps {
  question: {
    id: string;
    prompt: string;
    config: MultiChoiceConfig;
  };
  value?: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  questionNumber?: number;
  focusIndex?: number;
  onFocusIndexChange?: (index: number) => void;
}

export function MultiChoiceQuestion({
  question,
  value = [],
  onChange,
  disabled = false,
  questionNumber,
  focusIndex,
  onFocusIndexChange,
}: MultiChoiceQuestionProps) {
  const selectedValues = React.useMemo(() => new Set(value), [value]);
  const [internalFocusIndex, setInternalFocusIndex] =
    React.useState<number>(-1);

  const resolvedFocusIndex = focusIndex ?? internalFocusIndex;

  const setFocusIndex = (next: number | ((prev: number) => number)) => {
    const nextValue =
      typeof next === "function" ? next(resolvedFocusIndex) : next;

    onFocusIndexChange?.(nextValue);
    if (focusIndex === undefined) {
      setInternalFocusIndex(nextValue);
    }
  };

  // Reset focused index when question changes
  React.useEffect(() => {
    setFocusIndex(-1);
  }, [question.id]);

  const handleOptionToggle = (optionValue: string) => {
    const newSelected = new Set(selectedValues);
    if (newSelected.has(optionValue)) {
      newSelected.delete(optionValue);
    } else {
      // Check max selections constraint
      if (
        question.config.maxSelections &&
        newSelected.size >= question.config.maxSelections
      ) {
        return; // Don't add if max selections reached
      }
      newSelected.add(optionValue);
    }
    onChange(Array.from(newSelected));
  };

  const minSelections = question.config.minSelections ?? 0;
  const maxSelections = question.config.maxSelections;
  const currentCount = selectedValues.size;
  const canSelectMore = maxSelections ? currentCount < maxSelections : true;
  const mustSelectMore = currentCount < minSelections;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const options = question.config.options;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusIndex((prev) => (prev < 0 ? 0 : (prev + 1) % options.length));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusIndex((prev) =>
          prev < 0
            ? options.length - 1
            : (prev - 1 + options.length) % options.length,
        );
        break;
      case " ":
      case "Enter":
        e.preventDefault();
        if (
          resolvedFocusIndex >= 0 &&
          resolvedFocusIndex < options.length &&
          options[resolvedFocusIndex]
        ) {
          handleOptionToggle(options[resolvedFocusIndex].value);
        }
        break;
    }
  };

  return (
    <QuestionCard prompt={question.prompt} questionNumber={questionNumber}>
      <div className="space-y-4">
        {(minSelections > 0 || maxSelections) && (
          <div className="bg-secondary/30 flex w-fit items-center gap-2 rounded-md px-3 py-2 text-sm">
            <div
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                mustSelectMore ? "bg-amber-500" : "bg-primary",
              )}
            />
            <span className="text-muted-foreground">
              {minSelections > 0 && (
                <span>
                  Select at least{" "}
                  <span className="text-foreground font-medium">
                    {minSelections}
                  </span>
                </span>
              )}
              {minSelections > 0 && maxSelections && <span> • </span>}
              {maxSelections && (
                <span>
                  Select up to{" "}
                  <span className="text-foreground font-medium">
                    {maxSelections}
                  </span>
                </span>
              )}
            </span>
            {currentCount > 0 && (
              <span
                className={cn(
                  "ml-1 font-medium",
                  mustSelectMore ? "text-amber-600" : "text-primary",
                )}
              >
                ({currentCount} selected)
              </span>
            )}
          </div>
        )}

        <div
          className="question-card-focus-gradient grid gap-2 p-1 outline-none"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={handleKeyDown}
          onBlur={() => setFocusIndex(-1)}
        >
          {question.config.options.map((option, optionIndex) => {
            const isSelected = selectedValues.has(option.value);
            const isFocused = resolvedFocusIndex === optionIndex;
            // Prevent deselecting when already at the minimum selection count
            const isDisabled =
              disabled ||
              (!isSelected && !canSelectMore) ||
              (isSelected && currentCount <= minSelections);

            return (
              <motion.div
                key={option.value}
                whileTap={{ scale: 0.99 }}
                transition={{ type: "spring", bounce: 0.3, duration: 0.3 }}
                className={cn(
                  "group relative flex transform-gpu cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all duration-300 will-change-transform outline-none select-none",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/50 hover:border-primary/50 hover:bg-primary/5",
                  isFocused &&
                    !isSelected &&
                    "ring-primary/50 bg-primary/5 ring-2",
                  isFocused &&
                    isSelected &&
                    "ring-primary ring-2 ring-offset-2",
                  isDisabled &&
                    "hover:border-border/50 cursor-not-allowed opacity-50 hover:bg-transparent",
                )}
                onClick={() => !isDisabled && handleOptionToggle(option.value)}
                onMouseEnter={() => !disabled && setFocusIndex(optionIndex)}
              >
                <Label
                  htmlFor={`${question.id}-${option.value}`}
                  className="pointer-events-none flex w-full cursor-pointer items-center gap-3"
                >
                  <Checkbox
                    id={`${question.id}-${option.value}`}
                    checked={isSelected}
                    onCheckedChange={() => void 0} // Handled by parent div onClick
                    disabled={isDisabled}
                    className="sr-only"
                    tabIndex={-1}
                  />

                  {/* Custom Checkbox Visual */}
                  <div
                    className={cn(
                      "border-primary/30 ring-offset-background flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "group-hover:border-primary/80",
                    )}
                  >
                    {isSelected && (
                      <motion.svg
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 25,
                        }}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3.5 w-3.5"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </motion.svg>
                    )}
                  </div>

                  <span className="flex-1 text-sm leading-none font-medium sm:text-base">
                    {option.label}
                  </span>
                </Label>

                {/* Selection Highlight Effect */}
                {isSelected && (
                  <motion.div
                    layoutId={`selection-highlight-multi-${question.id}-${option.value}`}
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
      </div>
    </QuestionCard>
  );
}
