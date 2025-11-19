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
import { Button } from "@/components/ui/button";
import { StartTestButton } from "@/components/test-taking/StartTestButton";
import Link from "next/link";
import { getServerTRPC } from "@/server/api/caller";

export default async function TestsPage() {
  const trpc = await getServerTRPC();
  const questionnaires = await trpc.questionnaires.getPublic();

  return (
    <>
      <MainHeader />
      <MainHeaderContentWrapper>
        <main className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Tests Catalog
            </h1>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
              Choose from our selection of validated personality assessments
            </p>
          </div>

          {questionnaires.length === 0 ? (
            <Card className="bg-background/40 border-primary/10 mt-12">
              <CardHeader>
                <CardTitle>Coming Soon</CardTitle>
                <CardDescription>
                  The full tests catalog is being prepared. Check back soon!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  In the meantime, you can explore our DISC test from the
                  landing page.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {questionnaires.map((q) => (
                <Card
                  key={q.id}
                  className="bg-background/40 border-primary/10 hover:border-primary/20 transition-colors"
                >
                  <CardHeader>
                    <CardTitle>{q.title}</CardTitle>
                    <CardDescription>
                      {q.description ??
                        "Take this assessment to discover your personality profile"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {q.activeVersion && (
                      <div className="text-muted-foreground text-sm">
                        Version {q.activeVersion.version}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button asChild className="flex-1">
                        <Link href={`/tests/${q.slug}`}>View Analysis</Link>
                      </Button>
                      <StartTestButton
                        questionnaireSlug={q.slug}
                        variant="outline"
                        className="flex-1"
                      >
                        Take Test
                      </StartTestButton>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
        <Footer />
      </MainHeaderContentWrapper>
    </>
  );
}
