import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

/**
 * Unit test example for utility functions.
 *
 * This test demonstrates:
 * - Testing pure functions (no side effects)
 * - Testing with jsdom environment (for React-related utilities)
 * - Simple assertions and test structure
 */
describe("cn utility function", () => {
  it("should merge class names correctly", () => {
    const result = cn("foo", "bar");
    expect(result).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    const result = cn("foo", false && "bar", "baz");
    expect(result).toBe("foo baz");
  });

  it("should merge Tailwind classes correctly", () => {
    // twMerge should deduplicate conflicting Tailwind classes
    const result = cn("p-4", "p-2");
    expect(result).toBe("p-2"); // Last one wins
  });

  it("should handle empty inputs", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("should handle undefined and null values", () => {
    const result = cn("foo", undefined, null, "bar");
    expect(result).toBe("foo bar");
  });

  it("should handle arrays of classes", () => {
    const result = cn(["foo", "bar"], "baz");
    expect(result).toBe("foo bar baz");
  });
});
