"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { MainHeader } from "@/components/landing/MainHeader";

/**
 * Get the base URL for BetterAuth API calls.
 * Prefers NEXT_PUBLIC_BETTER_AUTH_URL, falls back to localhost in development,
 * and throws in production if not set.
 */
function getAuthBaseURL(): string {
  if (process.env.NEXT_PUBLIC_BETTER_AUTH_URL) {
    return process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
  }
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }
  logger.error("NEXT_PUBLIC_BETTER_AUTH_URL is required in production");
  throw new Error(
    "NEXT_PUBLIC_BETTER_AUTH_URL environment variable is required",
  );
}
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Loader2, Mail, AlertCircle } from "lucide-react";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

const codeSchema = z.object({
  code: z
    .string()
    .min(6)
    .max(6)
    .regex(/^[A-Z0-9]{6}$/),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type CodeFormValues = z.infer<typeof codeSchema>;

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Check if we're in signup mode
  const isSignupMode = searchParams?.get("mode") === "signup";

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit",
    defaultValues: {
      email: "",
    },
  });

  const codeForm = useForm<CodeFormValues>({
    resolver: zodResolver(codeSchema),
    mode: "onSubmit",
    defaultValues: {
      code: "",
    },
  });

  /**
   * Validate redirect URL to prevent open redirects
   * Only accepts same-origin relative paths (must start with `/`, reject `//`, `http:`, `https:`)
   */
  const validateRedirectUrl = (url: string | null): string => {
    if (!url || url.trim() === "") {
      return "/";
    }

    // URL decode the redirect parameter
    let decodedUrl: string;
    try {
      decodedUrl = decodeURIComponent(url);
    } catch {
      // Invalid URL encoding, fall back to home
      return "/";
    }

    // Reject anything that starts with `//` (protocol-relative)
    if (decodedUrl.startsWith("//")) {
      return "/";
    }

    // Reject anything that contains a scheme (http:, https:, etc.)
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decodedUrl)) {
      return "/";
    }

    // Only accept paths that start with a single leading `/`
    if (!decodedUrl.startsWith("/")) {
      return "/";
    }

    return decodedUrl;
  };

  const redirectUrl = validateRedirectUrl(
    searchParams?.get("redirect") ?? null,
  );

  useEffect(() => {
    // Check if user is already authenticated
    const checkSession = async () => {
      try {
        const session = await authClient.getSession();
        if (session?.data?.user) {
          // If user is logged in, redirect to account page
          void router.push("/account");
        }
      } catch {
        // Session check failed, user not authenticated
      }
    };
    void checkSession();
  }, [router]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Auto-submit when code reaches 6 characters
  const codeValue = codeForm.watch("code");

  // Session polling constants
  const SESSION_POLL_DELAY = 100; // Initial delay before first session check
  const SESSION_RETRY_DELAY = 200; // Delay between retry attempts
  const MAX_SESSION_CHECKS = 3; // Maximum number of session checks

  /**
   * Handle successful verification - navigate (toast removed, name prompt shows success)
   */
  const handleSuccessfulVerification = useCallback(() => {
    const finalRedirectUrl = redirectUrl === "/" ? "/" : redirectUrl;
    router.push(finalRedirectUrl);
    router.refresh();
  }, [router, redirectUrl]);

  /**
   * Poll for session with bounded retry loop
   * Returns true if session is found, false otherwise
   */
  const pollForSession = useCallback(
    async (initialDelay: number = SESSION_POLL_DELAY): Promise<boolean> => {
      // Initial delay
      await new Promise((resolve) => setTimeout(resolve, initialDelay));

      for (let attempt = 0; attempt < MAX_SESSION_CHECKS; attempt++) {
        try {
          const session = await authClient.getSession();
          if (session?.data?.user) {
            return true;
          }
        } catch {
          // Session check failed, continue to next attempt
        }

        // Wait before next attempt (except on last attempt)
        if (attempt < MAX_SESSION_CHECKS - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, SESSION_RETRY_DELAY),
          );
        }
      }

      return false;
    },
    [],
  );

  const sendMagicLink = async (email: string) => {
    const baseURL = getAuthBaseURL();
    const response = await fetch(`${baseURL}/api/auth/sign-in/magic-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        callbackURL: redirectUrl,
      }),
    });

    const result = (await response.json()) as
      | { error?: { message?: string } }
      | { data?: unknown };

    if (!response.ok || ("error" in result && result.error)) {
      const errorMessage =
        ("error" in result && result.error?.message) ??
        "Failed to send magic link";
      throw new Error(
        typeof errorMessage === "string"
          ? errorMessage
          : "Failed to send magic link",
      );
    }

    return result;
  };

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await sendMagicLink(values.email);
      setSuccess(true);
      setSubmittedEmail(values.email);
      setIsLoading(false);
      setResendCooldown(30); // 30 second cooldown
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!submittedEmail || resendCooldown > 0) return;
    setError(null);
    setIsLoading(true);

    try {
      await sendMagicLink(submittedEmail);
      setSuccess(true);
      setIsLoading(false);
      setResendCooldown(30); // 30 second cooldown
      codeForm.reset(); // Reset code form
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const verifyCode = useCallback(
    async (code: string) => {
      setIsVerifying(true);
      setError(null);

      const baseURL = getAuthBaseURL();
      // Use redirect URL from query params, or default to home
      const finalRedirectUrl = redirectUrl === "/" ? "/" : redirectUrl;
      const callbackURL = finalRedirectUrl;

      try {
        const response = await fetch(
          `${baseURL}/api/auth/magic-link/verify?token=${encodeURIComponent(code)}&callbackURL=${encodeURIComponent(callbackURL)}`,
          {
            method: "GET",
            credentials: "include",
            redirect: "manual", // Don't follow redirects automatically
          },
        );

        // BetterAuth redirects (302/301/307) when callbackURL is provided
        // Success: redirects to callbackURL
        // Error: redirects to callbackURL?error=...
        if (
          response.status === 302 ||
          response.status === 301 ||
          response.status === 307
        ) {
          const location = response.headers.get("Location");

          if (location) {
            // Parse Location header - handle both absolute and relative URLs
            let locationUrl: URL;
            try {
              // If location is absolute, use it directly
              if (
                location.startsWith("http://") ||
                location.startsWith("https://")
              ) {
                locationUrl = new URL(location);
              } else {
                // If location is relative, construct URL with baseURL
                locationUrl = new URL(location, baseURL);
              }

              // Check for error query parameter in URL
              const errorParam = locationUrl.searchParams.get("error");
              if (errorParam) {
                throw new Error(errorParam);
              }

              // No error in redirect - verify session exists before treating as success
              const hasSession = await pollForSession();
              if (hasSession) {
                handleSuccessfulVerification();
                return;
              }

              // If we get here, redirect happened but no session - might be an error
              throw new Error("Invalid or expired code. Please try again.");
            } catch (urlError) {
              // If URL parsing fails or error param found, throw the error
              if (urlError instanceof Error) {
                throw urlError;
              }
              throw new Error("Invalid or expired code. Please try again.");
            }
          }

          // Location header missing - check session as fallback
          const hasSession = await pollForSession();
          if (hasSession) {
            handleSuccessfulVerification();
            return;
          }

          throw new Error("Invalid or expired code. Please try again.");
        }

        // If no callbackURL, BetterAuth returns session as JSON (200 OK)
        if (response.ok) {
          const contentType = response.headers.get("content-type");
          const isJson = contentType?.includes("application/json");

          if (isJson) {
            try {
              const result = (await response.json()) as
                | { error?: { message?: string } }
                | { session?: unknown };
              if ("error" in result && result.error) {
                throw new Error("Invalid or expired code. Please try again.");
              }
              // If session exists, verification succeeded
              if ("session" in result && result.session) {
                handleSuccessfulVerification();
                return;
              }
            } catch (err) {
              // If JSON parsing fails but response is OK, check session
              logger.error("Error parsing JSON response:", err);
              const hasSession = await pollForSession();
              if (hasSession) {
                handleSuccessfulVerification();
                return;
              }
            }
          }

          // If response is OK, verify session exists
          const hasSession = await pollForSession();
          if (hasSession) {
            handleSuccessfulVerification();
            return;
          }

          throw new Error("Invalid or expired code. Please try again.");
        }

        // If response is not OK and not a redirect, check for error message
        const contentType = response.headers.get("content-type");
        const isJson = contentType?.includes("application/json");

        if (isJson) {
          try {
            const result = (await response.json()) as {
              error?: { message?: string };
            };
            if (result.error?.message) {
              throw new Error(result.error.message);
            }
          } catch (err) {
            // If JSON parsing fails, fall through to generic error
            logger.error("Error parsing error response JSON:", err);
          }
        }

        // Before showing error, check if session exists (might have been set despite error response)
        const hasSession = await pollForSession(SESSION_RETRY_DELAY);
        if (hasSession) {
          handleSuccessfulVerification();
          return;
        }

        throw new Error("Invalid or expired code. Please try again.");
      } catch (err) {
        // Before showing error, double-check if session exists (race condition)
        try {
          const hasSession = await pollForSession(SESSION_RETRY_DELAY);
          if (hasSession) {
            handleSuccessfulVerification();
            return;
          }
        } catch {
          // Session check failed, continue with error
        }

        // Show error message
        const errorMessage =
          err instanceof Error && err.message !== "An unexpected error occurred"
            ? err.message
            : "Invalid or expired code. Please try again.";
        setError(errorMessage);
        setIsVerifying(false);
        codeForm.reset();
      }
    },
    [
      router,
      codeForm,
      redirectUrl,
      handleSuccessfulVerification,
      pollForSession,
    ],
  );

  const onCodeSubmit = useCallback(
    async (values: CodeFormValues) => {
      await verifyCode(values.code);
    },
    [verifyCode],
  );

  // Auto-submit when code reaches 6 characters
  useEffect(() => {
    if (codeValue?.length === 6 && !isVerifying && success) {
      void codeForm.handleSubmit(onCodeSubmit)();
    }
  }, [codeValue, isVerifying, success, codeForm, onCodeSubmit]);

  return (
    <>
      <MainHeader />
      <div className="flex min-h-screen items-center justify-center p-4 pt-24">
        <Card className="bg-background/40 border-primary/10 hover-only hover:border-primary/30 hover:shadow-primary/5 w-full max-w-md gap-2 overflow-hidden rounded-lg border transition-[border-color,box-shadow] duration-200 ease-out">
          <CardHeader className="px-6 pt-0 pb-0">
            <div className="mb-1 flex items-center">
              <div className="bg-primary/10 ring-primary/20 mr-3 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1">
                <Mail className="text-primary h-5 w-5" />
              </div>
              <CardTitle className="text-foreground text-xl">
                {success
                  ? "Check your email"
                  : isSignupMode
                    ? "Create your account"
                    : "Sign in to your account"}
              </CardTitle>
            </div>
            <CardDescription className="text-foreground/60 text-base leading-relaxed">
              {success ? (
                <>We&apos;ve sent a magic link to your email address.</>
              ) : redirectUrl !== "/" ? (
                "Authentication is required to access the requested page"
              ) : isSignupMode ? (
                "Enter your email to create your account"
              ) : (
                "Enter your email to receive a magic link"
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pt-1 pb-2">
            {success ? (
              <div className="space-y-4">
                <Form {...codeForm}>
                  <form
                    onSubmit={codeForm.handleSubmit(onCodeSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={codeForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <div className="space-y-4 text-center">
                            <p className="text-muted-foreground text-sm">
                              Code sent to{" "}
                              <span className="text-foreground font-medium">
                                {submittedEmail}
                              </span>
                            </p>
                            <FormDescription className="text-muted-foreground text-sm">
                              Enter the 6-digit code from your email
                            </FormDescription>
                          </div>
                          <FormControl>
                            <div className="flex justify-center py-0">
                              <div
                                className={`transition-all duration-200 ${
                                  error ? "animate-shake" : ""
                                }`}
                              >
                                <InputOTP
                                  maxLength={6}
                                  disabled={isVerifying}
                                  value={field.value?.toUpperCase() ?? ""}
                                  onChange={(value) => {
                                    field.onChange(value.toUpperCase());
                                    setError(null); // Clear error when user starts typing
                                  }}
                                  containerClassName="gap-3"
                                  aria-label="Verification code input"
                                >
                                  <InputOTPGroup className="justify-center">
                                    <InputOTPSlot
                                      index={0}
                                      className="h-14 w-12 text-lg"
                                      aria-label="First digit"
                                    />
                                    <InputOTPSlot
                                      index={1}
                                      className="h-14 w-12 text-lg"
                                      aria-label="Second digit"
                                    />
                                    <InputOTPSlot
                                      index={2}
                                      className="h-14 w-12 text-lg"
                                      aria-label="Third digit"
                                    />
                                    <InputOTPSlot
                                      index={3}
                                      className="h-14 w-12 text-lg"
                                      aria-label="Fourth digit"
                                    />
                                    <InputOTPSlot
                                      index={4}
                                      className="h-14 w-12 text-lg"
                                      aria-label="Fifth digit"
                                    />
                                    <InputOTPSlot
                                      index={5}
                                      className="h-14 w-12 text-lg"
                                      aria-label="Sixth digit"
                                    />
                                  </InputOTPGroup>
                                </InputOTP>
                              </div>
                            </div>
                          </FormControl>
                          {error && (
                            <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-3">
                              <div className="flex items-center justify-center gap-2">
                                <AlertCircle className="text-destructive h-4 w-4 shrink-0" />
                                <p className="text-destructive text-sm">
                                  {error}
                                </p>
                              </div>
                            </div>
                          )}
                          {isVerifying && (
                            <div className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Verifying code...</span>
                            </div>
                          )}
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>

                <div className="border-border/50 border-t pt-4">
                  <div className="flex flex-col gap-3">
                    <p className="text-muted-foreground text-center text-xs">
                      Didn&apos;t receive the code? Check your spam folder or
                      resend.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mx-auto h-9 w-1/2 min-w-[140px] text-sm"
                      onClick={handleResend}
                      disabled={isLoading || resendCooldown > 0}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          <span className="whitespace-nowrap">Sending...</span>
                        </>
                      ) : resendCooldown > 0 ? (
                        <span className="whitespace-nowrap">
                          Resend in {resendCooldown}s
                        </span>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4 shrink-0" />
                          <span className="whitespace-nowrap">Resend code</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">
                          Email address
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            autoComplete="email"
                            disabled={isLoading}
                            className="h-11 text-base"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {error && (
                    <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="text-destructive mt-0.5 h-4 w-4 shrink-0" />
                        <p className="text-destructive text-sm">{error}</p>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="h-11 w-full text-base font-medium"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isSignupMode
                          ? "Creating account..."
                          : "Sending magic link..."}
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        {isSignupMode ? "Create account" : "Send magic link"}
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>

          <CardFooter className="flex justify-center px-6 pt-0 pb-0">
            <p className="text-muted-foreground/70 text-center text-xs">
              {isSignupMode ? "By creating an account" : "By signing in"}, you
              agree to our
              <br />
              <a
                href="/terms"
                className="text-primary/80 hover:text-primary underline-offset-4 transition-colors duration-200 ease-out hover:underline"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="/privacy"
                className="text-primary/80 hover:text-primary underline-offset-4 transition-colors duration-200 ease-out hover:underline"
              >
                Privacy Policy
              </a>
            </p>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <>
          <MainHeader />
          <div className="flex min-h-screen items-center justify-center p-4 pt-24">
            <Card className="bg-background/40 border-primary/10 w-full max-w-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
