import { Geist } from "next/font/google";
import { type Metadata, type Viewport } from "next";
import { TRPCReactProvider } from "@/components/providers/TRPCProvider";
import { NameCheckProvider } from "@/components/providers/NameCheckProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";

import "@/styles/globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Persona[i] — Personality benchmarking with AI model comparisons",
    template: "%s | Persona[i]",
  },
  description:
    "Take validated personality tests and compare your profile with leading AI models like GPT-5, Claude Sonnet 4.5, and Gemini 2.5 Pro. Get instant results with clear visualizations. Free personality assessment.",
  keywords: [
    "personality test",
    "AI personality comparison",
    "DISC assessment",
    "personality benchmarking",
    "AI model comparison",
    "GPT-5 personality",
    "Claude Sonnet 4.5",
    "Gemini 2.5 Pro",
    "personality assessment",
    "behavioral analysis",
    "personality psychology",
    "Big Five personality",
    "OCEAN personality test",
  ],
  authors: [{ name: "Persona[i]" }],
  creator: "Persona[i]",
  publisher: "Persona[i]",
  metadataBase: new URL("https://personai.review"),
  alternates: {
    canonical: "https://personai.review",
  },
  openGraph: {
    title: "Persona[i] — Personality benchmarking with AI model comparisons",
    description:
      "Take validated personality tests and compare your profile with leading AI models like GPT-5, Claude Sonnet 4.5, and Gemini 2.5 Pro. Clear visuals. Instant results.",
    url: "https://personai.review",
    siteName: "Persona[i]",
    locale: "en_US",
    type: "website",
    // Add og-image.png when available
    // images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Persona[i]" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Persona[i] — Personality benchmarking with AI model comparisons",
    description:
      "Take validated personality tests and compare your profile with leading AI models like GPT-5, Claude Sonnet 4.5, and Gemini 2.5 Pro.",
    // Add og-image.png when available
    // images: ["/og-image.png"],
    // Add Twitter handle when available
    // creator: "@personai",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: { icon: "/favicon.ico" },
  verification: {
    // Add your verification codes here when available
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
    // bing: "your-bing-verification-code",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${geist.className}`}>
        <TRPCReactProvider>
          <ToastProvider>
            <NameCheckProvider>{children}</NameCheckProvider>
          </ToastProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
