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

export default function ModelsPage() {
  return (
    <>
      <MainHeader />
      <MainHeaderContentWrapper>
        <main className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              LLM Model Profiles
            </h1>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
              Explore how different AI models respond to personality tests
            </p>
          </div>
          <Card className="bg-background/40 border-primary/10 mt-12">
            <CardHeader>
              <CardTitle>Coming Soon</CardTitle>
              <CardDescription>
                The model profiles page is being prepared. Check back soon!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                You can see a preview of model comparisons on the landing page.
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </MainHeaderContentWrapper>
    </>
  );
}
