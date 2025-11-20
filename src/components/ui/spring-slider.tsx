"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
} from "framer-motion";
import { cn } from "@/lib/utils";

interface SpringSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  onValueCommit: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  onPointerDown?: () => void;
  "aria-label"?: string;
}

export function SpringSlider({
  value,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className,
  onPointerDown,
  "aria-label": ariaLabel,
}: SpringSliderProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);

  // Motion value for the thumb's position (0 to width)
  const x = useMotionValue(0);

  // Map x to percentage for the filled track
  const widthPercent = useTransform(x, [0, width], ["0%", "100%"]);

  // Update width on mount/resize
  React.useEffect(() => {
    if (!trackRef.current) return;

    const updateWidth = () => {
      if (trackRef.current) {
        setWidth(trackRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Sync x with value when not dragging
  // We use a ref to track if we are currently dragging to avoid fighting with the drag gesture
  const isDragging = React.useRef(false);

  React.useEffect(() => {
    if (!isDragging.current && width > 0) {
      const range = max - min;
      // Guard against division by zero when max === min
      if (range === 0) {
        // If min === max, position at start (0)
        animate(x, 0, {
          type: "spring",
          stiffness: 300,
          damping: 30,
        });
        return;
      }
      const percent = (value - min) / range;
      const targetX = percent * width;

      // Animate to the new position smoothly
      animate(x, targetX, {
        type: "spring",
        stiffness: 300,
        damping: 30,
      });
    }
  }, [value, min, max, width, x]);

  const handleDragStart = () => {
    isDragging.current = true;
  };

  const handleDrag = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    _info: PanInfo,
  ) => {
    if (!trackRef.current || width <= 0) return;

    // Calculate value from current x
    const currentX = x.get();
    const percent = Math.max(0, Math.min(1, currentX / width));
    const range = max - min;
    // Guard against division by zero when max === min
    const rawValue = range === 0 ? min : percent * range + min;

    // We don't snap during drag, just pass the raw value or rounded to a small precision if needed
    // But usually for a slider we want to see the continuous value or the stepped value?
    // The user asked for "smoothly going to the rigid point", implying free movement then snap.
    // So we pass the raw value (or maybe stepped value if we want the number to update in steps)
    // Let's pass the raw value for smooth number updates if the parent handles it,
    // OR we can snap to step for the parent but keep the thumb smooth.
    // Let's snap to step for the parent callback so the number display is clean.
    const steppedValue = Math.round((rawValue - min) / step) * step + min;
    const clampedValue = Math.min(Math.max(steppedValue, min), max);

    onValueChange(clampedValue);
  };

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    _info: PanInfo,
  ) => {
    isDragging.current = false;

    const currentX = x.get();
    const percent = Math.max(0, Math.min(1, currentX / width));
    const rawValue = percent * (max - min) + min;

    // Snap to nearest step
    const snappedValue = Math.round((rawValue - min) / step) * step + min;
    const clampedValue = Math.min(Math.max(snappedValue, min), max);

    // Calculate target X for the snapped value
    const targetPercent = (clampedValue - min) / (max - min);
    const targetX = targetPercent * width;

    // Animate to snapped position
    animate(x, targetX, {
      type: "spring",
      stiffness: 400,
      damping: 25, // Slightly bouncy but controlled
    });

    onValueCommit(clampedValue);
  };

  const handleTrackClick = (e: React.PointerEvent) => {
    if (disabled || !trackRef.current) return;

    onPointerDown?.();

    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / width));
    const rawValue = percent * (max - min) + min;

    const snappedValue = Math.round((rawValue - min) / step) * step + min;
    const clampedValue = Math.min(Math.max(snappedValue, min), max);

    // Trigger update
    onValueChange(clampedValue);
    onValueCommit(clampedValue);

    // Animation will be handled by the useEffect since we updated the value via parent
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    let newValue = value;
    const range = max - min;
    const pageStep = Math.max(step, range / 10);

    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        newValue = Math.min(value + step, max);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        newValue = Math.max(value - step, min);
        break;
      case "Home":
        newValue = min;
        break;
      case "End":
        newValue = max;
        break;
      case "PageUp":
        newValue = Math.min(value + pageStep, max);
        break;
      case "PageDown":
        newValue = Math.max(value - pageStep, min);
        break;
      default:
        return;
    }

    // Snap to step
    const snappedValue = Math.round((newValue - min) / step) * step + min;
    const clampedValue = Math.min(Math.max(snappedValue, min), max);

    e.preventDefault();
    onValueChange(clampedValue);
    onValueCommit(clampedValue);
  };

  return (
    <div
      className={cn(
        "relative flex h-4 w-full touch-none items-center select-none",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {/* Track */}
      <div
        ref={trackRef}
        className="bg-secondary/50 relative h-1.5 w-full grow cursor-pointer overflow-hidden rounded-full"
        onPointerDown={handleTrackClick}
      >
        {/* Fill */}
        <motion.div
          className="bg-primary absolute h-full"
          style={{ width: widthPercent }}
        />
      </div>

      {/* Thumb */}
      <motion.div
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing"
        style={{ x }}
        drag="x"
        dragConstraints={trackRef}
        dragElastic={0}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onPointerDown={onPointerDown}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 1.2 }}
      >
        <div
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label={ariaLabel}
          aria-disabled={disabled}
          onKeyDown={handleKeyDown}
          className="border-primary bg-background ring-offset-background focus-visible:ring-ring h-5 w-5 rounded-full border-2 shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        />
      </motion.div>
    </div>
  );
}
