import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, Trash2, Eye } from "lucide-react";

const privacyPoints = [
  {
    icon: Shield,
    title: "What's stored",
    description:
      "We store only what's necessary: your test results and analysis. Your personal information stays private and is never shared with anyone.",
  },
  {
    icon: Eye,
    title: "How similarity is computed",
    description:
      "We use validated psychological metrics to compare your responses with AI model profiles. Our methods are transparent and reproducible.",
  },
  {
    icon: Trash2,
    title: "Delete anytime",
    description:
      "You're in control. Delete your results and account data instantly from your account settings at any time—no questions asked.",
  },
  {
    icon: Lock,
    title: "Anonymization for research",
    description:
      "Research insights use anonymized, aggregated data only. Your identity remains completely private and is never linked to research findings.",
  },
];

export function PrivacySection() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 pb-8 sm:pb-12">
      <div className="text-center">
        <h2 className="mt-0 text-2xl font-bold tracking-tight sm:text-3xl">
          Privacy & Transparency
        </h2>
        <p className="text-muted-foreground mx-auto mt-1 max-w-2xl text-base">
          Your data is yours. We're transparent about how we use it.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        {privacyPoints.map((point) => {
          const Icon = point.icon;
          return (
            <Card
              key={point.title}
              className="bg-background/40 border-primary/10 hover:border-primary/30 py-4 transition-colors"
            >
              <CardContent className="pt-0 pb-0">
                <div className="mb-2 flex items-center gap-3">
                  <div className="bg-primary/10 ring-primary/20 flex h-8 w-8 items-center justify-center rounded-lg ring-1 sm:h-10 sm:w-10">
                    <Icon className="text-primary h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <h3 className="text-base font-semibold sm:text-lg">
                    {point.title}
                  </h3>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed sm:text-sm">
                  {point.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/privacy"
          className="text-primary hover:text-primary/80 text-xs font-medium transition-colors sm:text-sm"
        >
          Read our full privacy policy →
        </Link>
      </div>
    </section>
  );
}
