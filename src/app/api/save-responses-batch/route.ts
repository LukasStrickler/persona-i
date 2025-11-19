import { type NextRequest, NextResponse } from "next/server";
import { getServerTRPC } from "@/server/api/caller";
import { z, ZodError } from "zod";

/**
 * Dedicated API route for beforeunload handler
 * Accepts simple JSON body (works with sendBeacon) and calls tRPC internally
 */
const saveResponsesBatchSchema = z.object({
  sessionId: z.string(),
  responses: z.array(
    z.object({
      questionId: z.string(),
      value: z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.string()),
      ]),
      selectedOptionId: z.string().optional(),
      selectedOptionIds: z.array(z.string()).optional(),
    }),
  ),
});

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const validatedInput = saveResponsesBatchSchema.parse(body);

    const trpc = await getServerTRPC();
    const result = await trpc.questionnaires.saveResponsesBatch(validatedInput);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Failed to save responses" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in save-responses-batch route:", error);

    // Distinguish validation errors (400) from server errors (500)
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
