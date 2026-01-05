import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SpringSlider } from "../spring-slider";

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  observe() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  unobserve() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect() {}
};

describe("SpringSlider", () => {
  it("should render with initial value", () => {
    render(
      <SpringSlider
        value={50}
        min={0}
        max={100}
        step={1}
        onValueChange={vi.fn()}
        onValueCommit={vi.fn()}
      />,
    );

    const slider = screen.getByRole("slider");
    expect(slider).toBeDefined();
    expect(slider.getAttribute("aria-valuenow")).toBe("50");
  });

  it("should call onValueChange when changed", async () => {
    const handleChange = vi.fn();
    const handleCommit = vi.fn();
    const { container } = render(
      <SpringSlider
        value={50}
        min={0}
        max={100}
        step={1}
        onValueChange={handleChange}
        onValueCommit={handleCommit}
      />,
    );

    // Wait for component to fully render and width to be set
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Find the track container using data-testid for stability
    const trackContainer = container.querySelector(
      '[data-testid="slider-track"]',
    )!;
    expect(trackContainer).toBeTruthy();

    // Mock getBoundingClientRect
    const rect = {
      left: 0,
      top: 0,
      width: 100,
      height: 20,
      bottom: 20,
      right: 100,
      x: 0,
      y: 0,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      toJSON: () => {},
    };
    vi.spyOn(trackContainer, "getBoundingClientRect").mockReturnValue(
      rect as DOMRect,
    );

    // Simulate a click on the track (75% of the way, should give us ~75)
    fireEvent.pointerDown(trackContainer, {
      clientX: 75, // 75% of the way
      clientY: 10,
    });

    // Both handlers should be called
    expect(handleChange).toHaveBeenCalled();
    expect(handleCommit).toHaveBeenCalled();
  });
});
