import * as React from "react";
import type { QuestionnaireItem } from "@/lib/types/questionnaire-responses";
import { resolveQuestionOptions } from "@/lib/utils/questionnaire-responses";

interface UseQuestionFocusParams {
  currentCategory:
    | {
        items: Array<QuestionnaireItem>;
      }
    | undefined;
  responses: Record<string, string | number | boolean | string[]>;
}

export function useQuestionFocus({
  currentCategory,
  responses,
}: UseQuestionFocusParams) {
  const [multiFocusIndex, setMultiFocusIndex] = React.useState<
    Record<string, number>
  >({});
  const [singleFocusIndex, setSingleFocusIndex] = React.useState<
    Record<string, number>
  >({});

  // Helper to create focus updater functions
  const createFocusUpdater = React.useCallback(
    (setter: React.Dispatch<React.SetStateAction<Record<string, number>>>) => {
      return (questionId: string, index: number) => {
        setter((prev) => ({
          ...prev,
          [questionId]: index,
        }));
      };
    },
    [],
  );

  // Create focus updaters for single and multi choice
  const updateSingleFocus = React.useMemo(
    () => createFocusUpdater(setSingleFocusIndex),
    [createFocusUpdater],
  );
  const updateMultiFocus = React.useMemo(
    () => createFocusUpdater(setMultiFocusIndex),
    [createFocusUpdater],
  );

  // Reset focus when switching categories
  const resetFocus = React.useCallback(() => {
    setSingleFocusIndex({});
    setMultiFocusIndex({});
  }, []);

  // Keep virtual focus for single-choice aligned with the selected answer
  React.useEffect(() => {
    setSingleFocusIndex((prev) => {
      let updated = false;
      const next: Record<string, number> = { ...prev };

      currentCategory?.items?.forEach((item) => {
        if (item.question.questionTypeCode !== "single_choice") return;

        const options = resolveQuestionOptions(item.question);
        const selectedValue = responses[item.question.id];
        if (typeof selectedValue !== "string") return;

        const idx = options.findIndex((opt) => opt.value === selectedValue);
        if (idx >= 0 && next[item.question.id] !== idx) {
          next[item.question.id] = idx;
          updated = true;
        }
      });

      return updated ? next : prev;
    });
  }, [responses, currentCategory]);

  return {
    singleFocusIndex,
    multiFocusIndex,
    setSingleFocusIndex,
    setMultiFocusIndex,
    updateSingleFocus,
    updateMultiFocus,
    resetFocus,
  };
}
