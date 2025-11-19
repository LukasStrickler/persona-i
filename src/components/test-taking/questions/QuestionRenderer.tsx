"use client";

import * as React from "react";
import { SingleChoiceQuestion } from "./SingleChoiceQuestion";
import { ScalarQuestion } from "./ScalarQuestion";
import { BooleanQuestion } from "./BooleanQuestion";
import { TextQuestion } from "./TextQuestion";
import { MultiChoiceQuestion } from "./MultiChoiceQuestion";
import {
  QuestionTypeCode,
  isQuestionTypeCode,
  type ScalarConfig,
  type SingleChoiceConfig,
  type BooleanConfig,
  type TextConfig,
  type MultiChoiceConfig,
} from "@/lib/types/question-types";

export interface Question {
  id: string;
  prompt: string;
  questionTypeCode: string;
  configJson: unknown;
}

export interface QuestionRendererProps {
  question: Question;
  value?: string | number | boolean | string[];
  onChange: (value: string | number | boolean | string[]) => void;
  disabled?: boolean;
  questionNumber?: number;
}

/**
 * Factory component that renders the appropriate question component
 * based on the question type
 */
export function QuestionRenderer({
  question,
  value,
  onChange,
  disabled = false,
  questionNumber,
}: QuestionRendererProps) {
  // Validate question type
  if (!isQuestionTypeCode(question.questionTypeCode)) {
    return (
      <div className="border-destructive rounded-md border p-4">
        <p className="text-destructive">
          Unknown question type: {question.questionTypeCode}
        </p>
      </div>
    );
  }

  const typeCode = question.questionTypeCode;

  // Parse config based on type
  const config = question.configJson;

  // Render appropriate component
  switch (typeCode) {
    case QuestionTypeCode.SINGLE_CHOICE:
      return (
        <SingleChoiceQuestion
          question={{
            id: question.id,
            prompt: question.prompt,
            config: config as SingleChoiceConfig,
          }}
          value={value as string | undefined}
          onChange={(val) => onChange(val)}
          disabled={disabled}
          questionNumber={questionNumber}
        />
      );

    case QuestionTypeCode.SCALAR:
      return (
        <ScalarQuestion
          question={{
            id: question.id,
            prompt: question.prompt,
            config: config as ScalarConfig,
          }}
          value={value as number | undefined}
          onChange={(val) => onChange(val)}
          disabled={disabled}
          questionNumber={questionNumber}
        />
      );

    case QuestionTypeCode.BOOLEAN:
      return (
        <BooleanQuestion
          question={{
            id: question.id,
            prompt: question.prompt,
            config: config as BooleanConfig,
          }}
          value={value as boolean | undefined}
          onChange={(val) => onChange(val)}
          disabled={disabled}
          questionNumber={questionNumber}
        />
      );

    case QuestionTypeCode.TEXT:
      return (
        <TextQuestion
          question={{
            id: question.id,
            prompt: question.prompt,
            config: config as TextConfig,
          }}
          value={value as string | undefined}
          onChange={(val) => onChange(val)}
          disabled={disabled}
          questionNumber={questionNumber}
        />
      );

    case QuestionTypeCode.MULTI_CHOICE:
      return (
        <MultiChoiceQuestion
          question={{
            id: question.id,
            prompt: question.prompt,
            config: config as MultiChoiceConfig,
          }}
          value={value as string[] | undefined}
          onChange={(val) => onChange(val)}
          disabled={disabled}
          questionNumber={questionNumber}
        />
      );

    default:
      return (
        <div className="border-destructive rounded-md border p-4">
          <p className="text-destructive">
            Unsupported question type: {typeCode}
          </p>
        </div>
      );
  }
}
