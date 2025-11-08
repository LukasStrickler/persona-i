import { FileText, BarChart3, Lightbulb } from "lucide-react";

const steps = [
  {
    number: 1,
    title: "Take a Test",
    description:
      "Complete a science-backed personality assessment in just a few minutes. Get instant, detailed results about your behavioral patterns.",
    icon: FileText,
  },
  {
    number: 2,
    title: "Compare Profiles",
    description:
      "See how your personality aligns with leading AI models. View side-by-side comparisons and discover your closest matches.",
    icon: BarChart3,
  },
  {
    number: 3,
    title: "Gain Insights",
    description:
      "Understand the similarities and differences between you and AI models. Export your results or share your findings.",
    icon: Lightbulb,
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 pb-8 sm:pb-12">
      <div className="text-center">
        <h2 className="mt-0 text-2xl font-bold tracking-tight sm:text-3xl">
          How It Works
        </h2>
        <p className="text-muted-foreground mx-auto mt-1 max-w-2xl text-base">
          Three simple steps to discover your AI personality match
        </p>
      </div>

      <div className="relative mt-12">
        <div className="grid gap-8 sm:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="group relative z-10 flex flex-col items-center text-center"
              >
                {/* Connection line (desktop only) */}
                {index < steps.length - 1 && (
                  <div className="bg-primary/10 absolute top-10 left-[60%] hidden h-0.5 w-[75%] translate-x-[8%] sm:block" />
                )}

                <div className="relative">
                  <div className="bg-primary/10 ring-primary/20 group-hover:ring-primary/30 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl ring-2 transition-all duration-300">
                    <Icon className="text-primary h-10 w-10 transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <div className="bg-primary text-primary-foreground absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shadow-lg">
                    {step.number}
                  </div>
                </div>
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-muted-foreground text-sm">
          <span className="font-medium">Coming soon:</span> Run custom
          benchmarks directly in your browser
        </p>
      </div>
    </section>
  );
}
