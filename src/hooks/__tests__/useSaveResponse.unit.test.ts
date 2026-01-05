import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSaveResponse } from "../useSaveResponse";
import type { QuestionnaireItem } from "@/lib/types/questionnaire-responses";

const { mockSaveResponseUseMutation } = vi.hoisted(() => ({
  mockSaveResponseUseMutation: vi.fn(),
}));

vi.mock("@/components/providers/TRPCProvider", () => ({
  api: {
    questionnaires: {
      saveResponse: {
        useMutation: mockSaveResponseUseMutation,
      },
    },
  },
}));

vi.mock("@/hooks/use-debounce-callback", () => ({
  useDebounceCallback: <T extends (...args: unknown[]) => void>(
    fn: T,
    _delay?: number,
  ): [T, () => void] => {
    const debounced = ((...args: Parameters<T>) => fn(...args)) as T;
    const flushDebounced = vi.fn();
    return [debounced, flushDebounced];
  },
}));

describe("useSaveResponse", () => {
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveResponseUseMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
    });
  });

  it("should save response immediately", async () => {
    const { result } = renderHook(() =>
      useSaveResponse({
        sessionId: "session-1",
        sessionData: {
          items: [
            {
              id: "item-1",
              position: 0,
              section: null,
              question: {
                id: "q1",
                prompt: "Test question",
                questionTypeCode: "text",
                configJson: {},
              },
              response: null,
            } as QuestionnaireItem,
          ],
        },
      }),
    );

    await act(async () => {
      await result.current.saveResponseHandler("q1", "answer");
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      sessionId: "session-1",
      questionId: "q1",
      value: "answer",
    });
  });

  it("should save response debounced", async () => {
    const { result } = renderHook(() =>
      useSaveResponse({
        sessionId: "session-1",
        sessionData: {
          items: [
            {
              id: "item-1",
              position: 0,
              section: null,
              question: {
                id: "q1",
                prompt: "Test question",
                questionTypeCode: "text",
                configJson: {},
              },
              response: null,
            } as QuestionnaireItem,
          ],
        },
      }),
    );

    await act(async () => {
      result.current.debouncedSave("q1", "answer");
    });

    // Since we mocked useDebounceCallback to call immediately, it should be called
    expect(mockMutateAsync).toHaveBeenCalledWith({
      sessionId: "session-1",
      questionId: "q1",
      value: "answer",
    });
  });
});
