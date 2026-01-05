import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BackgroundBeams } from "./background-beams";

/**
 * Storybook metadata for BackgroundBeams component
 */
const meta = {
  title: "UI/BackgroundBeams",
  component: BackgroundBeams,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "An animated background component featuring moving beams. " +
          "Responsive logic is handled via CSS media queries to prevent hydration mismatch. " +
          "The component uses IntersectionObserver to pause animations when off-screen for better performance.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    className: {
      control: "text",
      description: "Additional CSS classes to apply to the container",
      table: {
        type: { summary: "string" },
      },
    },
    pathCount: {
      control: { type: "number", min: 1, max: 50, step: 1 },
      description:
        "Number of beam paths to render. Higher values increase visual density but impact performance.",
      table: {
        type: { summary: "number" },
        defaultValue: { summary: "16" },
      },
    },
    lowPerformanceMode: {
      control: "boolean",
      description:
        "Enable low performance mode to reduce path count. Useful for lower-end devices.",
      table: {
        type: { summary: "boolean" },
        defaultValue: { summary: "false" },
      },
    },
    forceMobile: {
      control: "boolean",
      description:
        "Force mobile styles regardless of viewport size. Useful for testing or constrained containers.",
      table: {
        type: { summary: "boolean" },
        defaultValue: { summary: "false" },
      },
    },
    useAbsolute: {
      control: "boolean",
      description:
        "Use absolute positioning instead of fixed. Required for constrained containers (e.g., Storybook mobile view).",
      table: {
        type: { summary: "boolean" },
        defaultValue: { summary: "false" },
      },
    },
  },
} satisfies Meta<typeof BackgroundBeams>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default desktop view with responsive behavior
 * The component automatically adapts to viewport size using CSS media queries
 */
export const Desktop: Story = {
  parameters: {
    viewport: {
      defaultViewport: "responsive",
    },
    docs: {
      description: {
        story:
          "Default desktop view showing the component's responsive behavior. " +
          "Resize the window to see the transition between mobile and desktop layouts.",
      },
    },
  },
  render: (args) => (
    <div className="bg-background relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden">
      <BackgroundBeams {...args} />
      <div className="relative z-10 p-8 text-center">
        <h1 className="text-foreground text-4xl font-bold">Desktop View</h1>
        <p className="text-muted-foreground mt-4">
          Resize the window to see the transition.
        </p>
      </div>
    </div>
  ),
};

/**
 * Mobile view with forced mobile styles
 * Uses forceMobile and useAbsolute props to display mobile layout in a constrained container
 */
export const Mobile: Story = {
  parameters: {
    layout: "centered",
    viewport: {
      defaultViewport: "iphone12",
    },
    docs: {
      description: {
        story:
          "Mobile view demonstrating the component with forced mobile styles. " +
          "This story uses forceMobile and useAbsolute props to display the mobile layout " +
          "in a constrained container, useful for testing and Storybook previews.",
      },
    },
  },
  args: {
    forceMobile: true,
    useAbsolute: true,
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: "375px",
          height: "667px",
          position: "relative",
          overflow: "hidden",
          margin: "0 auto",
        }}
      >
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <div className="bg-background relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
      <BackgroundBeams {...args} />
      <div className="relative z-10 p-4 text-center">
        <h1 className="text-foreground text-2xl font-bold">Mobile View</h1>
        <p className="text-muted-foreground mt-4 text-sm">
          Mobile layout using forceMobile prop.
        </p>
      </div>
    </div>
  ),
};

/**
 * Low performance mode example
 * Demonstrates the component with reduced path count for better performance
 */
export const LowPerformance: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Example showing the component in low performance mode. " +
          "This reduces the number of animated paths for better performance on lower-end devices.",
      },
    },
  },
  args: {
    lowPerformanceMode: true,
    pathCount: 8,
  },
  render: (args) => (
    <div className="bg-background relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden">
      <BackgroundBeams {...args} />
      <div className="relative z-10 p-8 text-center">
        <h1 className="text-foreground text-4xl font-bold">
          Low Performance Mode
        </h1>
        <p className="text-muted-foreground mt-4">
          Reduced path count for better performance.
        </p>
      </div>
    </div>
  ),
};
