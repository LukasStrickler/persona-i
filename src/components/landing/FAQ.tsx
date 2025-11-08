"use client";

import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/**
 * Helper function to derive plain text from answer (which can be JSX or string)
 * Strips JSX elements and inline links to produce plain text for structured data
 */
function getAnswerText(answer: string | React.ReactElement): string {
  if (typeof answer === "string") {
    return answer;
  }
  // For JSX, extract text content by recursively processing children
  // This is a simplified version - for complex JSX, consider using a library
  if (
    typeof answer === "object" &&
    answer !== null &&
    "props" in answer &&
    answer.props
  ) {
    const props = answer.props as { children?: unknown };
    const { children } = props;
    if (typeof children === "string") {
      return children;
    }
    if (Array.isArray(children)) {
      return children
        .map((child): string => {
          if (typeof child === "string") {
            return child;
          }
          if (typeof child === "object" && child !== null && "props" in child) {
            // Extract text from Link or other elements
            const childElement = child as React.ReactElement;
            const childProps = childElement.props as { children?: unknown };
            if (typeof childProps.children === "string") {
              return childProps.children;
            }
            return "";
          }
          return "";
        })
        .join(" ");
    }
  }
  return "Answer not available. Please check the documentation or contact support.";
}

const faqs = [
  {
    question: "What is this service and how does it work?",
    answer:
      "We provide validated personality assessments that compare your responses with leading AI models. Take a test, get your personality profile, and see which AI models match your thinking style across different dimensions. All comparisons use transparent, validated psychological metrics.",
  },
  {
    question: "Do I need to create an account to use this?",
    answer:
      "You can browse tests and model comparisons without an account. However, creating a free account allows you to save your results, track your profile over time, and access your comparison history. Signing up takes less than a minute.",
  },
  {
    question: "How accurate are the personality assessments?",
    answer:
      "We use validated psychological assessments like DISC, which are based on established research in personality psychology. Our tests follow standardized methodologies and provide reliable insights into your behavioral patterns and thinking style.",
  },
  {
    question: "How do you calculate similarity with AI models?",
    answer: (
      <>
        We use validated psychological metrics to compare your test responses
        with how AI models respond to the same questions. Our similarity
        calculations follow established assessment methods and are fully
        transparent.{" "}
        <Link href="/docs" className="text-primary hover:underline">
          Learn more about our methodology in our documentation
        </Link>
        .
      </>
    ),
  },
  {
    question: "Is my data private and secure?",
    answer:
      "Yes. We store only your test results and personality profile. Your personal information stays private and is never shared with third parties. You can delete your data at any time from your account settings. Research data is anonymized and aggregated.",
  },
  {
    question: "What personality tests are available?",
    answer:
      "We currently offer the DISC assessment, with Big Five (OCEAN) and Enneagram coming soon. All tests are validated psychological instruments that provide meaningful insights into your personality and behavior patterns.",
  },
  {
    question: "How long does it take to complete a test?",
    answer:
      "Most personality assessments take about 5-10 minutes to complete. The tests are designed to be quick and engaging while still providing accurate results. You can pause and resume at any time if needed.",
  },
  {
    question: "Can I use this for team or research purposes?",
    answer:
      "Yes. We offer solutions for individuals, teams, and researchers. Team features are coming soon, and researchers can access validated assessment tools and reproducible methodologies. Contact us to learn more about research partnerships.",
  },
];

export function FAQ() {
  return (
    <>
      <section className="mx-auto max-w-4xl px-4 pt-6 pb-8 sm:pb-12">
        <div className="text-center">
          <h2 className="mt-0 text-2xl font-bold tracking-tight sm:text-3xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="mt-4">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => {
              const answerText = getAnswerText(faq.answer);
              return {
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: answerText,
                },
              };
            }),
          }),
        }}
      />
    </>
  );
}
