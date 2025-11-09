import { type Metadata } from "next";
import {
  MainHeader,
  MainHeaderContentWrapper,
} from "@/components/landing/MainHeader";
import { Hero } from "@/components/landing/Hero";
import { ModelComparison } from "@/components/landing/ModelComparison";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Audiences } from "@/components/landing/Audiences";
import { PrivacySection } from "@/components/landing/PrivacySection";
import { FAQ } from "@/components/landing/FAQ";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Personality Benchmarking with AI Model Comparisons",
  description:
    "Take validated personality tests (DISC, Big Five, Enneagram) and compare your profile with leading AI models like GPT-5, Claude Sonnet 4.5, and Gemini 2.5 Pro. Get instant results with clear visualizations. Free personality assessment.",
};

export default async function Home() {
  return (
    <>
      <MainHeader />
      <MainHeaderContentWrapper>
        {/* Content that scrolls under the header */}
        <main
          className="relative"
          style={{
            paddingTop: "32px", // Add padding so content starts below header visually
          }}
        >
          <Hero />
          <ModelComparison />
          <Audiences />
          <HowItWorks />
          <PrivacySection />
          <FAQ />
          <CTASection />
        </main>
        <Footer />
      </MainHeaderContentWrapper>
    </>
  );
}
