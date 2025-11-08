import { z } from "zod";

/**
 * Honeypot field name - hidden field to catch bots
 * Bots will fill this field, humans won't see it
 */
export const honeypotFieldName = "website" as const;

/**
 * Base contact form schema for validation
 * Excludes honeypot field (handled separately)
 */
export const contactBaseSchema = z.object({
  name: z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must be at most 100 characters"),
    ),
  email: z.string().email("Please enter a valid email address").trim(),
  phone: z
    .string()
    .regex(/^[\d\s\-\+\(\)]*$/, "Please enter a valid phone number")
    .max(20, "Phone number must be at most 20 characters")
    .optional()
    .or(z.literal("")),
  message: z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(10, "Message must be at least 10 characters")
        .max(2000, "Message must be at most 2000 characters"),
    ),
  consent: z.boolean().refine((val) => val === true, {
    message: "You must agree to the privacy policy to submit this form",
  }),
});

/**
 * Full contact form payload including security fields
 * Note: csrfToken and secret are validated from the X-Contact-Secret header,
 * not from the request body, so they are optional here.
 */
export const contactFormSchema = contactBaseSchema.extend({
  [honeypotFieldName]: z.string().max(0, "This field should be empty"),
  hCaptchaToken: z.string().min(1, "hCaptcha verification is required"),
  csrfToken: z.string().optional(),
  secret: z.string().optional(),
});

/**
 * Type inference for form values (client-side)
 */
export type ContactFormValues = z.infer<typeof contactBaseSchema>;

/**
 * Type inference for form payload (API request)
 */
export type ContactFormPayload = z.infer<typeof contactFormSchema>;
