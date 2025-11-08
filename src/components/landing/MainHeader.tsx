"use client";

import Link from "next/link";
import { useState, useEffect, type ReactNode } from "react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import { Menu, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Tests", href: "/tests" },
  { label: "Models", href: "/models" },
  { label: "Benchmarks", href: "/benchmarks" },
  { label: "Documentation", href: "/documentation" },
];

export function MainHeader() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(
    null,
  );

  const checkSession = async () => {
    try {
      const response = await authClient.getSession();
      const sessionUser = response.data?.user;
      if (sessionUser != null && typeof sessionUser === "object") {
        setIsAuthenticated(true);
        setUser({
          name: sessionUser.name ?? undefined,
          email: sessionUser.email ?? undefined,
        });
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch {
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void checkSession();

    // Listen for session refresh events (e.g., after name update)
    const handleSessionRefresh = () => {
      void checkSession();
    };

    window.addEventListener("session-refresh", handleSessionRefresh);

    return () => {
      window.removeEventListener("session-refresh", handleSessionRefresh);
    };
  }, []);

  return (
    <header
      className={cn(
        "border-border/20 fixed top-0 right-0 left-0 z-50 w-full border-b",
        "bg-gray-200/25",
      )}
      style={{
        margin: 0,
        padding: 0,
      }}
      aria-label="Main navigation"
    >
      <div className="relative z-10 mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link
          href={isAuthenticated ? "/tests" : "/"}
          className="flex cursor-pointer items-center pb-2 select-none"
          aria-label="Persona[i] Home"
        >
          <Logo variant="navigation" />
        </Link>

        {/* Desktop Navigation - hidden on mobile using CSS */}
        <NavigationMenu className="hidden md:flex" viewport={false}>
          <NavigationMenuList>
            {navItems.map((item) => (
              <NavigationMenuItem key={item.href}>
                <NavigationMenuLink
                  asChild
                  className="text-foreground/80 hover:text-foreground text-md font-medium transition-colors"
                >
                  <Link href={item.href}>{item.label}</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Right side: Auth CTAs */}
        <div className="flex items-center gap-2">
          {/* Desktop buttons - hidden on mobile using CSS */}
          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated && user ? (
              <Button variant="outline" asChild>
                <Link
                  href="/account"
                  className="flex items-center justify-center gap-2"
                >
                  <User className="h-4 w-4" />
                  {user.name ?? user.email ?? "Account"}
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild>
                  <Link href="/login?mode=signup">Create account</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile: Sign in button (if not authenticated) and hamburger menu */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Sign in button - SSR rendered, then updated when auth loads */}
            {isAuthenticated && user ? (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href="/account"
                  className="flex items-center justify-center gap-2"
                >
                  <User className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only">
                    {user.name ?? user.email ?? "Account"}
                  </span>
                  <span className="sm:sr-only">Account</span>
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            )}
            {/* Hamburger menu - always shown on mobile */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open menu"
                  className="h-10 w-10"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="flex w-[65%] flex-col p-0 sm:w-[400px]"
              >
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <nav
                  className="flex flex-1 flex-col gap-1 px-6 py-4"
                  aria-label="Mobile navigation"
                >
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-foreground hover:text-foreground hover:bg-accent rounded-md px-3 py-2.5 text-base font-medium transition-colors"
                      onClick={() => setSheetOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
                {/* Account/Sign-in section at bottom */}
                <div className="border-t px-6 pt-4 pb-6">
                  {!isLoading && (
                    <>
                      {isAuthenticated && user ? (
                        <div className="flex flex-col gap-3">
                          <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                            Account
                          </div>
                          <Button variant="outline" asChild className="w-full">
                            <Link
                              href="/account"
                              onClick={() => setSheetOpen(false)}
                              className="flex items-center justify-center gap-2"
                            >
                              <User className="h-4 w-4" />
                              {user.name ?? user.email ?? "Account"}
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                            Get Started
                          </div>
                          <Button variant="outline" asChild className="w-full">
                            <Link
                              href="/login"
                              onClick={() => setSheetOpen(false)}
                            >
                              Sign in
                            </Link>
                          </Button>
                          <Button asChild className="w-full">
                            <Link
                              href="/login?mode=signup"
                              onClick={() => setSheetOpen(false)}
                            >
                              Create account
                            </Link>
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * ContentWrapper component that provides clip-path and gradient fade overlay
 * to hide content behind the fixed header. Wrap your page content with this component.
 */
export function MainHeaderContentWrapper({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {/* Background color gradient fade overlay - 64px smooth fade area */}
      {/* Positioned 64px below header - overlays scrolling content */}
      {/* Content fades out as it approaches the header */}
      <div
        className="pointer-events-none fixed right-0 left-0 z-[45]"
        style={{
          top: "64px",
          height: "64px",
          // Gradient fades from fully opaque to transparent using CSS variable
          background:
            "linear-gradient(to bottom, " +
            "rgba(var(--bg-rgb, 249, 247, 243), 1) 0px, " +
            "rgba(var(--bg-rgb, 249, 247, 243), 0.95) 1.5px, " +
            "rgba(var(--bg-rgb, 249, 247, 243), 0.85) 3px, " +
            "rgba(var(--bg-rgb, 249, 247, 243), 0.7) 4.5px, " +
            "rgba(var(--bg-rgb, 249, 247, 243), 0.5) 6px, " +
            "rgba(var(--bg-rgb, 249, 247, 243), 0.3) 7.5px, " +
            "rgba(var(--bg-rgb, 249, 247, 243), 0.2) 9px, " +
            "rgba(var(--bg-rgb, 249, 247, 243), 0.15) 10.5px, " +
            "rgba(var(--bg-rgb, 249, 247, 243), 0.1) 12px, " +
            "rgba(var(--bg-rgb, 249, 247, 243), 0.06) 18px, " +
            "rgba(var(--bg-rgb, 249, 247, 243), 0.03) 30px, " +
            "rgba(var(--bg-rgb, 249, 247, 243), 0.01) 42px, " +
            "rgba(var(--bg-rgb, 249, 247, 243), 0.1) 64px" + // Lowest value 0.1 at 64px — matches overlay height
            ")",
        }}
      />
      {/* Fixed wrapper that clips content to prevent rendering under header */}
      <div
        className="hide-scrollbar fixed top-0 right-0 bottom-0 left-0 z-40 overflow-y-auto"
        style={{
          // Use clip-path to hide content in the top 64px (header height only)
          // The gradient fade will handle the gradual fade over the next 64px
          clipPath: "inset(64px 0 0 0)",
          WebkitClipPath: "inset(64px 0 0 0)",
          pointerEvents: "auto", // Allow scrolling
        }}
      >
        {children}
      </div>
    </>
  );
}
