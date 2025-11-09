import {
  Body,
  Container,
  Head,
  Heading,
  Preview,
  Section,
  Tailwind,
  Text,
  Link,
} from "@react-email/components";
import * as React from "react";

interface MagicLinkEmailProps {
  verifyUrl: string;
  email: string;
}

const extractToken = (magicLink: string): string => {
  try {
    const url = new URL(magicLink);
    return url.searchParams.get("token") ?? "";
  } catch {
    return "";
  }
};

// Brand colors from globals.css
// Primary: hsl(224 31% 47%) ≈ #4a6fa5
// Secondary: hsl(192 25% 65%) ≈ #8fb8c4
// Accent: hsl(144 20% 50%) ≈ #6b9b7a
const BRAND_PRIMARY = "#4a6fa5"; // Primary blue

export const MagicLinkEmail = ({ verifyUrl, email }: MagicLinkEmailProps) => {
  const token = extractToken(verifyUrl);
  return (
    <Tailwind>
      <Head>
        <style>{`
          @media only screen and (max-width: 600px) {
            .mobile-padding {
              padding: 24px 16px 20px 16px !important;
            }
            .mobile-section-padding {
              padding: 0 16px 20px 16px !important;
            }
            .mobile-inner-padding {
              padding: 16px 12px !important;
            }
            .mobile-footer-padding {
              padding: 16px !important;
            }
            .mobile-heading {
              font-size: 22px !important;
              line-height: 1.3 !important;
              margin-bottom: 12px !important;
            }
            .mobile-text {
              font-size: 15px !important;
              line-height: 1.6 !important;
            }
            .mobile-button {
              padding: 16px 24px !important;
              font-size: 16px !important;
              min-height: 48px !important;
            }
            .mobile-code {
              font-size: 28px !important;
            }
          }
        `}</style>
      </Head>
      <Preview>Sign in to Persona[i]</Preview>
      <Body
        className="bg-gray-50 font-sans"
        style={{
          backgroundColor: "#f9fafb",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          margin: "0",
          padding: "0",
        }}
      >
        <Container
          className="mx-auto w-[600px] max-w-[600px] px-0"
          style={{
            maxWidth: "600px",
            width: "100%",
            margin: "0 auto",
            padding: "0",
          }}
        >
          {/* Header Section */}
          <Section
            className="mobile-padding bg-white px-6 pt-8 pb-6"
            style={{
              backgroundColor: "#ffffff",
              padding: "32px 24px 24px 24px",
            }}
          >
            <Heading
              className="mobile-heading mt-0 mb-2 text-2xl font-bold text-gray-900"
              style={{
                color: "#111827",
                fontSize: "24px",
                fontWeight: "700",
                lineHeight: "1.3",
                margin: "0 0 12px 0",
              }}
            >
              Sign in to Persona[i]
            </Heading>
            <Text
              className="mobile-text mb-0 text-base text-gray-600"
              style={{
                color: "#4b5563",
                fontSize: "16px",
                lineHeight: "1.6",
                margin: "0",
              }}
            >
              Click the button below to access your account. This secure link
              will expire in 30 minutes.
            </Text>
          </Section>

          {/* Main CTA Button */}
          <Section
            className="mobile-section-padding bg-white px-6 pb-6"
            style={{
              backgroundColor: "#ffffff",
              padding: "0 24px 32px 24px",
            }}
          >
            <Link
              href={verifyUrl}
              className="mobile-button block w-full rounded-lg text-center text-white no-underline"
              style={{
                backgroundColor: BRAND_PRIMARY,
                color: "#ffffff",
                display: "block",
                width: "100%",
                borderRadius: "8px",
                padding: "18px 32px",
                textAlign: "center",
                fontSize: "17px",
                fontWeight: "600",
                textDecoration: "none",
                minHeight: "52px",
                lineHeight: "1.4",
                letterSpacing: "0.01em",
                boxSizing: "border-box",
              }}
            >
              Sign In Now
            </Link>
          </Section>

          {/* Verification Code Section */}
          {token && (
            <Section
              className="mobile-section-padding bg-white px-6 pb-6"
              style={{
                backgroundColor: "#ffffff",
                padding: "0 24px 24px 24px",
              }}
            >
              <div
                className="mobile-inner-padding rounded-lg border border-gray-200 bg-gray-50 px-4 py-6"
                style={{
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "24px 16px",
                }}
              >
                <Text
                  className="mobile-text mt-0 mb-3 text-center text-sm text-gray-600"
                  style={{
                    color: "#4b5563",
                    fontSize: "14px",
                    lineHeight: "1.6",
                    margin: "0 0 16px 0",
                    textAlign: "center",
                  }}
                >
                  Or enter this verification code manually:
                </Text>
                <Text
                  className="mobile-code text-center font-mono text-3xl font-bold tracking-widest"
                  style={{
                    color: BRAND_PRIMARY,
                    fontSize: "32px",
                    fontWeight: "700",
                    letterSpacing: "0.15em",
                    textAlign: "center",
                    fontFamily: '"Courier New", Courier, monospace',
                    lineHeight: "1.3",
                    userSelect: "all",
                    WebkitUserSelect: "all",
                    MozUserSelect: "all",
                    margin: "0",
                    padding: "8px 0",
                  }}
                >
                  {token}
                </Text>
                <Text
                  className="mt-3 mb-0 text-center text-xs text-gray-500"
                  style={{
                    color: "#6b7280",
                    fontSize: "12px",
                    lineHeight: "1.6",
                    margin: "16px 0 0 0",
                    textAlign: "center",
                  }}
                >
                  Copy and paste this code into the sign-in form
                </Text>
              </div>
            </Section>
          )}

          {/* Security Notice */}
          <Section
            className="mobile-section-padding bg-white px-6 pb-6"
            style={{
              backgroundColor: "#ffffff",
              padding: "0 24px 24px 24px",
            }}
          >
            <div
              className="mobile-inner-padding rounded-lg border border-gray-200 bg-gray-50 px-4 py-4"
              style={{
                backgroundColor: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <Text
                className="mobile-text mb-0 text-sm text-gray-600"
                style={{
                  color: "#4b5563",
                  fontSize: "14px",
                  lineHeight: "1.7",
                  margin: "0",
                }}
              >
                <strong
                  style={{
                    color: "#111827",
                    fontWeight: "600",
                  }}
                >
                  Security notice:
                </strong>{" "}
                If you didn&apos;t request this link, you can safely ignore this
                email. This link will expire in 30 minutes for your security.
              </Text>
            </div>
          </Section>

          {/* Footer */}
          <Section
            className="mobile-footer-padding bg-gray-100 px-6 py-4"
            style={{
              backgroundColor: "#f3f4f6",
              padding: "16px 24px",
            }}
          >
            <Text
              className="mb-0 text-center text-xs text-gray-500"
              style={{
                color: "#6b7280",
                fontSize: "12px",
                lineHeight: "1.5",
                margin: "0",
                textAlign: "center",
              }}
            >
              This email was sent to {email}
              <br />
              Persona[i] · personai.review · Secure Authentication
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  );
};

MagicLinkEmail.PreviewProps = {
  verifyUrl: "https://personai.review/api/auth/verify?token=ABC123",
  email: "user@example.com",
} as MagicLinkEmailProps;

export default MagicLinkEmail;
