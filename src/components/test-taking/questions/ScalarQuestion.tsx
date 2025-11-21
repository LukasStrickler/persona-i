"use client";

import * as React from "react";
import { SpringSlider } from "@/components/ui/spring-slider";
import type { ScalarConfig } from "@/lib/types/question-types";
import { QuestionCard } from "./QuestionCard";
import { motion } from "framer-motion";

const SLIDER_CONTROL_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

export function handleScalarKeyboardNavigation(
  event: React.KeyboardEvent<HTMLDivElement>,
  cardContentEl: HTMLElement,
): boolean {
  // Forward slider keys if needed
  if (SLIDER_CONTROL_KEYS.has(event.key)) {
    const sliderThumb =
      cardContentEl.querySelector<HTMLElement>('[role="slider"]');
    // Only forward if the slider thumb itself isn't already focused
    if (sliderThumb && document.activeElement !== sliderThumb) {
      event.preventDefault();
      const forwardedEvent = new KeyboardEvent("keydown", {
        key: event.key,
        code: event.code,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        bubbles: true,
        cancelable: true,
      });
      sliderThumb.dispatchEvent(forwardedEvent);
      return true;
    }
  }
  return false;
}

export interface ScalarQuestionProps {
  question: {
    id: string;
    prompt: string;
    config: ScalarConfig;
  };
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  questionNumber?: number;
}

export function ScalarQuestion({
  question,
  value,
  onChange,
  disabled = false,
  questionNumber,
}: ScalarQuestionProps) {
  const min = question.config.min;
  const max = question.config.max;
  const step = question.config.step ?? 1;

  // Local state for smooth sliding
  const [localValue, setLocalValue] = React.useState<number>(value ?? min);
  const [isDragging, setIsDragging] = React.useState(false);

  // Sync local state with prop value when not dragging
  React.useEffect(() => {
    if (!isDragging && value !== undefined) {
      setLocalValue(value);
    }
  }, [value, isDragging]);

  const handleValueChange = (newValue: number) => {
    setLocalValue(newValue);
  };

  const handleValueCommit = (newValue: number) => {
    const rawValue = newValue;
    // Snap to the nearest step
    const snappedValue = Math.round((rawValue - min) / step) * step + min;
    // Clamp to ensure within bounds (though slider handles this mostly)
    const finalValue = Math.min(Math.max(snappedValue, min), max);

    setLocalValue(finalValue);
    onChange(finalValue);
    // Delay resetting dragging state to allow for a "pulse" animation on click
    setTimeout(() => {
      setIsDragging(false);
    }, 300);
  };

  // Display value is always the snapped version of the local value
  // This ensures the user sees what they are actually selecting (e.g. "5" not "5.42")
  const displayValue = Math.round((localValue - min) / step) * step + min;

  return (
    <QuestionCard prompt={question.prompt} questionNumber={questionNumber}>
      <div className="space-y-2 pt-1">
        <div className="relative px-1">
          <SpringSlider
            value={localValue}
            onPointerDown={() => setIsDragging(true)}
            onValueChange={(val) => {
              setIsDragging(true);
              handleValueChange(val);
            }}
            onValueCommit={(val) => handleValueCommit(val)}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className="w-full py-2"
          />
        </div>

        {/* Labels & Value */}
        <div className="text-muted-foreground flex items-end justify-between px-1 text-sm">
          <span className="w-32">{question.config.labels?.min ?? min}</span>

          {/* Center Value */}
          <motion.span
            className="text-primary my-auto font-mono font-medium"
            animate={{
              opacity: isDragging ? 1 : 0.7,
              scale: isDragging ? 1.2 : 1,
            }}
            transition={{ duration: 0.2 }}
          >
            {displayValue}
          </motion.span>

          <span className="w-32 text-right">
            {question.config.labels?.max ?? max}
          </span>
        </div>
      </div>
    </QuestionCard>
  );
}
