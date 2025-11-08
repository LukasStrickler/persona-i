"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Users, GraduationCap } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const audiences = [
  {
    title: "Individuals",
    description:
      "Discover your personality profile through validated assessments. Compare this with leading AI models and see which one matches your thinking style.",
    icon: User,
    status: "live" as const,
  },
  {
    title: "Teams",
    description:
      "Understand your team's collective personality dynamics. Compare group profiles with AI models to improve collaboration and team effectiveness.",
    icon: Users,
    status: "coming-soon" as const,
  },
  {
    title: "Researchers & Educators",
    description:
      "Access validated assessment tools and reproducible methodologies for your research. Import custom assessments and analyze results with scientific rigor.",
    icon: GraduationCap,
    status: "live" as const,
    href: "/contact",
  },
];

export function Audiences() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const response = await authClient.getSession();
        if (!isMounted) return;

        const user = response.data?.user;
        setIsAuthenticated(
          user !== null &&
            user !== undefined &&
            typeof user === "object" &&
            !Array.isArray(user) &&
            "id" in user &&
            (typeof user.id === "string" || typeof user.id === "number"),
        );
      } catch {
        if (!isMounted) return;
        setIsAuthenticated(false);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 pb-8 sm:pb-12">
      <div className="text-center">
        <h2 className="mt-0 text-2xl font-bold tracking-tight sm:text-3xl">
          Built for Everyone
        </h2>
        <p className="text-muted-foreground mx-auto mt-1 max-w-2xl text-base">
          Whether you're exploring personally, working with a team, or
          conducting research
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {audiences.map((audience) => {
          const Icon = audience.icon;
          const isComingSoon = audience.status === "coming-soon";
          const isResearcher = audience.title === "Researchers & Educators";
          const isIndividual = audience.title === "Individuals";

          return (
            <Card
              key={audience.title}
              className="bg-background/40 border-primary/10 hover:border-primary/30 group flex flex-col transition-all duration-300 hover:shadow-lg"
            >
              <CardHeader className="pb-0">
                <div className="mb-4 flex items-center gap-3">
                  <div className="bg-primary/10 ring-primary/20 group-hover:ring-primary/30 flex h-12 w-12 items-center justify-center rounded-xl ring-2 transition-all duration-300">
                    <Icon className="text-primary h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <CardTitle className="text-xl">{audience.title}</CardTitle>
                </div>
                <CardDescription className="text-foreground/70 text-sm leading-relaxed">
                  {audience.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-0">
                {isComingSoon && (
                  <Badge
                    variant="secondary"
                    className="w-full justify-center py-2 text-xs"
                  >
                    Coming soon
                  </Badge>
                )}
                {isIndividual &&
                  (isLoading ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      disabled
                      aria-busy
                      aria-label="Loading..."
                    >
                      Loading...
                    </Button>
                  ) : (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                    >
                      <Link href={isAuthenticated ? "/tests" : "/login"}>
                        {isAuthenticated ? "Tests" : "Sign in / Create account"}
                      </Link>
                    </Button>
                  ))}
                {isResearcher && audience.href && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                  >
                    <Link href={audience.href}>Reach out</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Partner CTA */}
      <div className="mt-8 text-center">
        <div className="mx-auto max-w-2xl space-y-1">
          <p className="text-muted-foreground text-base font-medium sm:text-lg">
            Want to add custom tests?
          </p>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Partner with us to create custom assessments for your organization
            or research needs
          </p>
          <Button asChild size="default" variant="outline" className="mt-0.5">
            <Link href="/contact">Get in Touch</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
