import { type NextRequest, NextResponse } from "next/server";
import { getServerTRPC } from "@/server/api/caller";
import { z, ZodError } from "zod";

/**
 * Dedicated API route for beforeunload handler
 *
 * WHY THIS IS A NEXT.JS ROUTE (NOT tRPC):
 * ========================================
 *
 * This endpoint exists as a Next.js route instead of a tRPC procedure because
 * it's designed to work with `navigator.sendBeacon()`, which is used in the
 * `beforeunload` event handler to save responses when the user closes/navigates
 * away from the page.
 *
 * Technical constraints:
 * - `sendBeacon()` only supports simple HTTP POST requests with plain JSON
 * - It cannot send custom headers (tRPC requires specific headers)
 * - It cannot use tRPC's JSON-RPC format
 * - It works asynchronously in the background even after page unload
 *
 * Architecture:
 * - This route accepts simple JSON: { sessionId, responses: [...] }
 * - It validates the input using Zod (same schema as tRPC)
 * - It calls the tRPC `saveResponsesBatch` mutation internally via `getServerTRPC()`
 * - This provides the best of both worlds: simple HTTP for sendBeacon, tRPC logic reuse
 *
 * Usage:
 * - Called from TestTakingClient's beforeunload handler
 * - Uses sendBeacon for best-effort save (may not work in all browsers)
 * - Falls back to fetch with keepalive if sendBeacon fails
 * - This is a "best effort" save - primary guarantee is the Complete button click
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
    // Parse request body with specific error handling for JSON parsing
    let body: unknown;
    try {
      body = (await request.json()) as unknown;
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json(
          { success: false, error: "Invalid JSON in request body" },
          { status: 400 },
        );
      }
      throw error;
    }

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
