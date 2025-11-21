import * as React from "react";

interface UseScrollCardIntoViewParams {
  contentBoundsRef: React.RefObject<HTMLDivElement | null>;
  footerRef: React.RefObject<HTMLDivElement | null>;
}

export function useScrollCardIntoView({
  contentBoundsRef,
  footerRef,
}: UseScrollCardIntoViewParams) {
  const scrollCardIntoView = React.useCallback(
    (
      el: HTMLElement,
      {
        behavior = "smooth",
        force = false,
      }: { behavior?: ScrollBehavior; force?: boolean } = {},
    ) => {
      const container = document.getElementById("main-scroll-container");
      const topOffset = 175; // keep content below header + fade
      const bottomOffset = (footerRef.current?.offsetHeight ?? 0) + 24; // keep content above sticky footer

      const currentScroll = container?.scrollTop ?? window.scrollY;
      const clientHeight = container?.clientHeight ?? window.innerHeight;
      const scrollHeight =
        container?.scrollHeight ?? document.documentElement.scrollHeight;
      const scrollNode = container ?? document.documentElement;
      const isWindowFallback = !container;

      const containerRect = container
        ? container.getBoundingClientRect()
        : {
            top: 0,
            left: 0,
            height: window.innerHeight,
            width: window.innerWidth,
          };

      // Bounds of the list of cards (per category), relative to container scroll space.
      const contentRect = contentBoundsRef.current?.getBoundingClientRect();
      const contentTop = contentRect
        ? contentRect.top - containerRect.top + currentScroll
        : 0;
      const contentBottom = contentRect
        ? contentRect.bottom - containerRect.top + currentScroll
        : scrollHeight;

      const elRect = el.getBoundingClientRect();

      const elementTop = elRect.top - containerRect.top + currentScroll;
      const elementHeight = elRect.height;
      const elementBottom = elementTop + elementHeight;

      const safeTop = topOffset;
      const safeBottom = Math.max(0, clientHeight - bottomOffset);
      const safeHeight = Math.max(1, safeBottom - safeTop);
      const elementCenter = elementTop + elementHeight / 2;

      // Ideal: center element within the safe viewport.
      const idealScroll = elementCenter - (safeTop + safeHeight / 2);

      // Visible range to keep the element fully on screen.
      const minScrollToSeeBottom = elementBottom - safeBottom; // lower bound
      const maxScrollToSeeTop = elementTop - safeTop; // upper bound

      const clampedToElement =
        minScrollToSeeBottom > maxScrollToSeeTop
          ? (minScrollToSeeBottom + maxScrollToSeeTop) / 2
          : Math.min(
              Math.max(idealScroll, minScrollToSeeBottom),
              maxScrollToSeeTop,
            );

      // Clamp to content bounds so we don't scroll past the questionnaire list.
      const minByContent = Math.max(0, contentTop - safeTop);
      const maxByContent = Math.max(0, contentBottom - safeBottom);

      // Clamp to scrollable bounds.
      const maxScroll = Math.max(0, scrollHeight - clientHeight);
      const target = Math.min(
        Math.max(clampedToElement, minByContent),
        Math.min(maxByContent, maxScroll),
      );

      // Skip tiny nudges when we're already essentially at target.
      if (!force && Math.abs(target - currentScroll) <= 2) return;

      if (isWindowFallback) {
        window.scrollTo({ top: target, behavior });
      } else {
        scrollNode.scrollTo({ top: target, behavior });
      }
    },
    [contentBoundsRef, footerRef],
  );

  return { scrollCardIntoView };
}
