import { notFound } from "next/navigation";
import {
  MainHeader,
  MainHeaderContentWrapper,
} from "@/components/landing/MainHeader";
import { Footer } from "@/components/landing/Footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StartTestButton } from "@/components/test-taking/StartTestButton";
import { getServerTRPC } from "@/server/api/caller";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Clock } from "lucide-react";
import { TestAnalysisClient } from "@/components/test-analysis/TestAnalysisClient";
import { StoreDataVisualization } from "@/components/test-analysis/StoreDataVisualization";
import { ChartExamples } from "@/components/test-analysis/ChartExamples";

/**
 * Dedicated DISC test analysis page
 * Shows LLM raw responses prominently
 */
export default async function DiscTestPage() {
  const trpc = await getServerTRPC();

  // Get DISC questionnaire - ONLY fetch questionnaire metadata for SEO
  // Analysis data (models, users, analysis rules) will be fetched client-side
  let questionnaire;
  try {
    questionnaire = await trpc.questionnaires.getMetaBySlug({ slug: "disc" });
  } catch {
    notFound();
  }

  // Get incomplete sessions for current user (if authenticated)
  // This is user-specific UI data, not analysis data
  let incompleteSessions: Array<{
    id: string;
    status: string;
    startedAt: Date | null;
    updatedAt: Date | null;
  }> = [];
  try {
    incompleteSessions = await trpc.questionnaires.getIncompleteSessions({
      questionnaireId: questionnaire.id,
    });
  } catch {
    // User not authenticated or error - ignore
    incompleteSessions = [];
  }

  // Prepare minimal initial data for client component - only questionnaire metadata
  // Analysis data (questions, models, users, analysis rules) will be fetched client-side
  const initialData = {
    questionnaire: {
      id: questionnaire.id,
      slug: questionnaire.slug,
      title: questionnaire.title,
      version: questionnaire.version.version,
      versionId: questionnaire.version.id,
    },
  };

  return (
    <>
      <MainHeader />
      <MainHeaderContentWrapper>
        <div className="min-h-screen">
          <TestAnalysisClient
            questionnaireSlug="disc"
            initialData={initialData}
            ssrData={{
              title: questionnaire.title,
              description: questionnaire.description ?? undefined,
            }}
          >
            <main className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
              <div className="mb-8">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  {questionnaire.title}
                </h1>
                {questionnaire.description && (
                  <p className="text-muted-foreground mt-4 text-lg">
                    {questionnaire.description}
                  </p>
                )}
              </div>

              <div className="space-y-6">
                {/* Chart Examples - Showcase all chart components */}
                <Card className="bg-background/40 border-primary/10">
                  <CardHeader>
                    <CardTitle>Chart Examples</CardTitle>
                    <CardDescription>
                      Examples of all analysis chart components using live store
                      data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartExamples />
                  </CardContent>
                </Card>

                {/* Store Data Visualization - Primary Focus */}
                <Card className="bg-background/40 border-primary/10">
                  <CardHeader>
                    <CardTitle>Store Data Visualization</CardTitle>
                    <CardDescription>
                      Live data from the Zustand store showing models, users,
                      and questions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <StoreDataVisualization />
                  </CardContent>
                </Card>

                {/* Incomplete Sessions - Show if user has started but not finished */}
                {incompleteSessions.length > 0 && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Continue Your Test
                      </CardTitle>
                      <CardDescription>
                        You have {incompleteSessions.length} incomplete session
                        {incompleteSessions.length > 1 ? "s" : ""}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {incompleteSessions.map((session) => (
                          <Button
                            key={session.id}
                            asChild
                            variant="outline"
                            className="w-full justify-start"
                          >
                            <Link href={`/tests/disc/${session.id}`}>
                              Resume Session
                              {session.startedAt && (
                                <span className="text-muted-foreground ml-auto text-xs">
                                  Started{" "}
                                  {new Date(
                                    session.startedAt,
                                  ).toLocaleDateString()}
                                </span>
                              )}
                            </Link>
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* CTA to Take Test */}
                <Card>
                  <CardHeader>
                    <CardTitle>Take the DISC Test</CardTitle>
                    <CardDescription>
                      Start a new session or resume where you left off
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <StartTestButton
                      questionnaireSlug="disc"
                      className="w-full"
                    >
                      Start Test
                    </StartTestButton>
                  </CardContent>
                </Card>
              </div>
            </main>
          </TestAnalysisClient>
        </div>
        <Footer />
      </MainHeaderContentWrapper>
    </>
  );
}
