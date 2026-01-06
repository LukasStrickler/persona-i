import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SpringSlider } from "../spring-slider";

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

    await new Promise((resolve) => setTimeout(resolve, 100));

    const trackContainer = container.querySelector(
      '[data-testid="slider-track"]',
    )!;
    expect(trackContainer).toBeTruthy();

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

    fireEvent.pointerDown(trackContainer, {
      clientX: 75,
      clientY: 10,
    });

    expect(handleChange).toHaveBeenCalled();
    expect(handleCommit).toHaveBeenCalled();
  });
});
