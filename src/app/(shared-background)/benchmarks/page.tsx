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
import { Badge } from "@/components/ui/badge";

export default function BenchmarksPage() {
  return (
    <>
      <MainHeader />
      <MainHeaderContentWrapper>
        <main className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Benchmarks
            </h1>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
              Coming soon: Run benchmarks and compare results across different
              models
            </p>
          </div>
          <Card className="bg-background/40 border-primary/10 mt-12">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Coming Soon</CardTitle>
                <Badge variant="secondary">In Development</Badge>
              </div>
              <CardDescription>
                Browser-native benchmarking tools are being developed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Soon you&apos;ll be able to run benchmarks directly in your
                browser — no CLI needed.
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </MainHeaderContentWrapper>
    </>
  );
}
