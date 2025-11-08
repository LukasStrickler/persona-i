import { BackgroundBeams } from "@/components/ui/background-beams";
import type { ReactNode } from "react";

export default function BackgroundLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="from-background to-background/80 relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b">
      <BackgroundBeams className="z-[46] opacity-40" />
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
