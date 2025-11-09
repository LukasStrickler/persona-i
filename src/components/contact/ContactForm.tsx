"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  contactBaseSchema,
  honeypotFieldName,
  type ContactFormValues,
} from "@/lib/contact/schema";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import type HCaptcha from "@hcaptcha/react-hcaptcha";

const SECRET_COOKIE_NAME = "personai_contact_secret";

// Lazy load hCaptcha component for GDPR compliance
const HCaptchaComponent = React.lazy(() =>
  import("@hcaptcha/react-hcaptcha").then((mod) => ({ default: mod.default })),
);

type SubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; errorCode: string };

export type ContactFormProps = {
  siteKey: string;
};

/**
 * Get cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const [, tail] = parts;
    if (tail) {
      return tail.split(";")[0] ?? null;
    }
  }

  return null;
}

/**
 * Set cookie with secure flags
 */
function setClientCookie(name: string, value: string, maxAgeSeconds = 60 * 60) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:";
  const expires = `max-age=${maxAgeSeconds}`;
  const sameSite = "SameSite=Strict";
  const secureFlag = secure ? "; Secure" : "";
  document.cookie = `${name}=${value}; path=/; ${expires}; ${sameSite}${secureFlag}`;
}

/**
 * Generate cryptographically secure secret for CSRF protection
 */
