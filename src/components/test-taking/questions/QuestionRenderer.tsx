"use client";

import * as React from "react";
import { z } from "zod";
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

// Zod schemas for runtime validation
const SingleChoiceConfigSchema = z.object({
  options: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    }),
  ),
});

const MultiChoiceConfigSchema = z.object({
  options: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    }),
  ),
  minSelections: z.number().optional(),
  maxSelections: z.number().optional(),
});

const ScalarConfigSchema = z.object({
  min: z.number(),
  max: z.number(),
  step: z.number().optional(),
  labels: z
    .object({
      min: z.string(),
      max: z.string(),
    })
    .optional(),
});

const BooleanConfigSchema = z.object({
  trueLabel: z.string().optional(),
  falseLabel: z.string().optional(),
});

const TextConfigSchema = z.object({
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  placeholder: z.string().optional(),
  multiline: z.boolean().optional(),
});

export interface Question {
  id: string;
  prompt: string;
  questionTypeCode: string;
  configJson: unknown;
}

export interface QuestionRendererProps {
  question: Question;
  value?: string | number | boolean | string[];
  onChange: (value: string | number | boolean | string[] | undefined) => void;
  disabled?: boolean;
  questionNumber?: number;
  multiChoiceFocusIndex?: number;
  onMultiChoiceFocusIndexChange?: (index: number) => void;
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
  multiChoiceFocusIndex,
  onMultiChoiceFocusIndexChange,
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

  // Render appropriate component with runtime validation
  switch (typeCode) {
    case QuestionTypeCode.SINGLE_CHOICE: {
      const parseResult = SingleChoiceConfigSchema.safeParse(config);
      if (!parseResult.success) {
        return (
          <div className="border-destructive rounded-md border p-4">
            <p className="text-destructive">
              Invalid question configuration: {parseResult.error.message}
            </p>
          </div>
        );
      }
      return (
        <SingleChoiceQuestion
          question={{
            id: question.id,
            prompt: question.prompt,
            config: parseResult.data as SingleChoiceConfig,
          }}
          value={value as string | undefined}
          onChange={(val) => onChange(val)}
          disabled={disabled}
          questionNumber={questionNumber}
        />
      );
    }

    case QuestionTypeCode.SCALAR: {
      const parseResult = ScalarConfigSchema.safeParse(config);
      if (!parseResult.success) {
        return (
          <div className="border-destructive rounded-md border p-4">
            <p className="text-destructive">
              Invalid question configuration: {parseResult.error.message}
            </p>
          </div>
        );
      }
      return (
        <ScalarQuestion
          question={{
            id: question.id,
            prompt: question.prompt,
            config: parseResult.data as ScalarConfig,
          }}
          value={value as number | undefined}
          onChange={(val) => onChange(val)}
          disabled={disabled}
          questionNumber={questionNumber}
        />
      );
    }

    case QuestionTypeCode.BOOLEAN: {
      const parseResult = BooleanConfigSchema.safeParse(config);
      if (!parseResult.success) {
        return (
          <div className="border-destructive rounded-md border p-4">
            <p className="text-destructive">
              Invalid question configuration: {parseResult.error.message}
            </p>
          </div>
        );
      }
      return (
        <BooleanQuestion
          question={{
            id: question.id,
            prompt: question.prompt,
            config: parseResult.data as BooleanConfig,
          }}
          value={value as boolean | undefined}
          onChange={(val) => onChange(val)}
          disabled={disabled}
          questionNumber={questionNumber}
        />
      );
    }

    case QuestionTypeCode.TEXT: {
      const parseResult = TextConfigSchema.safeParse(config);
      if (!parseResult.success) {
        return (
          <div className="border-destructive rounded-md border p-4">
            <p className="text-destructive">
              Invalid question configuration: {parseResult.error.message}
            </p>
          </div>
        );
      }
      return (
        <TextQuestion
          question={{
            id: question.id,
            prompt: question.prompt,
            config: parseResult.data as TextConfig,
          }}
          value={value as string | undefined}
          onChange={(val) => onChange(val)}
          disabled={disabled}
          questionNumber={questionNumber}
        />
      );
    }

    case QuestionTypeCode.MULTI_CHOICE: {
      const parseResult = MultiChoiceConfigSchema.safeParse(config);
      if (!parseResult.success) {
        return (
          <div className="border-destructive rounded-md border p-4">
            <p className="text-destructive">
              Invalid question configuration: {parseResult.error.message}
            </p>
          </div>
        );
      }
      return (
        <MultiChoiceQuestion
          question={{
            id: question.id,
            prompt: question.prompt,
            config: parseResult.data as MultiChoiceConfig,
          }}
          value={value as string[] | undefined}
          onChange={(val) => onChange(val)}
          disabled={disabled}
          questionNumber={questionNumber}
          focusIndex={multiChoiceFocusIndex}
          onFocusIndexChange={onMultiChoiceFocusIndexChange}
        />
      );
    }

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
