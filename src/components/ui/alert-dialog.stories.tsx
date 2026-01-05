import React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
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
} from "./alert-dialog";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";

const meta = {
  title: "UI/AlertDialog",
  component: AlertDialog,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A modal dialog that interrupts the user with important content and expects a response.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    open: {
      control: "boolean",
      description: "The controlled open state of the dialog.",
    },
  },
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <AlertDialog {...args}>
      <AlertDialogTrigger asChild>
        <Button variant="outline">Show Dialog</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

export const Destructive: Story = {
  render: (args) => (
    <AlertDialog {...args}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete Account</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

export const WithForm: Story = {
  render: (args) => (
    <AlertDialog {...args}>
      <AlertDialogTrigger asChild>
        <Button variant="outline">Show Dialog with Form</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Please Confirm</AlertDialogTitle>
          <AlertDialogDescription>
            Please type your username to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Username
            </Label>
            <Input id="name" value="@peduarte" className="col-span-3" />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

export const OpenInline: Story = {
  name: "Open (Inline)",
  args: { open: true },
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "Renders the dialog inline inside the Storybook canvas using Radix primitives with a custom portal container and no backdrop/scroll lock.",
      },
    },
  },
  render: (args) => {
    const [open, setOpen] = React.useState<boolean>(args.open ?? true);
    const [container, setContainer] = React.useState<HTMLDivElement | null>(
      null,
    );

    React.useEffect(() => {
      document.body.setAttribute("data-story-alert-inline", "true");
      return () => {
        document.body.removeAttribute("data-story-alert-inline");
      };
    }, []);

    return (
      <>
        <style>{`
          body[data-story-alert-inline][data-scroll-locked] {
            overflow: visible !important;
            padding-right: 0 !important;
          }
          body[data-story-alert-inline] [data-slot="alert-dialog-overlay"] {
            display: none !important;
          }
        `}</style>
        <div className="relative flex w-full max-w-[640px] items-start gap-4 rounded-lg border p-6 shadow-sm">
          <Button variant="outline" onClick={() => setOpen((prev) => !prev)}>
            Toggle dialog
          </Button>
          <div ref={setContainer} className="relative w-full">
            {container ? (
              <AlertDialog open={open} onOpenChange={setOpen} modal={false}>
                <AlertDialogTrigger asChild>
                  <Button variant="secondary">Open dialog</Button>
                </AlertDialogTrigger>
                <AlertDialogContent
                  portalContainer={container}
                  hideOverlay
                  className="static m-0 mt-3 w-full max-w-[420px] translate-x-0 translate-y-0 transform-none border shadow-sm"
                >
                  <div className="text-muted-foreground mb-2 text-sm">
                    Inline preview keeps the canvas interactive and scrollable
                    while showing real AlertDialog content.
                  </div>
                  <AlertDialogHeader className="space-y-2 text-left">
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      your account and remove your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setOpen(false)}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={() => setOpen(false)}>
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
        </div>
      </>
    );
  },
};
