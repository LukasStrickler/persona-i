"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { api } from "@/components/providers/TRPCProvider";
import { Button } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import type { buttonVariants } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StartTestButtonProps
  extends Omit<
      React.ComponentPropsWithoutRef<"button">,
      "onClick" | "disabled"
    >,
    VariantProps<typeof buttonVariants> {
  questionnaireSlug: string;
  children?: React.ReactNode;
}

/**
 * Reusable button component that starts a test session and navigates to it.
 * Handles authentication, loading states, and error handling.
 */
export function StartTestButton({
  questionnaireSlug,
  children,
  variant,
  size,
  className,
  ...restProps
}: StartTestButtonProps) {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(false);

  const startSession = api.questionnaires.startSessionBySlug.useMutation({
    onSuccess: (data) => {
      // Navigate to the session page
      router.push(`/tests/${questionnaireSlug}/${data.sessionId}`);
    },
    onError: (error) => {
      console.error("Failed to start session:", error);

      // Handle different error types
      if (error.data?.code === "UNAUTHORIZED") {
        // Redirect to login with return URL
        router.push(`/login?redirect=/tests/${questionnaireSlug}`);
        toast.error("Please log in to start a test");
      } else if (error.message.includes("not found")) {
        toast.error("Test not found. Please try again.");
      } else if (error.message.includes("access")) {
        toast.error("You don't have access to this test.");
      } else {
        toast.error(error.message || "Failed to start test. Please try again.");
      }
    },
  });

  const handleClick = async () => {
    // Check authentication first
    setIsCheckingAuth(true);
    try {
      const session = await authClient.getSession();
      if (!session?.data?.user) {
        // Not authenticated - redirect to login
        router.push(`/login?redirect=/tests/${questionnaireSlug}`);
        toast.error("Please log in to start a test");
        setIsCheckingAuth(false);
        return;
      }
    } catch (error) {
      console.error("Error checking authentication:", error);
      router.push(`/login?redirect=/tests/${questionnaireSlug}`);
      toast.error("Please log in to start a test");
      setIsCheckingAuth(false);
      return;
    }

    setIsCheckingAuth(false);

    // Start the session
    try {
      await startSession.mutateAsync({ questionnaireSlug });
    } catch {
      // Error is handled by onError callback
      // Just need to catch to prevent unhandled promise rejection
    }
  };

  const isLoading = isCheckingAuth || startSession.isPending;

  return (
    <Button
      {...restProps}
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Starting...
        </>
      ) : (
        (children ?? "Start Test")
      )}
    </Button>
  );
}
