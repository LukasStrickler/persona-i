"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-center"
      icons={{
        success: <CircleCheckIcon className="text-primary h-5 w-5 shrink-0" />,
        info: <InfoIcon className="text-primary h-5 w-5 shrink-0" />,
        warning: (
          <TriangleAlertIcon className="text-primary h-5 w-5 shrink-0" />
        ),
        error: <OctagonXIcon className="text-destructive h-5 w-5 shrink-0" />,
        loading: (
          <Loader2Icon className="text-primary h-5 w-5 shrink-0 animate-spin" />
        ),
      }}
      toastOptions={{
        className: "rounded-lg shadow-lg backdrop-blur-sm text-sm font-medium",
        style: {
          borderRadius: "0.5rem",
          boxShadow:
            "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
