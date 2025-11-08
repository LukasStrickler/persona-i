"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function AuthErrorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams?.get("error");
    if (errorParam) {
      setError(errorParam);
    } else {
      // No error param, redirect to home
      void router.push("/");
    }
  }, [searchParams, router]);

  const getErrorMessage = (
    errorCode: string,
  ): { title: string; message: string } => {
    // Normalize error code to SCREAMING_SNAKE_CASE
    const normalizedCode = errorCode?.toString().trim().toUpperCase() ?? "";

    switch (normalizedCode) {
      case "INVALID_TOKEN":
        return {
          title: "Invalid Token",
          message:
            "The magic link token is invalid or has already been used. Please request a new magic link.",
        };
      case "EXPIRED_TOKEN":
        return {
          title: "Expired Token",
          message:
            "The magic link has expired. Magic links are valid for 30 minutes. Please request a new one.",
        };
      case "FAILED_TO_CREATE_USER":
        return {
          title: "Account Creation Failed",
          message:
            "We couldn't create your account. Please try again or contact support.",
        };
      case "NEW_USER_SIGNUP_DISABLED":
        return {
          title: "Sign Up Disabled",
          message:
            "New user signup is currently disabled. Please contact support if you need access.",
        };
      case "FAILED_TO_CREATE_SESSION":
        return {
          title: "Session Creation Failed",
          message:
            "We couldn't create your session. Please try signing in again.",
        };
      default:
        return {
          title: "Authentication Error",
          message: `An error occurred: ${errorCode}. Please try again or contact support.`,
        };
    }
  };

  if (!error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-foreground text-lg">Loading...</p>
      </div>
    );
  }

  const { title, message } = getErrorMessage(error);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-destructive text-2xl">{title}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Error code:{" "}
              <code className="bg-muted rounded px-1 py-0.5 text-xs">
                {error}
              </code>
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            onClick={() => {
              void router.push("/");
            }}
            className="w-full"
          >
            Go to Homepage
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              router.back();
            }}
            className="w-full"
          >
            Go Back
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-foreground text-lg">Loading...</p>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
