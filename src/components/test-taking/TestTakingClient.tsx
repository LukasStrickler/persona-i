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

  const saveResponse = api.questionnaires.saveResponse.useMutation();

  const saveResponseHandler = React.useCallback(
    async (questionId: string, value: string | number | boolean | string[]) => {
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

      // Handle single-choice, scalar, boolean, text
      const optionId =
        question.questionTypeCode === "single_choice"
          ? question.options?.find((o) => o.value === value)?.id
          : undefined;

      try {
        await saveResponse.mutateAsync({
          sessionId,
          questionId,
          value: value as string | number | boolean,
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
        value as string | number | boolean | string[],
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
    value: string | number | boolean | string[],
  ) => {
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

  // Check for valid category after all hooks are called (Rules of Hooks)
  const currentCategory = sections[currentCategoryIndex];
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

  const handleNextCategory = () => {
    if (currentCategoryIndex < sections.length - 1) {
      setCurrentCategoryIndex((prev) => prev + 1);
    }
  };

  const findQuestionCardElement = React.useCallback(
    (cardContentEl: HTMLElement) => {
      const questionCard =
        cardContentEl.querySelector("[data-question-card-root]") ??
        cardContentEl.querySelector(":scope > div") ??
        cardContentEl.firstElementChild;

      if (questionCard) {
        const htmlElement = questionCard as HTMLElement;
        htmlElement.dataset.questionCardRoot ??= "true";
        if (htmlElement.tabIndex < 0) {
          htmlElement.tabIndex = 0;
        }
        // Remove focus outline
        htmlElement.classList.add("outline-none", "focus:outline-none");
        return htmlElement;
      }

      return null;
    },
    [],
  );

  const handleCardContentClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const cardContentEl = event.currentTarget;
      const sliderThumb = cardContentEl.querySelector('[role="slider"]');

      if (!sliderThumb) {
        return; // Only apply to scalar questions
      }

      if (sliderThumb.contains(event.target as Node)) {
        return; // Let the thumb handle its own focus
      }

      const questionCard = findQuestionCardElement(cardContentEl);
      if (!questionCard) return;

      if (document.activeElement !== questionCard) {
        questionCard.focus({ preventScroll: true });
      }
    },
    [findQuestionCardElement],
  );

  const handleCardContentKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!SLIDER_CONTROL_KEYS.has(event.key)) return;

      const cardContentEl = event.currentTarget;
      const sliderThumb = cardContentEl.querySelector('[role="slider"]');

      if (!sliderThumb) {
        return;
      }

      const questionCard = findQuestionCardElement(cardContentEl);
      if (!questionCard || document.activeElement !== questionCard) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

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
    },
    [findQuestionCardElement],
  );

  const handlePreviousCategory = () => {
    if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex((prev) => prev - 1);
    }
  };

  const isLastCategory = currentCategoryIndex === sections.length - 1;
  const allQuestionsAnswered = answeredCount === totalQuestions;

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
            className="space-y-4 pt-0" // Reduced pt-4 to pt-2 and increased space-y-4 to space-y-6 for better separation
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
              >
                <Card
                  className={cn(
                    "group border-border/40 bg-card/40 backdrop-blur-sm transition-all duration-300",
                    "hover:border-border/80 hover:bg-card/60 hover:shadow-sm",
                    "focus-within:border-primary/50 focus-within:ring-primary/20 focus-within:ring-1",
                    "outline-none focus:outline-none focus-within:outline-none",
                    "py-0",
                  )}
                >
                  <CardContent
                    className="p-4 sm:p-5 outline-none focus:outline-none"
                    onClick={handleCardContentClick}
                    onKeyDown={handleCardContentKeyDown}
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
              disabled={isCompleting || !allQuestionsAnswered}
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
