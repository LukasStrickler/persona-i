"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchSession = async () => {
      try {
        const response = await authClient.getSession();
        if (!isMounted) return;

        const userData = response.data?.user;
        if (userData && typeof userData === "object" && "email" in userData) {
          setUser(userData as User);
        } else {
          // Redirect to login with callback to account page
          void router.push("/login?redirect=/account");
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching session:", error);
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
          // Redirect to login with callback to account page
          void router.push("/login?redirect=/account");
        }
      }
    };

    void fetchSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut();
      if (mountedRef.current) {
        setUser(null);
        void router.push("/");
      }
    } catch (error) {
      console.error("Error signing out:", error);
      if (mountedRef.current) {
        void router.push("/");
      }
    } finally {
      if (mountedRef.current) {
        setIsLoggingOut(false);
      }
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirmed: true }),
      });

      if (!response.ok) {
        const error = (await response
          .json()
          .catch(() => ({ message: "Failed to delete account" }))) as {
          message?: string;
        };
        throw new Error(error.message ?? "Failed to delete account");
      }

      // Sign out and redirect
      await authClient.signOut();
      if (mountedRef.current) {
        setUser(null);
        void router.push("/");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      if (mountedRef.current) {
        // Use toast for better UX instead of alert()
        toast.error("Failed to delete account. Please try again.");
        setIsDeleting(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="bg-background/40 border-primary/10 hover:border-primary/30 hover:shadow-primary/5 w-full max-w-md gap-2 overflow-hidden rounded-lg border transition-all">
          <CardHeader className="pt-5 pb-0">
            <div className="mb-1 flex items-center">
              <div className="bg-primary/10 ring-primary/20 mr-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ring-1">
                <svg
                  className="text-primary h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <CardTitle className="text-foreground text-xl">Account</CardTitle>
            </div>
            <CardDescription className="text-foreground/60 text-base">
              Manage your account settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pt-2 pb-2">
            <div className="space-y-3">
              <div>
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Name
                </p>
                <Skeleton className="h-6 w-32" />
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Email
                </p>
                <Skeleton className="h-6 w-48" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 px-6 pb-0">
            <Button
              onClick={() => {
                void router.push("/");
              }}
              variant="outline"
              className="w-full"
              disabled
            >
              Back to Home
            </Button>
            <Button variant="secondary" className="w-full" disabled>
              Sign Out
            </Button>
            <Button variant="destructive" className="w-full" disabled>
              Delete Account
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!user && isLoading) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="mt-2 h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-4 h-10 w-full" />
            <Skeleton className="mb-4 h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="bg-background/40 border-primary/10 hover-only hover:border-primary/30 hover:shadow-primary/5 w-full max-w-md gap-2 overflow-hidden rounded-lg border transition-[border-color,box-shadow] duration-200 ease-out">
        <CardHeader className="pt-5 pb-0">
          <div className="mb-1 flex items-center">
            <div className="bg-primary/10 ring-primary/20 mr-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ring-1">
              <svg
                className="text-primary h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <CardTitle className="text-foreground text-xl">Account</CardTitle>
          </div>
          <CardDescription className="text-foreground/60 text-base">
            Manage your account settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-6 pt-2 pb-2">
          <div className="space-y-3">
            <div>
              <p className="text-muted-foreground mb-1 text-sm font-medium">
                Name
              </p>
              <p className="text-foreground text-lg">
                {user.name || "Not set"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1 text-sm font-medium">
                Email
              </p>
              <p className="text-foreground text-lg">{user.email}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 px-6 pb-0">
          <Button
            onClick={() => {
              void router.push("/");
            }}
            variant="outline"
            className="w-full"
          >
            Back to Home
          </Button>
          <Button
            onClick={handleLogout}
            disabled={isLoggingOut}
            variant="secondary"
            className="w-full"
          >
            {isLoggingOut ? "Signing out..." : "Sign Out"}
          </Button>
          <AlertDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
          >
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full"
                disabled={isDeleting}
                onClick={() => setDeleteDialogOpen(true)}
              >
                {isDeleting ? "Deleting..." : "Delete Account"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  your account and remove all your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? "Deleting..." : "Delete Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}
