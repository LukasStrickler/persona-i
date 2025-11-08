import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { NewsletterForm } from "./NewsletterForm";

const footerLinks = {
  product: [
    { label: "Tests", href: "/tests" },
    { label: "Models", href: "/models" },
    { label: "Benchmarks", href: "/benchmarks" },
  ],
  resources: [
    { label: "Documentation", href: "/documentation" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
  company: [
    { label: "Contact", href: "/contact" },
    { label: "About", href: "/about" },
  ],
};

export function Footer() {
  return (
    <footer className="border-border border-t bg-gray-200/25">
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-4">
        <div className="flex flex-col gap-8 sm:flex-row sm:gap-12 lg:gap-16">
          {/* Logo */}
          <div
            className="mx-auto flex-shrink-0 pb-0 md:mx-0"
            style={{ position: "relative", top: "-8px" }}
          >
            <Logo variant="default" className="mb-2 text-3xl sm:text-4xl" />
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 gap-8 pl-4 sm:grid-cols-3 sm:gap-12 lg:gap-16">
            {/* Product Links */}
            <div>
              <h3 className="mb-2 text-sm font-semibold underline">Product</h3>
              <ul className="space-y-1">
                {footerLinks.product.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources Links */}
            <div>
              <h3 className="mb-2 text-sm font-semibold underline">
                Resources
              </h3>
              <ul className="space-y-1">
                {footerLinks.resources.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h3 className="mb-2 text-sm font-semibold underline">Company</h3>
              <ul className="space-y-1">
                {footerLinks.company.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Newsletter */}
        <div className="border-border mt-8 border-t pt-8">
          <div className="mx-auto max-w-md">
            <h3 className="mb-1 text-center text-sm font-semibold sm:text-left">
              Stay updated
            </h3>
            <p className="text-muted-foreground mb-4 text-center text-sm sm:text-left">
              Get notified about new tests and benchmarks.
            </p>
            <NewsletterForm />
            <p className="text-muted-foreground mt-2 text-center text-xs sm:text-left">
              No spam. Unsubscribe anytime.
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-border mt-4">
          <p className="text-muted-foreground text-center text-sm">
            © {new Date().getFullYear()} Persona[i]. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
