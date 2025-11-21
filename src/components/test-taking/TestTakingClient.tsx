"use client";

import * as React from "react";
import { api } from "@/components/providers/TRPCProvider";
import { QuestionRenderer } from "./questions/QuestionRenderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDebounceCallback } from "@/hooks/use-debounce-callback";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { QuestionnaireItem } from "@/lib/types/questionnaire-responses";
import { useTestCompletion } from "@/hooks/useTestCompletion";
import { buildResponsesPayload } from "@/lib/utils/questionnaire-responses";

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

interface TestTakingClientProps {
  sessionData: {
    session: {
      id: string;
      status: string;
    };
    questionnaire: {
      id: string;
      slug: string;
      title: string;
    };
    items: Array<QuestionnaireItem>; // Keep for backward compatibility
    sections?: Array<{
      name: string;
      items: Array<QuestionnaireItem>;
    }>; // New grouped structure
  };
  sessionId: string;
}

export function TestTakingClient({
  sessionData,
  sessionId,
  slug,
}: TestTakingClientProps & { slug: string }) {
  // Use sections if available, otherwise fall back to items grouped by section
  const sections = React.useMemo(() => {
    if (sessionData.sections && sessionData.sections.length > 0) {
      return sessionData.sections;
    }
    // Fallback: group items by section
    const itemsBySection = new Map<string, QuestionnaireItem[]>();
    for (const item of sessionData.items) {
      const sectionName = item.section ?? "Uncategorized";
      if (!itemsBySection.has(sectionName)) {
        itemsBySection.set(sectionName, []);
      }
      itemsBySection.get(sectionName)?.push(item);
    }
    return Array.from(itemsBySection.entries())
      .map(([name, items]) => ({
        name,
        items: items.sort((a, b) => a.position - b.position),
      }))
      .sort((a, b) => {
        const minA = Math.min(...a.items.map((item) => item.position));
        const minB = Math.min(...b.items.map((item) => item.position));
        return minA - minB;
      });
  }, [sessionData.sections, sessionData.items]);

  const [currentCategoryIndex, setCurrentCategoryIndex] = React.useState(0);
  const [responses, setResponses] = React.useState<
    Record<string, string | number | boolean | string[]>
  >(() => {
    // Initialize from existing responses
    const initial: Record<string, string | number | boolean | string[]> = {};
    for (const item of sessionData.items) {
      if (item.response?.valueType) {
        // Use valueType to directly access the correct field
        switch (item.response.valueType) {
          case "multi_choice":
            if (
              item.response.rawPayloadJson &&
              Array.isArray(item.response.rawPayloadJson)
            ) {
              initial[item.question.id] = item.response
                .rawPayloadJson as string[];
            }
            break;
          case "numeric":
            if (
              item.response.valueNumeric !== null &&
              item.response.valueNumeric !== undefined
            ) {
              initial[item.question.id] = item.response.valueNumeric;
            }
            break;
          case "boolean":
            if (
              item.response.valueBoolean !== null &&
              item.response.valueBoolean !== undefined
            ) {
              initial[item.question.id] = item.response.valueBoolean;
            }
            break;
          case "text":
            if (
              item.response.valueText !== null &&
              item.response.valueText !== undefined
            ) {
              initial[item.question.id] = item.response.valueText;
            }
            break;
          case "option":
            // Find option value from selectedOptionId
            if (item.response.selectedOptionId) {
              const option = item.question.options?.find(
                (o) => o.id === item.response?.selectedOptionId,
              );
              if (option) {
                initial[item.question.id] = option.value;
              }
            }
            break;
        }
      }
    }
    return initial;
  });
  const [activeCardIndex, setActiveCardIndex] = React.useState(0);
  const [multiFocusIndex, setMultiFocusIndex] = React.useState<
    Record<string, number>
  >({});
  const [singleFocusIndex, setSingleFocusIndex] = React.useState<
    Record<string, number>
  >({});
  const cardContentRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const questionCardRefs = React.useRef<Array<HTMLElement | null>>([]);

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
              .map((val) => {
                // Find option IDs for the selected values
                return question.options?.find((o) => o.value === val)?.id;
              })
              .filter((id): id is string => id !== undefined),
          });
        } catch (error) {
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
        question.questionTypeCode === "single_choice"
          ? question.options?.find((o) => o.value === value)?.id
          : undefined;

      try {
        await saveResponse.mutateAsync({
          sessionId,
          questionId,
          value: normalizedValue,
          selectedOptionId: optionId,
        });
      } catch (error) {
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

  const { handleComplete, isCompleting } = useTestCompletion({
    sessionId,
    slug,
    sessionData,
    responses,
    flushDebounced,
  });

  const handleResponseChange = (
    questionId: string,
    value: string | number | boolean | string[] | undefined,
  ) => {
    if (value === undefined) {
      setResponses((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
      debouncedSave(questionId, undefined);
      return;
    }

    setResponses((prev) => ({ ...prev, [questionId]: value }));
    debouncedSave(questionId, value);
  };

  // Beforeunload handler for best-effort auto-save
  // Use refs to avoid recreating handler on every response change
  const responsesRef = React.useRef(responses);
  const sessionDataRef = React.useRef(sessionData);
  const sessionIdRef = React.useRef(sessionId);

  // Keep refs up to date
  React.useEffect(() => {
    responsesRef.current = responses;
    sessionDataRef.current = sessionData;
    sessionIdRef.current = sessionId;
  }, [responses, sessionData, sessionId]);

  // Reset intra-card virtual focus when switching categories
  React.useEffect(() => {
    setSingleFocusIndex({});
    setMultiFocusIndex({});
    const nextLength = sections[currentCategoryIndex]?.items.length ?? 0;
    cardContentRefs.current = Array.from({ length: nextLength }, () => null);
    questionCardRefs.current = Array.from({ length: nextLength }, () => null);
    setActiveCardIndex(0);
  }, [currentCategoryIndex, sections]);

  const resolveOptions = React.useCallback(
    (question: QuestionnaireItem["question"]) => {
      if (Array.isArray(question.options) && question.options.length > 0) {
        return question.options.map((opt) => ({
          value: opt?.value ?? "",
          label: opt?.label ?? "",
        }));
      }

      const configOptions = (
        question.configJson as {
          options?: Array<{ value: string; label: string }>;
        }
      )?.options;
      if (Array.isArray(configOptions)) {
        return configOptions
          .filter((opt) => opt)
          .map((opt) => ({
            value: opt?.value ?? "",
            label: opt?.label ?? "",
          }));
      }

      return [] as Array<{ value: string; label: string }>;
    },
    [],
  );

  const currentCategory = sections[currentCategoryIndex];
  const currentCardCount = currentCategory?.items.length ?? 0;
  const isLastCategory = currentCategoryIndex === sections.length - 1;
  const allQuestionsAnsweredInCategory =
    currentCategory?.items.every(
      (item) => responses[item.question.id] !== undefined,
    ) ?? false;

  // Keep virtual focus for single-choice aligned with the selected answer
  React.useEffect(() => {
    setSingleFocusIndex((prev) => {
      let updated = false;
      const next: Record<string, number> = { ...prev };

      currentCategory?.items?.forEach((item) => {
        if (item.question.questionTypeCode !== "single_choice") return;

        const options = resolveOptions(item.question);
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
  }, [responses, currentCategory, resolveOptions]);

  // Scroll to top when category changes
  React.useEffect(() => {
    const scrollContainer = document.getElementById("main-scroll-container");
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "instant" });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [currentCategoryIndex]);

  React.useEffect(() => {
    const handler = (_e: BeforeUnloadEvent) => {
      const responsesPayload = buildResponsesPayload(
        sessionDataRef.current.items,
        responsesRef.current,
      );
      if (responsesPayload.length === 0) return;

      // Build simple JSON body for dedicated API route
      const body = JSON.stringify({
        sessionId: sessionIdRef.current,
        responses: responsesPayload,
      });

      // Use sendBeacon for best-effort save (works with simple JSON)
      const blob = new Blob([body], { type: "application/json" });
      const url = `/api/save-responses-batch`;

      // Fallback to fetch with keepalive if sendBeacon fails
      if (!navigator.sendBeacon(url, blob)) {
        // Fallback to fetch with keepalive (less reliable but better than nothing)
        fetch(url, {
          method: "POST",
          body,
          headers: { "Content-Type": "application/json" },
          keepalive: true,
        }).catch(() => {
          // Silently fail - this is best effort only
        });
      }
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []); // Empty deps - handler uses refs

  const findQuestionCardElement = React.useCallback(
    (cardContentEl: HTMLElement) => {
      const questionCard =
        cardContentEl.querySelector<HTMLElement>("[data-question-card-root]") ??
        cardContentEl.querySelector<HTMLElement>(":scope > div") ??
        (cardContentEl.firstElementChild instanceof HTMLElement
          ? cardContentEl.firstElementChild
          : null);

      if (questionCard) {
        questionCard.dataset.questionCardRoot ??= "true";
        return questionCard;
      }

      return null;
    },
    [],
  );

  React.useLayoutEffect(() => {
    cardContentRefs.current.length = currentCardCount;
    questionCardRefs.current = cardContentRefs.current.map((cardContentEl) => {
      if (!cardContentEl) return null;
      const cardEl = findQuestionCardElement(cardContentEl);
      if (!cardEl) return null;
      // Keep QuestionCard itself out of the tab order
      cardEl.tabIndex = -1;
      cardEl.classList.add("focusable-question-card");
      cardContentEl.classList.add("focusable-question-card");
      return cardEl;
    });
  }, [activeCardIndex, currentCategoryIndex, findQuestionCardElement]);

  const focusCardByIndex = React.useCallback((index: number) => {
    const cardContent = cardContentRefs.current[index];
    if (!cardContent) return;

    setActiveCardIndex(index);

    cardContent.tabIndex = 0;
    cardContent.focus({ preventScroll: true });
    cardContent.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  // Focus first card when category changes
  React.useEffect(() => {
    // Use requestAnimationFrame to ensure the DOM has updated and the new category is rendered
    let rafId: number;
    const focusFirst = () => {
      // Check if the first card ref exists
      if (cardContentRefs.current[0]) {
        focusCardByIndex(0);
      } else {
        // If not ready, try again next frame (up to a limit, but usually 1 frame is enough)
        rafId = requestAnimationFrame(focusFirst);
      }
    };

    rafId = requestAnimationFrame(focusFirst);

    // Safety timeout to stop polling if something goes wrong
    const safetyTimer = setTimeout(() => cancelAnimationFrame(rafId), 500);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(safetyTimer);
    };
  }, [currentCategoryIndex, focusCardByIndex]);

  const handleCardContentClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>, cardIndex: number) => {
      const cardContentEl = event.currentTarget;
      const target = event.target as HTMLElement | null;

      if (target) {
        const textarea = target.closest("textarea");
        if (textarea instanceof HTMLTextAreaElement) {
          textarea.focus({ preventScroll: true });
          setActiveCardIndex(cardIndex);
          return;
        }
      }

      const sliderThumb =
        cardContentEl.querySelector<HTMLElement>('[role="slider"]');

      if (sliderThumb?.contains(event.target as Node)) {
        return; // Let the thumb handle its own focus
      }

      const questionCard = findQuestionCardElement(cardContentEl);
      if (!questionCard) return;

      const focusTarget =
        cardContentRefs.current[cardIndex] ?? questionCard ?? cardContentEl;

      if (document.activeElement !== focusTarget) {
        focusTarget.focus({ preventScroll: true });
        setActiveCardIndex(cardIndex);
        questionCard.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    },
    [findQuestionCardElement],
  );

  const handleCardContentKeyDown = React.useCallback(
    (
      event: React.KeyboardEvent<HTMLDivElement>,
      cardIndex: number,
      question: QuestionnaireItem["question"],
    ) => {
      const cardContentEl = event.currentTarget;

      if (event.key === "Tab") {
        const isShift = event.shiftKey;
        const isLastCard =
          currentCardCount > 0 && cardIndex === currentCardCount - 1;
        const isFirstCard = cardIndex === 0;

        if (!isShift) {
          if (isLastCard && !isLastCategory && allQuestionsAnsweredInCategory) {
            event.preventDefault();
            setActiveCardIndex(0);
            setCurrentCategoryIndex((prev) =>
              Math.min(prev + 1, sections.length - 1),
            );
            return;
          }

          if (cardIndex < currentCardCount - 1) {
            event.preventDefault();
            focusCardByIndex(cardIndex + 1);
            return;
          }

          // On the very last card, let native tabbing move to footer/actions
          return;
        }

        // Shift + Tab
        if (isFirstCard && currentCategoryIndex > 0) {
          event.preventDefault();
          const prevCategoryLength =
            sections[currentCategoryIndex - 1]?.items.length ?? 0;
          const targetIndex =
            prevCategoryLength > 0 ? prevCategoryLength - 1 : 0;
          setActiveCardIndex(targetIndex);
          setCurrentCategoryIndex((prev) => Math.max(prev - 1, 0));
          window.setTimeout(() => {
            focusCardByIndex(targetIndex);
          }, 120);
          return;
        }

        if (cardIndex > 0) {
          event.preventDefault();
          focusCardByIndex(cardIndex - 1);
        }
        return;
      }

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
          return;
        }
      }

      const questionId = question.id;
      const questionType = question.questionTypeCode;
      const options = resolveOptions(question);
      const currentValue = responses[questionId];

      // Boolean (yes/no) cards: arrows pick a side, Enter/Space toggles
      if (questionType === "boolean") {
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          handleResponseChange(questionId, true);
          return;
        }
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          handleResponseChange(questionId, false);
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (typeof currentValue === "boolean") {
            handleResponseChange(questionId, undefined);
          } else {
            handleResponseChange(questionId, true);
          }
          return;
        }
      }

      // Single choice cards: arrows move selection, Enter/Space confirm
      if (questionType === "single_choice" && options?.length) {
        const currentIndex =
          typeof currentValue === "string"
            ? options.findIndex((o) => o?.value === currentValue)
            : -1;
        const focusedIndexForQuestion =
          singleFocusIndex[questionId] ??
          (currentIndex >= 0 ? currentIndex : 0);

        const updateFocus = (nextIndex: number) => {
          setSingleFocusIndex((prev) => ({
            ...prev,
            [questionId]: nextIndex,
          }));
        };

        const setByIndex = (nextIndex: number) => {
          const target = options[nextIndex];
          if (!target) return;
          updateFocus(nextIndex);
          handleResponseChange(questionId, target.value);
        };

        if (event.key === "ArrowDown" || event.key === "ArrowRight") {
          event.preventDefault();
          const nextIndex =
            focusedIndexForQuestion < 0
              ? 0
              : Math.min(focusedIndexForQuestion + 1, options.length - 1);
          setByIndex(nextIndex);
          return;
        }

        if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
          event.preventDefault();
          const nextIndex =
            focusedIndexForQuestion < 0
              ? options.length - 1
              : Math.max(focusedIndexForQuestion - 1, 0);
          setByIndex(nextIndex);
          return;
        }

        if (event.key === "Home") {
          event.preventDefault();
          setByIndex(0);
          return;
        }

        if (event.key === "End") {
          event.preventDefault();
          setByIndex(options.length - 1);
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          const safeIndex =
            focusedIndexForQuestion >= 0 &&
            focusedIndexForQuestion < options.length
              ? focusedIndexForQuestion
              : currentIndex >= 0
                ? currentIndex
                : 0;
          const target = options[safeIndex];
          if (!target) return;
          if (currentValue === target.value) {
            handleResponseChange(questionId, undefined);
            updateFocus(safeIndex);
            return;
          }
          setByIndex(safeIndex);
          return;
        }
      }

      // Multi choice cards: arrows pick target option, Enter/Space toggle it
      if (questionType === "multi_choice" && options?.length) {
        const config = (question.configJson ?? {}) as {
          minSelections?: number;
          maxSelections?: number;
        };
        const minSelections = config?.minSelections ?? 0;
        const maxSelections = config?.maxSelections;
        const currentSelections = Array.isArray(currentValue)
          ? currentValue
          : [];
        const currentSet = new Set(currentSelections);
        const storedFocus = multiFocusIndex[questionId];
        const firstSelectedIndex = options.findIndex((option) =>
          currentSet.has(option?.value ?? ""),
        );
        const fallbackIndex =
          storedFocus !== undefined && storedFocus >= 0
            ? storedFocus
            : firstSelectedIndex >= 0
              ? firstSelectedIndex
              : 0;

        const clampIndex = (idx: number) =>
          Math.min(Math.max(idx, 0), options.length - 1);

        const updateFocus = (idx: number) =>
          setMultiFocusIndex((prev) => ({
            ...prev,
            [questionId]: clampIndex(idx),
          }));

        const toggleSelection = (targetIdx: number) => {
          const option = options[targetIdx];
          if (!option) return;
          const nextSet = new Set(currentSet);

          if (nextSet.has(option.value)) {
            if (nextSet.size > minSelections) {
              nextSet.delete(option.value);
            }
          } else if (!maxSelections || nextSet.size < maxSelections) {
            nextSet.add(option.value);
          }

          handleResponseChange(questionId, Array.from(nextSet));
          updateFocus(targetIdx);
        };

        if (event.key === "ArrowDown" || event.key === "ArrowRight") {
          event.preventDefault();
          updateFocus(fallbackIndex + 1);
          return;
        }

        if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
          event.preventDefault();
          updateFocus(fallbackIndex - 1);
          return;
        }

        if (event.key === "Home") {
          event.preventDefault();
          updateFocus(0);
          return;
        }

        if (event.key === "End") {
          event.preventDefault();
          updateFocus(options.length - 1);
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          const targetIdx =
            storedFocus !== undefined && storedFocus >= 0
              ? clampIndex(storedFocus)
              : clampIndex(fallbackIndex);
          toggleSelection(targetIdx);
          return;
        }
      }
    },
    [
      currentCardCount,
      currentCategoryIndex,
      allQuestionsAnsweredInCategory,
      focusCardByIndex,
      isLastCategory,
      sections,
      responses,
      singleFocusIndex,
      multiFocusIndex,
      handleResponseChange,
    ],
  );

  // Check for valid category after all hooks are called (Rules of Hooks)
  if (!currentCategory) {
    return <div>No categories found</div>;
  }

  // Calculate progress
  const totalQuestions = sessionData.items.length;
  const answeredCount = Object.keys(responses).length;
  const overallProgress =
    totalQuestions === 0 ? 0 : (answeredCount / totalQuestions) * 100;

  // Check if all required questions in current category are answered
  const requiredQuestionsInCategory = currentCategory.items.filter(
    (item) => item.isRequired !== false,
  );
  const requiredAnsweredCount = requiredQuestionsInCategory.filter(
    (item) => responses[item.question.id] !== undefined,
  ).length;
  const canProceedToNext =
    requiredAnsweredCount === requiredQuestionsInCategory.length;

  React.useLayoutEffect(() => {
    // Ensure focus is placed immediately on category change; retry across paints until refs exist
    let rafId = 0;
    let attempts = 0;
    const expectedQuestionId =
      currentCategory?.items?.[activeCardIndex]?.question.id;

    const attemptFocus = () => {
      const target = cardContentRefs.current[activeCardIndex];
      if (target && target.dataset.questionId === expectedQuestionId) {
        target.focus({ preventScroll: true });
        return;
      }
      if (attempts < 12) {
        attempts += 1;
        rafId = requestAnimationFrame(attemptFocus);
      } else {
        window.setTimeout(attemptFocus, 120);
      }
    };

    attemptFocus();

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [activeCardIndex, currentCategory, currentCategoryIndex]);

  React.useEffect(() => {
    const cardContent = cardContentRefs.current[activeCardIndex];
    const question = currentCategory?.items?.[activeCardIndex]?.question;

    // Prefer textarea for text questions
    if (question?.questionTypeCode === "text" && cardContent) {
      const textarea =
        cardContent.querySelector<HTMLTextAreaElement>("textarea");
      if (textarea) {
        requestAnimationFrame(() =>
          textarea.focus({
            preventScroll: true,
          }),
        );
        return;
      }
    }

    const target =
      cardContentRefs.current[activeCardIndex] ??
      questionCardRefs.current[activeCardIndex];
    if (!target) return;

    // Defer to ensure DOM updated
    requestAnimationFrame(() =>
      target.focus({
        preventScroll: true,
      }),
    );
  }, [activeCardIndex, currentCategory, currentCategoryIndex]);

  const handleNextCategory = () => {
    if (currentCategoryIndex < sections.length - 1) {
      setActiveCardIndex(0);
      setCurrentCategoryIndex((prev) => prev + 1);
      requestAnimationFrame(() => focusCardByIndex(0));
    }
  };

  const handlePreviousCategory = () => {
    if (currentCategoryIndex > 0) {
      setActiveCardIndex(0);
      setCurrentCategoryIndex((prev) => prev - 1);
      requestAnimationFrame(() => focusCardByIndex(0));
    }
  };

  // Check if all required questions across all categories are answered
  const requiredQuestions = sessionData.items.filter(
    (item) => item.isRequired !== false,
  );
  const answeredRequiredCount = requiredQuestions.filter(
    (item) => responses[item.question.id] !== undefined,
  ).length;
  const allRequiredQuestionsAnswered =
    requiredQuestions.length === 0 ||
    answeredRequiredCount === requiredQuestions.length;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Fixed Header - Solid & Clean */}
      <div className="bg-background fixed top-[64px] right-0 left-0 z-40 shadow-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Left: Title & Category */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <h1 className="text-foreground truncate text-base font-semibold tracking-tight sm:text-xl">
              {sessionData.questionnaire.title}
            </h1>
            <div className="bg-border/60 hidden h-4 w-px sm:block" />

            {/* Desktop Category Info */}
            <div className="text-muted-foreground hidden items-center gap-2 text-sm sm:flex">
              <span className="text-foreground/80 font-medium">
                {currentCategory.name}
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span>
                {currentCategoryIndex + 1} of {sections.length}
              </span>
            </div>

            {/* Mobile Category Info (Inline) */}
            <div className="text-muted-foreground flex items-center gap-2 truncate text-xs sm:hidden">
              <span className="text-muted-foreground/40">•</span>
              <span className="text-foreground/80 truncate font-medium">
                {currentCategory.name}
              </span>
            </div>
          </div>

          {/* Desktop Progress */}
          <div className="hidden shrink-0 items-center gap-3 pb-2 sm:flex">
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-muted-foreground text-xs font-medium tabular-nums">
                {Math.round(overallProgress)}%
              </span>
              <div className="bg-secondary/50 h-1.5 w-36 overflow-hidden rounded-full">
                <motion.div
                  className="bg-primary h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${overallProgress}%` }}
                  transition={{ duration: 0.5, ease: "circOut" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Progress Bar (Bottom Edge) */}
        <div className="bg-secondary/30 absolute right-0 bottom-0 left-0 h-1 sm:hidden">
          <motion.div
            className="bg-primary h-full"
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.5, ease: "circOut" }}
          />
        </div>

        {/* Gradient Mask for Soft Edge Scrolling - Attached to header bottom */}
        <div className="from-background pointer-events-none absolute top-full right-0 left-0 h-18 bg-gradient-to-b to-transparent" />
      </div>

      {/* Main Content Area */}
      <div className="mx-auto mt-[120px] w-full max-w-3xl flex-1 space-y-4 px-4 py-6 sm:mt-32 sm:px-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCategoryIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="transform-gpu space-y-4 pt-0 will-change-transform"
          >
            {currentCategory.items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.05,
                  ease: "easeOut",
                }}
                className="transform-gpu will-change-transform"
              >
                <Card
                  className={cn(
                    "group border-border/40 bg-card/40 backdrop-blur-sm transition-all duration-300",
                    "hover:border-border/80 hover:bg-card/60 hover:shadow-sm",
                    "question-card-focus-gradient", // New focus gradient class
                    "outline-none focus-within:outline-none focus:outline-none",
                    "py-0",
                  )}
                >
                  <CardContent
                    className="p-4 outline-none focus:outline-none sm:p-5"
                    ref={(el) => {
                      cardContentRefs.current[index] = el;
                    }}
                    tabIndex={activeCardIndex === index ? 0 : -1}
                    data-question-id={item.question.id}
                    data-question-type={item.question.questionTypeCode}
                    onClick={(e) => handleCardContentClick(e, index)}
                    onKeyDown={(e) =>
                      handleCardContentKeyDown(e, index, item.question)
                    }
                  >
                    <QuestionRenderer
                      question={{
                        id: item.question.id,
                        prompt: item.question.prompt,
                        questionTypeCode: item.question.questionTypeCode,
                        configJson: item.question.configJson,
                      }}
                      value={responses[item.question.id]}
                      onChange={(value) =>
                        handleResponseChange(item.question.id, value)
                      }
                      disabled={sessionData.session.status === "completed"}
                      questionNumber={index + 1}
                      multiChoiceFocusIndex={multiFocusIndex[item.question.id]}
                      onMultiChoiceFocusIndexChange={(focusIdx) =>
                        setMultiFocusIndex((prev) => ({
                          ...prev,
                          [item.question.id]: focusIdx,
                        }))
                      }
                    />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Footer */}
      <div className="border-border/40 bg-background/80 sticky bottom-0 z-30 mt-auto border-t py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 sm:px-8">
          <Button
            variant="ghost"
            onClick={handlePreviousCategory}
            disabled={currentCategoryIndex === 0}
            className="text-muted-foreground hover:text-foreground gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex-1 text-center">
            {!canProceedToNext && !isLastCategory && (
              <p className="text-muted-foreground animate-pulse text-xs">
                Complete required questions to continue
              </p>
            )}
          </div>

          {!isLastCategory ? (
            <Button
              onClick={handleNextCategory}
              disabled={!canProceedToNext}
              className="min-w-[100px] gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={isCompleting || !allRequiredQuestionsAnswered}
              size="lg"
              className="min-w-[140px] gap-2"
            >
              {isCompleting ? (
                "Completing..."
              ) : (
                <>
                  Complete Test
                  <Check className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