function generateSecret(): string | null {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${crypto.randomUUID()}-${Date.now().toString(36)}`;
  }

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    try {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      const randomString = btoa(String.fromCharCode(...array));
      return `${randomString}-${Date.now().toString(36)}`;
    } catch (error) {
      console.warn("Cryptographic random generation failed:", error);
    }
  }

  return null;
}

export function ContactForm({ siteKey }: ContactFormProps) {
  // Compute misconfiguration flag (must be after hooks)
  const isMisconfigured = !siteKey || siteKey.trim() === "";

  const [secret, setSecret] = React.useState<string | null>(null);
  const [submission, setSubmission] = React.useState<SubmissionState>({
    status: "idle",
  });
  const [shouldLoadCaptcha, setShouldLoadCaptcha] = React.useState(false);
  const [isCaptchaReady, setIsCaptchaReady] = React.useState(false);
  const captchaRef = React.useRef<HCaptcha | null>(null);
  const pendingPayloadRef = React.useRef<ContactFormValues | null>(null);
  const captchaTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  type FormValues = ContactFormValues & { [honeypotFieldName]: string };

  const form = useForm<FormValues>({
    resolver: zodResolver(
      contactBaseSchema.extend({
        [honeypotFieldName]: z.string().max(0, "This field should be empty"),
      }),
    ),
    defaultValues: {
      name: "",
      email: "",
      phone: undefined,
      message: "",
      consent: false,
      [honeypotFieldName]: "",
    },
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    shouldFocusError: true,
  });

  // Initialize CSRF secret on mount (only if not misconfigured)
  React.useEffect(() => {
    if (isMisconfigured) return;

    const ensureSecret = () => {
      const existing = getCookie(SECRET_COOKIE_NAME);
      if (existing) {
        setSecret(existing);
        return;
      }

      const generated = generateSecret();
      if (generated === null) {
        setSubmission({ status: "error", errorCode: "missing_secret" });
        return;
      }

      setClientCookie(SECRET_COOKIE_NAME, generated);
      setSecret(generated);
    };

    ensureSecret();
  }, [isMisconfigured]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (captchaTimeoutRef.current) {
        clearTimeout(captchaTimeoutRef.current);
        captchaTimeoutRef.current = null;
      }
    };
  }, []);

  // Note: Browser extensions and password managers can identify form fields using
  // the data-attributes already present on inputs (data-form-field, data-form-type).
  // We avoid mutating native DOM properties (form.elements, HTMLInputElement.form)
  // as this can conflict with React and browser expectations.

  const resetCaptcha = React.useCallback(() => {
    // Clear any pending timeout
    if (captchaTimeoutRef.current) {
      clearTimeout(captchaTimeoutRef.current);
      captchaTimeoutRef.current = null;
    }
    setIsCaptchaReady(false);
    if (captchaRef.current) {
      captchaRef.current.resetCaptcha();
    }
  }, []);

  const handleCaptchaVerify = React.useCallback(
    async (token: string) => {
      // Clear any pending timeout
      if (captchaTimeoutRef.current) {
        clearTimeout(captchaTimeoutRef.current);
        captchaTimeoutRef.current = null;
      }

      if (!pendingPayloadRef.current || !secret) {
        setSubmission({ status: "error", errorCode: "missing_data" });
        return;
      }

      const payload = pendingPayloadRef.current;
      pendingPayloadRef.current = null;

      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Contact-Secret": secret,
          },
          body: JSON.stringify({
            ...payload,
            phone: payload.phone ?? undefined,
            [honeypotFieldName]: form.getValues(honeypotFieldName),
            hCaptchaToken: token,
          }),
          credentials: "same-origin",
        });

        if (!response.ok) {
          const errorResult = (await response.json().catch(() => ({}))) as {
            success?: boolean;
            error?: string;
          };
          resetCaptcha();
          setSubmission({
            status: "error",
            errorCode: errorResult.error ?? "unknown_error",
          });
          return;
        }

        const result = (await response.json()) as {
          success?: boolean;
          error?: string;
        };

        if (!result.success) {
          resetCaptcha();
          setSubmission({
            status: "error",
            errorCode: result.error ?? "unknown_error",
          });
          return;
        }

        setSubmission({ status: "success" });
        // Don't reset form - keep user's input visible
        setShouldLoadCaptcha(false);
        setIsCaptchaReady(false);
      } catch (error) {
        console.error("Failed to submit contact form", error);
        resetCaptcha();
        setSubmission({ status: "error", errorCode: "network_error" });
      }
    },
    [form, resetCaptcha, secret],
  );

  const handleCaptchaError = React.useCallback(() => {
    // Clear any pending timeout
    if (captchaTimeoutRef.current) {
      clearTimeout(captchaTimeoutRef.current);
      captchaTimeoutRef.current = null;
    }
    pendingPayloadRef.current = null;
    resetCaptcha();
    setSubmission({ status: "error", errorCode: "captcha_unavailable" });
  }, [resetCaptcha]);

  // Watch for captcha to be ready and execute if needed (only if not misconfigured)
  React.useEffect(() => {
    if (isMisconfigured || !shouldLoadCaptcha || !pendingPayloadRef.current) {
      return;
    }

    // Poll for captcha ref to be available
    const checkInterval = setInterval(() => {
      if (captchaRef.current) {
        clearInterval(checkInterval);
        setIsCaptchaReady(true);
        // Wait a bit for the component to fully initialize
        setTimeout(() => {
          if (captchaRef.current && pendingPayloadRef.current) {
            try {
              captchaRef.current.execute();
              // Set timeout to detect if captcha never responds (30 seconds)
              captchaTimeoutRef.current = setTimeout(() => {
                console.error(
                  "hCaptcha timeout - no response after 30 seconds",
                );
                handleCaptchaError();
              }, 30000);
            } catch (error) {
              console.error("Failed to execute hCaptcha:", error);
              handleCaptchaError();
            }
          }
        }, 200);
      }
    }, 100);

    // Cleanup after 5 seconds if still not ready
    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
      if (!captchaRef.current) {
        console.error("hCaptcha component failed to mount after 5 seconds");
        handleCaptchaError();
      }
    }, 5000);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
    };
  }, [isMisconfigured, shouldLoadCaptcha, handleCaptchaError]);

  const onSubmit = async (values: ContactFormValues) => {
    if (!secret) {
      setSubmission({ status: "error", errorCode: "missing_secret" });
      return;
    }

    if (submission.status === "submitting" || submission.status === "success") {
      return;
    }

    // Check if consent is given
    if (!values.consent) {
      form.setError("consent", {
        type: "manual",
        message: "You must agree to the privacy policy to submit this form",
      });
      return;
    }

    // Trim all string fields
    const trimmedPhone = values.phone?.trim();
    const trimmedValues: ContactFormValues = {
      ...values,
      name: values.name.trim(),
      email: values.email.trim(),
      phone: trimmedPhone && trimmedPhone.length > 0 ? trimmedPhone : undefined,
      message: values.message.trim(),
    };

    setSubmission({ status: "submitting" });
    pendingPayloadRef.current = trimmedValues;

    // Load hCaptcha only now (GDPR compliance)
    if (!shouldLoadCaptcha) {
      setShouldLoadCaptcha(true);
      setIsCaptchaReady(false);
      // The onReady callback will handle execution when component is ready
    } else {
      // Already loaded, execute directly if ready
      if (isCaptchaReady && captchaRef.current) {
        try {
          captchaRef.current.execute();
          // Set timeout to detect if captcha never responds (30 seconds)
          captchaTimeoutRef.current = setTimeout(() => {
            console.error("hCaptcha timeout - no response after 30 seconds");
            handleCaptchaError();
          }, 30000);
        } catch (error) {
          console.error("Failed to execute hCaptcha:", error);
          handleCaptchaError();
        }
      } else if (!isCaptchaReady) {
        // Wait for onReady callback to execute
        // The handleCaptchaReady will execute when ready
      } else {
        console.error("hCaptcha ref is null");
        handleCaptchaError();
      }
    }
  };

  const isSubmitting = submission.status === "submitting";
  const isSuccess = submission.status === "success";
  const showError =
    submission.status === "error" &&
    submission.errorCode !== "validation_error";
  const errorCode = submission.status === "error" ? submission.errorCode : null;

  // Check if any of the main fields (name, email, phone, message) have errors
  const hasFieldErrors =
    !!form.formState.errors.name ||
    !!form.formState.errors.email ||
    !!form.formState.errors.phone ||
    !!form.formState.errors.message;

  // Show error if misconfigured (after all hooks)
  if (isMisconfigured) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Configuration Error</AlertTitle>
        <AlertDescription>
          hCaptcha site key is missing. Please contact the site administrator.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="bg-background/40 border-primary/10 rounded-lg border px-6 py-4 transition-colors sm:px-8">
      <Form {...form}>
        <form
          id="contact-form"
          name="contact-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2"
          noValidate
          data-form-type="contact"
          autoComplete="on"
        >
          {/* Error Messages (at top) */}
          {showError && (
            <div className="space-y-2" aria-live="polite" aria-atomic="true">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Failed to send message</AlertTitle>
                <AlertDescription>
                  {errorCode === "network_error"
                    ? "Network error. Please check your connection and try again."
                    : errorCode === "captcha_unavailable"
                      ? "Verification failed. Please try again."
                      : "An error occurred. Please try again or contact us directly at "}
                  {errorCode !== "network_error" &&
                    errorCode !== "captcha_unavailable" && (
                      <a
                        href="mailto:contact@personai.review"
                        className="hover:text-primary/80 font-medium underline underline-offset-4"
                      >
                        contact@personai.review
                      </a>
                    )}
                  .
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="contact-name">Name</FormLabel>
                  <FormControl>
                    <Input
                      id="contact-name"
                      placeholder="John Doe"
                      autoComplete="name"
                      disabled={isSubmitting || isSuccess}
                      data-form-field="name"
                      data-form-type="text"
                      {...field}
                    />
                  </FormControl>
                  <div
                    className={hasFieldErrors ? "-mt-2 min-h-[18px]" : "-mt-2"}
                  >
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="contact-email">Email</FormLabel>
                  <FormControl>
                    <Input
                      id="contact-email"
                      type="email"
                      placeholder="john@example.com"
                      autoComplete="email"
                      disabled={isSubmitting || isSuccess}
                      data-form-field="email"
                      data-form-type="email"
                      {...field}
                    />
                  </FormControl>
                  <div
                    className={hasFieldErrors ? "-mt-2 min-h-[18px]" : "-mt-2"}
                  >
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="contact-phone">
                    Phone (optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="contact-phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      autoComplete="tel"
                      disabled={isSubmitting || isSuccess}
                      data-form-field="phone"
                      data-form-type="tel"
                      {...field}
                    />
                  </FormControl>
                  <div
                    className={hasFieldErrors ? "-mt-2 min-h-[18px]" : "-mt-2"}
                  >
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem className="-mt-3 sm:col-span-3 md:mt-0">
                  <FormLabel htmlFor="contact-message">Message</FormLabel>
                  <FormControl>
                    <Textarea
                      id="contact-message"
                      placeholder="Tell us about your inquiry..."
                      rows={10}
                      disabled={isSubmitting || isSuccess}
                      className="bg-background border-input min-h-[200px]"
                      autoComplete="off"
                      data-form-field="message"
                      data-form-type="textarea"
                      {...field}
                    />
                  </FormControl>
                  <div
                    className={hasFieldErrors ? "-mt-2 min-h-[18px]" : "-mt-2"}
                  >
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* Consent and Submit Button Row / Success Message */}
          {isSuccess ? (
            <div
              className="relative p-0 pt-1"
              aria-live="polite"
              aria-atomic="true"
            >
              <Alert className="!flex !items-center !gap-4 border-green-600/30 bg-green-600/10 text-green-700 [&>svg]:!size-6 [&>svg]:!translate-y-0">
                <CheckCircle2 className="shrink-0" />
                <div className="flex flex-col">
                  <AlertTitle>Message sent successfully!</AlertTitle>
                  <AlertDescription>
                    Thank you for contacting us. We&apos;ll get back to you as
                    soon as possible.
                  </AlertDescription>
                </div>
              </Alert>
            </div>
          ) : (
            <div className="border-input/60 bg-muted/10 relative rounded-lg border p-4 pt-3">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:pr-32">
                <FormField
                  control={form.control}
                  name="consent"
                  render={({ field }) => {
                    const hasError = form.formState.errors.consent;
                    return (
                      <FormItem className="w-full sm:w-auto sm:flex-1">
                        <div className="flex flex-row items-center space-y-0 space-x-3 sm:items-start">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isSubmitting || isSuccess}
                              className={`-mt-2 shrink-0 md:mt-[5px] ${hasError ? "border-destructive" : ""}`}
                            />
                          </FormControl>
                          <div className="min-w-0 flex-1 pr-2 pb-2 sm:pb-0 md:pt-[2px]">
                            <FormLabel
                              className={`block cursor-pointer text-sm leading-relaxed font-normal${
                                hasError
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                              }`}
                            >
                              I agree to the{" "}
                              <Link
                                href="/privacy"
                                className="text-primary hover:text-primary/80 underline underline-offset-4"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Privacy Policy
                              </Link>{" "}
                              and consent to being contacted regarding my
                              inquiry.
                            </FormLabel>
                          </div>
                        </div>
                      </FormItem>
                    );
                  }}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting || !secret}
                className="w-full shrink-0 sm:absolute sm:right-[6px] sm:w-auto md:top-[6px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Message"
                )}
              </Button>
            </div>
          )}

          {/* Honeypot Field (hidden) */}
          <div className="hidden" aria-hidden="true">
            <FormField
              control={form.control}
              name={honeypotFieldName}
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor={honeypotFieldName} className="sr-only">
                    Leave this field empty
                  </FormLabel>
                  <FormControl>
                    <Input
                      id={honeypotFieldName}
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>

      {/* Lazy load hCaptcha only after consent and submit (GDPR compliance) */}
      {shouldLoadCaptcha && (
        <React.Suspense fallback={null}>
          <HCaptchaComponent
            ref={captchaRef}
            size="invisible"
            sitekey={siteKey}
            onVerify={handleCaptchaVerify}
            onError={handleCaptchaError}
            onExpire={handleCaptchaError}
          />
        </React.Suspense>
      )}
    </div>
  );
}
