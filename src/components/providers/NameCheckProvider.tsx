"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { NameCollectionPrompt } from "@/components/auth/NameCollectionPrompt";

export function NameCheckProvider({ children }: { children: React.ReactNode }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const pathname = usePathname();

  // Check session on mount and whenever pathname changes
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await authClient.getSession();
        const user = response.data?.user;

        if (user && typeof user === "object" && "email" in user) {
          const email = String(user.email ?? "");
          const name = (user.name as string | null | undefined) ?? "";

          setUserEmail(email);

          // Always check if name is missing, null, or empty on every page
          // Show prompt if name is not set, regardless of previous prompts
          if (!name || name.trim() === "") {
            setShowPrompt(true);
          } else {
            // Name is set, ensure prompt is closed
            setShowPrompt(false);
          }
        } else {
          // No user session, close prompt
          setShowPrompt(false);
        }
      } catch (error) {
        console.error("Error checking session:", error);
        // On error, don't show prompt
        setShowPrompt(false);
      }
    };

    void checkSession();
  }, [pathname]); // Re-check whenever route changes

  const handleSuccess = async () => {
    try {
      // Reload the session to get updated user data
      const response = await authClient.getSession();
      const user = response.data?.user;

      if (user && typeof user === "object" && "name" in user) {
        const name = (user.name as string | null | undefined) ?? "";
        // If name is now set, close the prompt
        if (name && name.trim() !== "") {
          setShowPrompt(false);
        }
      }
    } catch (error) {
      console.error("Error fetching session after name update:", error);
      // Don't close prompt on error, let user retry
    }
  };

  return (
    <>
      {children}
      {userEmail && (
        <NameCollectionPrompt
          open={showPrompt}
          onOpenChange={setShowPrompt}
          userEmail={userEmail}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
