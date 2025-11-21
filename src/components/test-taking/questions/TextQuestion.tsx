"use client";

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import type { TextConfig } from "@/lib/types/question-types";
import { QuestionCard } from "./QuestionCard";

export function handleTextKeyboardNavigation(
  _event: React.KeyboardEvent<HTMLDivElement>,
  _questionId: string,
): boolean {
  // Text questions use native textarea behavior, no special handling needed
  return false;
}

export interface TextQuestionProps {
  question: {
    id: string;
    prompt: string;
    config: TextConfig;
  };
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  questionNumber?: number;
}

export function TextQuestion({
  question,
  value,
  onChange,
  disabled = false,
  questionNumber,
}: TextQuestionProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let newValue = e.target.value;

    // Enforce max length if specified
    if (
      question.config.maxLength &&
      newValue.length > question.config.maxLength
    ) {
      newValue = newValue.slice(0, question.config.maxLength);
    }

    onChange(newValue);
  };

  return (
    <QuestionCard prompt={question.prompt} questionNumber={questionNumber}>
      <div className="space-y-3">
        <Textarea
          value={value ?? ""}
          onChange={handleChange}
          disabled={disabled}
          placeholder={question.config.placeholder}
          minLength={question.config.minLength}
          maxLength={question.config.maxLength}
          rows={question.config.multiline ? 4 : 1}
          className="resize-none"
        />
        {question.config.maxLength && (
          <div className="text-muted-foreground text-right text-xs">
            {value?.length ?? 0} / {question.config.maxLength} characters
          </div>
        )}
      </div>
    </QuestionCard>
  );
}
