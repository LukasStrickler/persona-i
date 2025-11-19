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
import { TestAnalysisClient } from "@/components/test-analysis/TestAnalysisClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Dynamic questionnaire analysis page
 * Uses TestAnalysisClient wrapper for Zustand store integration
 */
export default async function QuestionnaireAnalysisPage({ params }: PageProps) {
  const { slug } = await params;
  const trpc = await getServerTRPC();

  // Get questionnaire - ONLY fetch questionnaire metadata for SEO
  // Analysis data (models, users, analysis rules) will be fetched client-side
  let questionnaire;
  try {
    questionnaire = await trpc.questionnaires.getMetaBySlug({ slug });
  } catch {
    notFound();
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
        <TestAnalysisClient questionnaireSlug={slug} initialData={initialData}>
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
              <Card>
                <CardHeader>
                  <CardTitle>Analysis</CardTitle>
                  <CardDescription>
                    View and analyze responses from models and users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Analysis data is loaded via the Zustand store. Use the
                    selectors and analysis helpers to build your analysis UI.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Take the Test</CardTitle>
                  <CardDescription>
                    Start a new session or resume where you left off
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StartTestButton questionnaireSlug={slug} className="w-full">
                    Start Test
                  </StartTestButton>
                </CardContent>
              </Card>
            </div>
          </main>
        </TestAnalysisClient>
        <Footer />
      </MainHeaderContentWrapper>
    </>
  );
}
