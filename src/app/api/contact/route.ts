import { NextResponse } from "next/server";
import { Resend } from "resend";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import { contactFormSchema, honeypotFieldName } from "@/lib/schemas/contact";
import { ContactFormEmail } from "@/emails/contact-form";

const resend = new Resend(env.RESEND_API_KEY);

const SECRET_COOKIE_NAME = "personai_contact_secret";

/**
 * Verify hCaptcha token with hCaptcha API
 */
async function verifyHCaptcha(token: string): Promise<boolean> {
  if (!env.HCAPTCHA_SECRET_KEY) {
    // In development, allow bypassing hCaptcha if secret key is not set
    if (env.NODE_ENV === "development") {
      logger.warn(
        "hCaptcha secret key not set, skipping verification in development",
      );
      return true;
    }
    logger.error("hCaptcha secret key not set in production");
    return false;
  }

  try {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch("https://hcaptcha.com/siteverify", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret: env.HCAPTCHA_SECRET_KEY,
          response: token,
        }),
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.error("hCaptcha verification failed", {
          status: response.status,
        });
        return false;
      }

      const data = (await response.json()) as { success?: boolean };
      if (typeof data.success !== "boolean") {
        logger.error("Invalid hCaptcha response format");
        return false;
      }
      return data.success === true;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        logger.error("hCaptcha verification timeout");
        return false;
      }
      throw fetchError;
    }
  } catch (error) {
    logger.error("Error verifying hCaptcha token", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Get CSRF token from cookie
 */
function getCSRFTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const secretCookie = cookies.find((c) =>
    c.startsWith(`${SECRET_COOKIE_NAME}=`),
  );

  if (!secretCookie) return null;

  const value = secretCookie.split("=").slice(1).join("=");
  return value ? decodeURIComponent(value) : null;
}

export async function POST(request: Request) {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = (await request.json()) as unknown;
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json(
          { success: false, error: "invalid_json" },
          { status: 400 },
        );
      }
      throw error;
    }

    // Validate full payload including security fields
    const validatedPayload = contactFormSchema.safeParse(body);

    if (!validatedPayload.success) {
      logger.warn("Contact form validation failed", {
        errors: validatedPayload.error.issues,
      });
      return NextResponse.json(
        { success: false, error: "validation_error" },
        { status: 400 },
      );
    }

    const payload = validatedPayload.data;

    // Check honeypot field (should be empty)
    if (payload[honeypotFieldName] && payload[honeypotFieldName].length > 0) {
      logger.warn("Honeypot field filled, likely a bot", {
        honeypotFilled: true,
      });
      // Return success to avoid revealing honeypot
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Verify CSRF token from header (secret is sent in X-Contact-Secret header)
    const secretHeader = request.headers.get("X-Contact-Secret");
    const cookieHeader = request.headers.get("cookie");
    const csrfToken = getCSRFTokenFromCookie(cookieHeader);

    if (!csrfToken || !secretHeader || csrfToken !== secretHeader) {
      logger.warn("CSRF token mismatch", {
        hasCookie: !!csrfToken,
        hasHeader: !!secretHeader,
        tokenMatch: csrfToken === secretHeader,
      });
      return NextResponse.json(
        { success: false, error: "csrf_error" },
        { status: 403 },
      );
    }

    // Verify hCaptcha token
    const isCaptchaValid = await verifyHCaptcha(payload.hCaptchaToken);

    if (!isCaptchaValid) {
      logger.warn("hCaptcha verification failed");
      return NextResponse.json(
        { success: false, error: "captcha_error" },
        { status: 400 },
      );
    }

    // Extract form data (already validated by contactFormSchema)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [honeypotFieldName]: _, hCaptchaToken: __, ...formData } = payload;

    // Check if contact email is configured
    if (!env.CONTACT_EMAIL) {
      if (env.NODE_ENV === "production") {
        logger.error("CONTACT_EMAIL not configured in production");
        return NextResponse.json(
          { success: false, error: "configuration_error" },
          { status: 500 },
        );
      }
      // In development, log safe metadata instead of PII
      logger.dev("Contact form submission (development mode, no email sent)", {
        timestamp: new Date().toISOString(),
        hasName: !!formData.name,
        hasEmail: !!formData.email,
        hasPhone: !!formData.phone,
        hasMessage: !!formData.message,
        messageLength: formData.message?.length ?? 0,
        // Email domain only (safe metadata)
        emailDomain: formData.email?.split("@")[1] ?? "unknown",
      });
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Send email via Resend with proper error handling
    try {
      const { data, error: resendError } = await resend.emails.send({
        from: env.RESEND_FROM,
        to: env.CONTACT_EMAIL,
        subject: `New Contact Form Submission from ${formData.name}`,
        react: ContactFormEmail({
          name: formData.name,
          email: formData.email,
          phone: formData.phone ?? undefined,
          message: formData.message,
        }),
      });

      if (resendError) {
        logger.error("Resend API error", {
          error: resendError.message,
          errorName: resendError.name,
          to: env.CONTACT_EMAIL,
          from: formData.email,
        });
        return NextResponse.json(
          { success: false, error: "email_error" },
          { status: 500 },
        );
      }

      logger.dev("Contact form email sent successfully", {
        emailId: data?.id,
        to: env.CONTACT_EMAIL,
        from: formData.email,
      });
    } catch (error) {
      logger.error("Error sending contact form email", {
        error: error instanceof Error ? error.message : String(error),
        to: env.CONTACT_EMAIL,
        from: formData.email,
      });
      return NextResponse.json(
        { success: false, error: "email_error" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error("Unexpected error in contact form handler", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
