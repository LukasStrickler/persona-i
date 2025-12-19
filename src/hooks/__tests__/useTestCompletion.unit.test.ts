import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTestCompletion } from "../useTestCompletion";
import type { QuestionnaireItem } from "@/lib/types/questionnaire-responses";

// Mocks

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    dev: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/utils/questionnaire-responses", () => ({
  buildResponsesPayload: vi.fn(
    (
      items: Array<{ question?: { id: string }; questionId?: string }>,
      responses: Record<string, unknown>,
    ) => {
      // Return a payload based on the responses
      // buildResponsesPayload looks for item.question.id, not item.questionId
      const payload: Array<{ questionId: string; value: unknown }> = [];
      for (const item of items) {
        const questionId = item.question?.id ?? item.questionId;
        if (!questionId) continue;
        const value = responses[questionId];
        if (value !== undefined) {
          payload.push({
            questionId,
            value,
          });
        }
      }
      return payload;
    },
  ),
}));

const { mockSaveResponsesBatchUseMutation, mockUseRouter } = vi.hoisted(() => ({
  mockSaveResponsesBatchUseMutation: vi.fn(),
  mockUseRouter: vi.fn(),
}));

vi.mock("@/components/providers/TRPCProvider", () => ({
  api: {
    questionnaires: {
      saveResponsesBatch: {
        useMutation: mockSaveResponsesBatchUseMutation,
      },
    },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: mockUseRouter,
}));

const mockCompleteSession = {
  mutateAsync: vi.fn(),
};

vi.mock("@/hooks/useTestAnalysisMutations", () => ({
  useTestAnalysisMutations: vi.fn(() => ({
    completeSession: mockCompleteSession,
  })),
}));

describe("useTestCompletion", () => {
  const mockRouter = { push: vi.fn() };
  const mockSaveMutateAsync = vi.fn();
  const mockFlushDebounced = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
    mockSaveResponsesBatchUseMutation.mockReturnValue({
      mutateAsync: mockSaveMutateAsync,
    } as { mutateAsync: typeof mockSaveMutateAsync });
  });

  it("should complete session successfully", async () => {
    mockSaveMutateAsync.mockResolvedValue({ success: true, savedCount: 1 });
    mockCompleteSession.mutateAsync.mockResolvedValue({ success: true });

    const { result } = renderHook(() =>
      useTestCompletion({
        sessionId: "session-1",
        slug: "test-slug",
        sessionData: {
          items: [
            {
              id: "item-1",
              position: 0,
              section: null,
              questionId: "q1",
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
        responses: { q1: "answer" },
        flushDebounced: mockFlushDebounced,
      }),
    );

    await act(async () => {
      await result.current.handleComplete();
    });

    expect(mockFlushDebounced).toHaveBeenCalled();
    expect(mockSaveMutateAsync).toHaveBeenCalled();
    expect(mockCompleteSession.mutateAsync).toHaveBeenCalledWith({
      sessionId: "session-1",
    });
    expect(mockRouter.push).toHaveBeenCalledWith("/tests/test-slug");
  });

  it("should retry on batch save failure", async () => {
    // Fail twice, then succeed
    mockSaveMutateAsync
      .mockResolvedValueOnce({ success: false, failed: [{ questionId: "q1" }] })
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({ success: true, savedCount: 1 });

    mockCompleteSession.mutateAsync.mockResolvedValue({ success: true });

    const { result } = renderHook(() =>
      useTestCompletion({
        sessionId: "session-1",
        slug: "test-slug",
        sessionData: {
          items: [
            {
              id: "item-1",
              position: 0,
              section: null,
              questionId: "q1",
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
        responses: { q1: "answer" },
        flushDebounced: mockFlushDebounced,
      }),
    );

    await act(async () => {
      await result.current.handleComplete();
    });

    expect(mockSaveMutateAsync).toHaveBeenCalledTimes(3);
    expect(mockCompleteSession.mutateAsync).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalled();
  });

  it("should handle empty responses", async () => {
    const { result } = renderHook(() =>
      useTestCompletion({
        sessionId: "session-1",
        slug: "test-slug",
        sessionData: { items: [] },
        responses: {},
        flushDebounced: mockFlushDebounced,
      }),
    );

    await act(async () => {
      await result.current.handleComplete();
    });

    expect(mockFlushDebounced).toHaveBeenCalled();
    expect(mockSaveMutateAsync).not.toHaveBeenCalled();
    expect(mockCompleteSession.mutateAsync).not.toHaveBeenCalled();
  });
});
