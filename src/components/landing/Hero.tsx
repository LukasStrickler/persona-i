import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Brain, Sparkles, Settings } from "lucide-react";

const tests = [
  {
    name: "DISC",
    description:
      "Discover your behavioral style across four key dimensions of personality.",
    icon: FileText,
    status: "live" as const,
    href: "/tests",
  },
  {
    name: "Big Five (OCEAN)",
    description:
      "Explore five fundamental traits that shape your personality and behavior.",
    icon: Brain,
    status: "coming-soon" as const,
  },
  {
    name: "Enneagram",
    description:
      "Uncover your core motivations and understand your personality patterns.",
    icon: Sparkles,
    status: "coming-soon" as const,
  },
  {
    name: "Custom Assessments",
    description:
      "Tailored evaluations designed for your organization or research needs.",
    icon: Settings,
    status: "partner" as const,
    href: "/contact",
  },
];

export function Hero() {
  return (
    <section className="mx-auto mt-24 max-w-7xl px-4 py-6 sm:py-12 md:mt-12">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Left: Content */}
        <div className="flex flex-col justify-center space-y-6 text-center lg:text-left">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Benchmark your personality against leading AI models.
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg sm:text-xl lg:mx-0">
            Take science-informed tests, visualize your profile, and see which
            models behave most like you in what areas of your personality.
          </p>

          {/* Metrics Strip */}
          <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-4 text-sm lg:justify-start">
            <span className="flex items-center gap-2">
              <span className="text-primary">1</span> validated test
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-2">
              <span className="text-primary">10+</span> LLM profiles
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-2">
              <span className="text-primary">5</span> minutes to start
            </span>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
            <Button asChild size="lg" className="min-h-[48px] text-base">
              <Link href="/tests">Start a Test</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="min-h-[48px] text-base"
            >
              <Link href="/models">Explore model comparisons</Link>
            </Button>
          </div>
        </div>

        {/* Right: Tests Grid */}
        <div className="mt-8 flex flex-col justify-center md:mt-0">
          <div className="grid grid-cols-2 gap-4">
            {tests.map((test) => {
              const Icon = test.icon;
              const isLive = test.status === "live";
              const isComingSoon = test.status === "coming-soon";
              const isPartner = test.status === "partner";

              return (
                <div
                  key={test.name}
                  className="bg-background/40 border-primary/10 hover:border-primary/20 flex flex-col gap-3 rounded-lg border p-4 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 ring-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1">
                      <Icon className="text-primary h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base leading-tight font-semibold">
                          {test.name}
                        </h3>
                        {/* {isPartner && (
                          <Badge variant="outline" className="shrink-0 text-xs">
                            Partner
                          </Badge>
                        )} */}
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {test.description}
                  </p>
                  <div className="mt-auto flex justify-center">
                    {isLive && test.href ? (
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="w-32 text-sm underline underline-offset-2"
                      >
                        <Link href={test.href}>Take Test</Link>
                      </Button>
                    ) : isComingSoon ? (
                      <Badge
                        variant="secondary"
                        className="px-3 py-1.5 text-xs font-medium"
                      >
                        Coming soon
                      </Badge>
                    ) : isPartner && test.href ? (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="w-32 text-xs"
                      >
                        <Link href={test.href}>Reach out</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
