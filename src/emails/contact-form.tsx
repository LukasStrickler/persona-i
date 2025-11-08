import {
  Body,
  Container,
  Head,
  Heading,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";

interface ContactFormEmailProps {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export const ContactFormEmail = ({
  name,
  email,
  phone,
  message,
}: ContactFormEmailProps) => {
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
            .mobile-label {
              font-size: 11px !important;
              margin-bottom: 6px !important;
            }
            .mobile-link {
              min-height: 44px !important;
              padding-top: 8px !important;
              padding-bottom: 8px !important;
            }
          }
        `}</style>
      </Head>
      <Preview>New contact form submission from {name}</Preview>
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
                lineHeight: "1.2",
                margin: "0 0 8px 0",
              }}
            >
              New Contact Form Submission
            </Heading>
            <Text
              className="mobile-text mb-0 text-base text-gray-600"
              style={{
                color: "#4b5563",
                fontSize: "16px",
                lineHeight: "1.5",
                margin: "0",
              }}
            >
              You have received a new message from the contact form on
              Persona[i].
            </Text>
          </Section>

          {/* Contact Information */}
          <Section
            className="mobile-section-padding bg-white px-6 pb-6"
            style={{
              backgroundColor: "#ffffff",
              padding: "0 24px 24px 24px",
            }}
          >
            <div
              className="mobile-inner-padding"
              style={{
                backgroundColor: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <Heading
                className="mt-0 mb-3 text-lg font-semibold text-gray-900"
                style={{
                  color: "#111827",
                  fontSize: "18px",
                  fontWeight: "600",
                  lineHeight: "1.4",
                  margin: "0 0 12px 0",
                }}
              >
                Contact Information
              </Heading>

              {/* Name */}
              <div style={{ marginBottom: "16px" }}>
                <Text
                  className="mobile-label mb-0 text-xs font-medium text-gray-500"
                  style={{
                    color: "#6b7280",
                    fontSize: "12px",
                    fontWeight: "500",
                    lineHeight: "1.4",
                    margin: "0 0 4px 0",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Name
                </Text>
                <Text
                  className="mobile-text mt-0 mb-0 text-base text-gray-900"
                  style={{
                    color: "#111827",
                    fontSize: "16px",
                    lineHeight: "1.5",
                    margin: "0",
                    wordBreak: "break-word",
                  }}
                >
                  {name}
                </Text>
              </div>

              {/* Email */}
              <div style={{ marginBottom: phone ? "16px" : "0" }}>
                <Text
                  className="mobile-label mb-0 text-xs font-medium text-gray-500"
                  style={{
                    color: "#6b7280",
                    fontSize: "12px",
                    fontWeight: "500",
                    lineHeight: "1.4",
                    margin: "0 0 4px 0",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Email
                </Text>
                <Text
                  className="mobile-text mt-0 mb-0 text-base text-gray-900"
                  style={{
                    color: "#111827",
                    fontSize: "16px",
                    lineHeight: "1.5",
                    margin: "0",
                    wordBreak: "break-word",
                  }}
                >
                  <a
                    href={`mailto:${email}`}
                    className="mobile-link"
                    style={{
                      color: "#6366f1",
                      textDecoration: "none",
                      fontSize: "16px",
                      lineHeight: "1.5",
                    }}
                  >
                    {email}
                  </a>
                </Text>
              </div>

              {/* Phone - Only shown if provided */}
              {phone && (
                <div style={{ marginBottom: "0" }}>
                  <Text
                    className="mobile-label mb-0 text-xs font-medium text-gray-500"
                    style={{
                      color: "#6b7280",
                      fontSize: "12px",
                      fontWeight: "500",
                      lineHeight: "1.4",
                      margin: "0 0 4px 0",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Phone
                  </Text>
                  <Text
                    className="mobile-text mt-0 mb-0 text-base text-gray-900"
                    style={{
                      color: "#111827",
                      fontSize: "16px",
                      lineHeight: "1.5",
                      margin: "0",
                      wordBreak: "break-word",
                    }}
                  >
                    <a
                      href={`tel:${phone.replace(/\s/g, "")}`}
                      className="mobile-link"
                      style={{
                        color: "#6366f1",
                        textDecoration: "none",
                        fontSize: "16px",
                        lineHeight: "1.5",
                      }}
                    >
                      {phone}
                    </a>
                  </Text>
                </div>
              )}
            </div>
          </Section>

          {/* Message Section */}
          <Section
            className="mobile-section-padding bg-white px-6 pb-6"
            style={{
              backgroundColor: "#ffffff",
              padding: "0 24px 24px 24px",
            }}
          >
            <div
              className="mobile-inner-padding"
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <Heading
                className="mt-0 mb-3 text-lg font-semibold text-gray-900"
                style={{
                  color: "#111827",
                  fontSize: "18px",
                  fontWeight: "600",
                  lineHeight: "1.4",
                  margin: "0 0 12px 0",
                }}
              >
                Message
              </Heading>
              <Text
                className="mobile-text mb-0 text-base leading-relaxed whitespace-pre-wrap text-gray-700"
                style={{
                  color: "#374151",
                  fontSize: "16px",
                  lineHeight: "1.6",
                  margin: "0",
                  whiteSpace: "pre-wrap",
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                {message}
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
              This email was sent from the contact form on Persona[i]
              <br />
              personai.review · Contact Form Submission
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  );
};

ContactFormEmail.PreviewProps = {
  name: "John Doe",
  email: "john.doe@example.com",
  phone: "+1 (555) 123-4567",
  message:
    "Hello! I'm interested in partnering with Persona[i] to add custom assessments for my organization. Could we schedule a call to discuss this further?",
} as ContactFormEmailProps;

export default ContactFormEmail;
