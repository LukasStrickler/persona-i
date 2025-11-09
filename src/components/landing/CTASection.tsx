import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 pb-8 sm:pb-12">
      <div className="bg-primary/5 border-primary/10 mx-auto max-w-4xl rounded-2xl border p-8 text-center sm:p-12">
        <h2 className="mt-0 text-2xl font-bold tracking-tight sm:text-3xl">
          Ready to discover your personality profile?
        </h2>
        <p className="text-muted-foreground mx-auto mt-1 max-w-2xl text-base">
          Discover your personality profile through validated assessments and
          see which AI models think most like you. Get instant insights into
          your behavioral patterns and cognitive style.
        </p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="min-h-[48px] text-base">
            <Link href="/tests">Start a Test</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="min-h-[48px] text-base"
          >
            <Link href="/models">Explore Models</Link>
          </Button>
        </div>

        <div className="text-muted-foreground mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
          <span>Free to start</span>
          <span className="hidden sm:inline">•</span>
          <span>Results in minutes</span>
          <span className="hidden sm:inline">•</span>
          <span>Your data stays private</span>
        </div>
      </div>
    </section>
  );
}
