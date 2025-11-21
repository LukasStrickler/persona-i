import * as React from "react";
import { api } from "@/components/providers/TRPCProvider";
import { useDebounceCallback } from "@/hooks/use-debounce-callback";
import type { QuestionnaireItem } from "@/lib/types/questionnaire-responses";
import { findOptionIdByValue } from "@/lib/utils/questionnaire-responses";

interface UseSaveResponseParams {
  sessionData: {
    items: Array<QuestionnaireItem>;
  };
  sessionId: string;
}

export function useSaveResponse({
  sessionData,
  sessionId,
}: UseSaveResponseParams) {
  const saveResponse = api.questionnaires.saveResponse.useMutation();

  const saveResponseHandler = React.useCallback(
    async (
      questionId: string,
      value: string | number | boolean | string[] | undefined,
    ) => {
      const question = sessionData.items.find(
        (item) => item.question.id === questionId,
      )?.question;

      if (!question) {
        return;
      }

      // Handle multi-choice differently - store array in rawPayloadJson
      if (
        question.questionTypeCode === "multi_choice" &&
        Array.isArray(value)
      ) {
        try {
          await saveResponse.mutateAsync({
            sessionId,
            questionId,
            value, // TypeScript knows this is string[] from the Array.isArray check
            selectedOptionIds: value
              .map((val) => findOptionIdByValue(question, val))
              .filter((id): id is string => id !== undefined),
          });
        } catch (error: unknown) {
          console.error("Failed to save response:", error);
        }
        return;
      }

      // Handle clears: send a type-compatible null-ish value so the DB stores nulls
      let normalizedValue: string | number | boolean | string[];

      if (value === undefined) {
        if (question.questionTypeCode === "multi_choice") {
          normalizedValue = [];
        } else if (question.questionTypeCode === "single_choice") {
          normalizedValue = false; // non-string so valueText becomes null
        } else if (question.questionTypeCode === "boolean") {
          normalizedValue = "" as unknown as string; // non-boolean so valueBoolean becomes null
        } else {
          // For text/scalar we currently don't support clearing via keyboard toggle
          return;
        }
      } else {
        normalizedValue = value;
      }

      // Handle single-choice, scalar, boolean, text
      const optionId =
        question.questionTypeCode === "single_choice" &&
        typeof value === "string"
          ? findOptionIdByValue(question, value)
          : undefined;

      try {
        await saveResponse.mutateAsync({
          sessionId,
          questionId,
          value: normalizedValue,
          selectedOptionId: optionId,
        });
      } catch (error: unknown) {
        console.error("Failed to save response:", error);
      }
    },
    [sessionData.items, saveResponse, sessionId],
  );

  const [debouncedSave, flushDebounced] = useDebounceCallback(
    (questionId: unknown, value: unknown) => {
      void saveResponseHandler(
        questionId as string,
        value as string | number | boolean | string[] | undefined,
      );
    },
    500,
  );

  return {
    saveResponseHandler,
    debouncedSave,
    flushDebounced,
  };
}
