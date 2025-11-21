"use client";

import { useState, useEffect } from "react";
import {
  useQuestions,
  useModelResponses,
  useHumanResponses,
  useSelectedModels,
  useModelProfiles,
  useQuestionnaire,
} from "@/stores/selectors";
import { useQuestionnaireSlug } from "@/stores/selectors";
import { createTestAnalysisStore } from "@/stores/useTestAnalysisStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Visual component showing store data instead of raw JSON
 * Displays models, user sessions, questions, and responses from Zustand store
 * Waits for Zustand hydration to prevent SSR/client mismatch
 */
export function StoreDataVisualization() {
  const [isHydrated, setIsHydrated] = useState(false);
  const slug = useQuestionnaireSlug();
  const store = createTestAnalysisStore(slug);

  // Wait for Zustand persist to hydrate from localStorage
  useEffect(() => {
    const unsubscribe = store.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });

    // If already hydrated, set immediately
    if (store.persist.hasHydrated()) {
      setIsHydrated(true);
    }

    return unsubscribe;
  }, [store]);

  const questions = useQuestions();
  const modelResponses = useModelResponses();
  const humanResponses = useHumanResponses();
  const questionnaire = useQuestionnaire();
  const selectedModels = useSelectedModels();
  const modelProfilesArray = useModelProfiles();

  // Show loading state until hydration is complete to prevent mismatch
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground text-sm">
          Loading store data...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Store Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Store Status</CardTitle>
          <CardDescription>
            Current state of the Zustand test analysis store
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Questionnaire</div>
              <div className="font-semibold">
                {questionnaire?.title ?? "Not loaded"}
              </div>
              {questionnaire && (
                <div className="text-muted-foreground text-xs">
                  Version {questionnaire.version} ({questionnaire.slug})
                </div>
              )}
            </div>
            <div>
              <div className="text-muted-foreground">Questions</div>
              <div className="font-semibold">{questions.length} loaded</div>
            </div>
            <div>
              <div className="text-muted-foreground">Models</div>
              <div className="font-semibold">
                {modelProfilesArray.length} total, {selectedModels.length}{" "}
                selected
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">User Sessions</div>
              <div className="font-semibold">
                {humanResponses.length} loaded
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="models" className="w-full">
        <TabsList>
          <TabsTrigger value="models">Model Responses</TabsTrigger>
          <TabsTrigger value="users">User Sessions</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
        </TabsList>

        {/* Model Responses Tab */}
        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Responses ({modelResponses.length})</CardTitle>
              <CardDescription>
                Responses from AI/LLM models (filtered by selection)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {modelResponses.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No model responses available. Make sure models are selected in
                  the filter.
                </p>
              ) : (
                <div className="space-y-4">
                  {modelResponses.map((session) => {
                    return (
                      <div
                        key={session.sessionId}
                        className="rounded-md border p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <Badge variant="secondary">
                            {session.displayName}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            {session.responses.size} responses
                          </span>
                        </div>
                        <div className="space-y-2">
                          {Array.from(session.responses.entries())
                            .slice(0, 5)
                            .map(([questionId, response]) => {
                              const question = questions.find(
                                (q) => q.id === questionId,
                              );
                              return (
                                <div
                                  key={questionId}
                                  className="flex items-start gap-2 text-sm"
                                >
                                  <span className="text-muted-foreground min-w-[100px] text-xs">
                                    {question?.code ?? questionId.slice(0, 8)}
                                  </span>
                                  <span className="font-mono">
                                    {String(response.value)}
                                  </span>
                                </div>
                              );
                            })}
                          {session.responses.size > 5 && (
                            <div className="text-muted-foreground text-xs">
                              +{session.responses.size - 5} more responses
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Sessions Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Sessions ({humanResponses.length})</CardTitle>
              <CardDescription>
                Responses from human test takers (filtered by selection)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {humanResponses.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No user sessions available. Complete a test to see your
                  responses here.
                </p>
              ) : (
                <div className="space-y-4">
                  {humanResponses.map((session) => (
                    <div
                      key={session.sessionId}
                      className="rounded-md border p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <Badge variant="outline">{session.displayName}</Badge>
                        <div className="flex items-center gap-2 text-xs">
                          {session.completedAt && (
                            <span className="text-muted-foreground">
                              Completed{" "}
                              {new Date(
                                session.completedAt,
                              ).toLocaleDateString()}
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            {session.responses.size} / {questions.length}{" "}
                            responses
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {/* Show ALL questions, marking which have responses */}
                        {questions.map((question) => {
                          const response = session.responses.get(question.id);
                          const hasResponse = !!response;
                          return (
                            <div
                              key={question.id}
                              className={`flex items-start gap-2 text-sm ${
                                !hasResponse ? "opacity-50" : ""
                              }`}
                            >
                              <span className="text-muted-foreground min-w-[100px] text-xs">
                                {question.code ?? question.id.slice(0, 8)}
                              </span>
                              {hasResponse ? (
                                <span className="font-mono">
                                  {String(response.value)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs italic">
                                  No response
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Questions ({questions.length})</CardTitle>
              <CardDescription>
                All questions loaded in the store with their metadata
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {questions.slice(0, 10).map((question) => (
                  <div
                    key={question.id}
                    className="rounded-md border p-3 text-sm"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {question.code}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {question.questionTypeCode}
                      </Badge>
                      {question.section && (
                        <span className="text-muted-foreground text-xs">
                          {question.section}
                        </span>
                      )}
                    </div>
                    <div className="text-sm">{question.prompt}</div>
                    {question.options && question.options.length > 0 && (
                      <div className="text-muted-foreground mt-2 text-xs">
                        {question.options.length} options
                      </div>
                    )}
                  </div>
                ))}
                {questions.length > 10 && (
                  <div className="text-muted-foreground text-center text-sm">
                    +{questions.length - 10} more questions
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
