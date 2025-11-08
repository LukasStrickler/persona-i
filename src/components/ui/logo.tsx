"use client";

import { cn } from "@/lib/utils";
import { useRef } from "react";

interface LogoProps {
  className?: string;
  variant?: "default" | "small" | "tiny" | "navigation";
}

export function Logo({ className, variant = "default" }: LogoProps) {
  const isSmall = variant === "small";
  const isTiny = variant === "tiny";
  const isNavigation = variant === "navigation";
  const textSize = isTiny
    ? "text-lg sm:text-xl"
    : isSmall
      ? "text-2xl sm:text-3xl md:text-4xl"
      : isNavigation
        ? "text-[24px]"
        : "text-4xl sm:text-5xl md:text-6xl";
  const containerRef = useRef<HTMLHeadingElement>(null);

  const handleCopy = (e: React.ClipboardEvent) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    // Check if the entire selection is within our logo container
    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;

    // Only replace clipboard if both anchor and focus nodes are inside the logo container
    if (
      containerRef.current &&
      anchorNode &&
      focusNode &&
      containerRef.current.contains(anchorNode) &&
      containerRef.current.contains(focusNode)
    ) {
      e.preventDefault();
      e.clipboardData.setData("text/plain", "Persona[i]");
    }
  };

  return (
    <h1
      ref={containerRef}
      className={cn(
        "inline-flex items-baseline leading-tight font-bold",
        className,
      )}
      style={{
        whiteSpace: "nowrap",
        userSelect: isNavigation ? "none" : "text",
        ...(isNavigation ? { position: "relative", top: "-2px" } : {}),
      }}
      onCopy={isNavigation ? undefined : handleCopy}
    >
      {/* Hidden text for proper copy behavior */}
      <span className="sr-only">Persona[i]</span>

      <span className={cn("text-foreground", textSize)} aria-hidden="true">
        Person
      </span>

      {/* Single continuous gradient for A, brackets, and I */}
      <span
        className={cn("relative inline-flex items-baseline", textSize)}
        aria-hidden="true"
      >
        {/* A - start of continuous gradient */}
        <span
          className="inline-block font-bold"
          aria-hidden="true"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--primary), var(--accent), var(--secondary))",
            backgroundSize: "300% 100%",
            backgroundPosition: "0% 0%",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
          }}
        >
          a
        </span>

        {/* Box brackets with "I" partially inside */}
        <span
          className="relative mr-1.5 ml-[-0.025em] inline-flex items-center"
          aria-hidden="true"
        >
          {/* Left bracket - part of continuous gradient */}
          <span
            className="inline-flex items-center leading-none font-bold"
            aria-hidden="true"
            style={{
              fontSize: "1.75em",
              lineHeight: "1",
              transform: "translateY(0.1em)",
              backgroundImage:
                "linear-gradient(to right, var(--primary), var(--accent), var(--secondary))",
              backgroundSize: "300% 100%",
              backgroundPosition: "30% 0%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
            }}
          >
            [
          </span>

          {/* The "I" - part of continuous gradient */}
          <span
            className="relative inline-flex items-center justify-center leading-none font-bold"
            aria-hidden="true"
            style={{
              marginLeft: "-0.16em",
              marginRight: "-0.16em",
              transform: "translateY(0.25em)",
              backgroundImage:
                "linear-gradient(to right, var(--primary), var(--accent), var(--secondary))",
              backgroundSize: "300% 100%",
              backgroundPosition: "60% 0%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
            }}
          >
            i
          </span>

          {/* Right bracket - part of continuous gradient */}
          <span
            className="inline-flex items-center leading-none font-bold"
            aria-hidden="true"
            style={{
              fontSize: "1.75em",
              lineHeight: "1",
              transform: "translateY(0.1em)",
              backgroundImage:
                "linear-gradient(to right, var(--primary), var(--accent), var(--secondary))",
              backgroundSize: "300% 100%",
              backgroundPosition: "80% 0%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
            }}
          >
            ]
          </span>
        </span>
      </span>
    </h1>
  );
}
