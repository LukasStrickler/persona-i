"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useIsMobile } from "@/hooks/use-mobile";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const nameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters")
    .regex(
      /^[\p{L}\p{M}0-9\s'-]+$/u,
      "Name can only contain letters, numbers, spaces, hyphens, and apostrophes",
    ),
});

type NameFormValues = z.infer<typeof nameSchema>;

interface NameCollectionPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  onSuccess?: () => void;
}

export function NameCollectionPrompt({
  open,
  onOpenChange,
  userEmail,
  onSuccess,
}: NameCollectionPromptProps) {
  const isMobile = useIsMobile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canClose, setCanClose] = useState(false);

  // Extract name from email (text before "@")
  const getPrefilledName = (email: string): string => {
    const beforeAt = email.split("@")[0] ?? email;
    // Replace dots and underscores with spaces, capitalize first letter
    return beforeAt
      .replace(/[._]/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
      .trim();
  };

  const form = useForm<NameFormValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: {
      name: getPrefilledName(userEmail),
    },
    mode: "onChange",
  });

  // Reset form when dialog opens or email changes
  useEffect(() => {
    if (open) {
      form.reset({
        name: getPrefilledName(userEmail),
      });
      setCanClose(false); // Reset canClose when dialog opens
    }
  }, [open, userEmail, form]);

  const onSubmit = async (values: NameFormValues) => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/update-user", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: values.name }),
      });

      if (!response.ok) {
        const error = (await response
          .json()
          .catch(() => ({ message: "Failed to update name" }))) as {
          message?: string;
        };
        throw new Error(error.message ?? "Failed to update name");
      }

      // Allow closing and call success callback
      setCanClose(true);
      onOpenChange(false);

      // Dispatch event to refresh session in MainHeader
      window.dispatchEvent(new CustomEvent("session-refresh"));

      onSuccess?.();
    } catch (error) {
      logger.error("Error updating name:", error);
      // Allow closing dialog after error so user can dismiss or retry
      setCanClose(true);
      // Show user-facing error feedback
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update name. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="mb-1 text-base font-medium">Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="John Doe"
                  {...field}
                  disabled={isSubmitting}
                  autoFocus
                  className="h-11 text-base"
                />
              </FormControl>
              <FormMessage className="text-sm" />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );

  const buttonsContent = (
    <Button
      type="submit"
      onClick={form.handleSubmit(onSubmit)}
      disabled={isSubmitting}
      className="h-11 w-full text-base font-medium"
      size="lg"
    >
      {isSubmitting ? "Saving..." : "Continue"}
    </Button>
  );

  // Prevent dialog from closing without submitting
  const handleOpenChange = (newOpen: boolean) => {
    // Only allow closing after successful submission
    if (!newOpen && !canClose) {
      // Prevent closing - user must submit
      return;
    }
    // Allow closing only after successful submission
    if (!newOpen && canClose) {
      onOpenChange(false);
    }
  };

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={handleOpenChange}
        dismissible={false}
        shouldScaleBackground={false}
        modal={true}
        snapPoints={[1]}
        noBodyStyles={true}
      >
        <DrawerContent
          hideDragHandle={true}
          onEscapeKeyDown={(e) => {
            // Prevent closing on escape
            e.preventDefault();
          }}
          onInteractOutside={(e) => {
            // Prevent closing on outside click
            e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            // Prevent closing on outside pointer
            e.preventDefault();
          }}
          className="[&[data-vaul-drawer]]:!transform-none [&[data-vaul-drawer]]:!transition-none"
          style={{
            pointerEvents: "auto",
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
        >
          <DrawerHeader className="px-6 pt-6 pb-2 text-center">
            <div className="mb-3 flex items-center justify-center gap-3">
              <div className="bg-primary/10 ring-primary/20 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1">
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
              <DrawerTitle className="text-foreground text-2xl font-semibold">
                Complete Your Profile
              </DrawerTitle>
            </div>
            <DrawerDescription className="text-muted-foreground mb-0 pb-0 text-base">
              Your name is used to publish and share your results with friends
              or colleagues. It&apos;s the last step before getting started.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-6 pt-1 pb-2">{formContent}</div>
          <DrawerFooter className="px-6 pt-4 pb-6">
            {buttonsContent}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => {
          // Prevent closing on escape
          e.preventDefault();
        }}
        onInteractOutside={(e) => {
          // Prevent closing on outside click
          e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          // Prevent closing on outside pointer
          e.preventDefault();
        }}
      >
        <DialogHeader className="pb-2 text-center">
          <div className="mb-3 flex items-center justify-center gap-3">
            <div className="bg-primary/10 ring-primary/20 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1">
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
            <DialogTitle className="text-foreground text-2xl font-semibold">
              Complete Your Profile
            </DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground mb-0 pb-0 text-base">
            Your name is used to publish and share your results with friends or
            colleagues. It&apos;s the last step before getting started.
          </DialogDescription>
        </DialogHeader>
        <div className="py-0 pt-1">{formContent}</div>
        <DialogFooter className="pt-4">{buttonsContent}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
