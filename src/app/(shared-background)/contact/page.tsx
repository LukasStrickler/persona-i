import {
  MainHeader,
  MainHeaderContentWrapper,
} from "@/components/landing/MainHeader";
import { Footer } from "@/components/landing/Footer";
import { ContactForm } from "@/components/contact/ContactForm";
import { env } from "@/env";

export default function ContactPage() {
  const siteKey = env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? "";

  return (
    <>
      <MainHeader />
      <MainHeaderContentWrapper>
        <main className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-4 pt-16 pb-8 sm:py-16 md:py-24">
          <div className="w-full max-w-5xl">
            <div className="text-center">
              <h2 className="mt-0 text-2xl font-bold tracking-tight sm:mt-0 sm:text-3xl">
                Contact Us
              </h2>
              <p className="text-muted-foreground mx-auto mt-0.5 max-w-2xl text-base sm:mt-1">
                Have questions? Want to partner with us?
                <br className="sm:hidden" />
                <span className="sm:hidden"> </span>
                <span className="hidden sm:inline"> </span>Get in touch!
              </p>
            </div>
            <div className="mx-auto mt-4 sm:mt-8">
              <ContactForm siteKey={siteKey} />
            </div>
          </div>
        </main>
        <Footer />
      </MainHeaderContentWrapper>
    </>
  );
}
