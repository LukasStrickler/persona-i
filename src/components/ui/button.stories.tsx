import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";
import { Heart, Download, ArrowRight } from "lucide-react";

const meta = {
  title: "UI/Button",
  component: Button,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A versatile button component with multiple variants and sizes. Built with Radix UI and class-variance-authority for flexible styling.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "destructive",
        "outline",
        "secondary",
        "ghost",
        "link",
      ],
      description: "The visual style variant of the button",
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon", "icon-sm", "icon-lg"],
      description: "The size of the button",
    },
    disabled: {
      control: "boolean",
      description: "Whether the button is disabled",
    },
    asChild: {
      control: "boolean",
      description:
        "Render as a child component using Radix UI Slot (for composition)",
    },
    children: {
      control: "text",
      description: "The button content",
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story
export const Default: Story = {
  args: {
    children: "Button",
  },
};

// Variants
export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: "Delete",
  },
};

export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Outline",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Secondary",
  },
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
    children: "Ghost",
  },
};

export const Link: Story = {
  args: {
    variant: "link",
    children: "Link Button",
  },
};

// Sizes
export const Small: Story = {
  args: {
    size: "sm",
    children: "Small Button",
  },
};

export const Large: Story = {
  args: {
    size: "lg",
    children: "Large Button",
  },
};

// With icons
export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Heart className="size-4" />
        Like
      </>
    ),
  },
};

export const WithIconRight: Story = {
  args: {
    children: (
      <>
        Download
        <Download className="size-4" />
      </>
    ),
  },
};

export const IconOnly: Story = {
  args: {
    size: "icon",
    children: <Heart className="size-4" />,
    "aria-label": "Like",
  },
};

export const IconSmall: Story = {
  args: {
    size: "icon-sm",
    children: <Heart className="size-4" />,
    "aria-label": "Like",
  },
};

export const IconLarge: Story = {
  args: {
    size: "icon-lg",
    children: <Heart className="size-4" />,
    "aria-label": "Like",
  },
};

// States
export const Disabled: Story = {
  args: {
    disabled: true,
    children: "Disabled Button",
  },
};

export const DisabledDestructive: Story = {
  args: {
    variant: "destructive",
    disabled: true,
    children: "Disabled Destructive",
  },
};

// Interactive example
export const Interactive: Story = {
  args: {
    children: "Click me",
    onClick: () => alert("Button clicked!"),
  },
};

// All variants showcase
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="default">Default</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>
    </div>
  ),
};

// All sizes showcase
export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
      </div>
      <div className="flex items-center gap-2">
        <Button size="icon-sm">
          <Heart className="size-4" />
        </Button>
        <Button size="icon">
          <Heart className="size-4" />
        </Button>
        <Button size="icon-lg">
          <Heart className="size-4" />
        </Button>
      </div>
    </div>
  ),
};

// With arrow icon
export const WithArrow: Story = {
  args: {
    children: (
      <>
        Continue
        <ArrowRight className="size-4" />
      </>
    ),
  },
};
