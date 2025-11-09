"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function NewsletterForm() {
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        // TODO: Implement newsletter subscription
      }}
    >
      <Input
        type="email"
        name="email"
        placeholder="Enter your email"
        className="mx-auto max-w-80 flex-1 text-center"
        aria-label="Email address for newsletter"
      />
      <Button type="submit" className="mx-auto max-w-md sm:w-auto">
        Subscribe
      </Button>
    </form>
  );
}
