/* eslint-disable no-console */
import { db } from "@/server/db";
import { questionType } from "@/server/db/schema";
import { QuestionTypeCode } from "@/lib/types/question-types";
import { eq } from "drizzle-orm";

/**
 * Seed question types with all supported types and config schemas
 */
export async function seedQuestionTypes() {
  console.log("🌱 Seeding question types...");

  const types = [
    {
      id: crypto.randomUUID(),
      code: QuestionTypeCode.SINGLE_CHOICE,
      name: "Single Choice",
      description: "Select one option from a list",
      componentName: "SingleChoiceQuestion",
      configSchema: {
        type: "object",
        properties: {
          options: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                value: { type: "string" },
              },
              required: ["label", "value"],
            },
          },
        },
        required: ["options"],
      },
    },
    {
      id: crypto.randomUUID(),
      code: QuestionTypeCode.MULTI_CHOICE,
      name: "Multiple Choice",
      description: "Select multiple options from a list",
      componentName: "MultiChoiceQuestion",
      configSchema: {
        type: "object",
        properties: {
          options: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                value: { type: "string" },
              },
              required: ["label", "value"],
            },
          },
          minSelections: { type: "number", minimum: 0 },
          maxSelections: { type: "number", minimum: 1 },
        },
        required: ["options"],
      },
    },
    {
      id: crypto.randomUUID(),
      code: QuestionTypeCode.SCALAR,
      name: "Scalar",
      description: "Select a value on a scale (e.g., 0-10)",
      componentName: "ScalarQuestion",
      configSchema: {
        type: "object",
        properties: {
          min: { type: "number" },
          max: { type: "number" },
          step: { type: "number", minimum: 0.1 },
          labels: {
            type: "object",
            properties: {
              min: { type: "string" },
              max: { type: "string" },
            },
          },
        },
        required: ["min", "max"],
      },
    },
    {
      id: crypto.randomUUID(),
      code: QuestionTypeCode.BOOLEAN,
      name: "Boolean",
      description: "Yes/No or True/False question",
      componentName: "BooleanQuestion",
      configSchema: {
        type: "object",
        properties: {
          trueLabel: { type: "string" },
          falseLabel: { type: "string" },
        },
      },
    },
    {
      id: crypto.randomUUID(),
      code: QuestionTypeCode.TEXT,
      name: "Text",
      description: "Free-form text response",
      componentName: "TextQuestion",
      configSchema: {
        type: "object",
        properties: {
          minLength: { type: "number", minimum: 0 },
          maxLength: { type: "number", minimum: 1 },
          placeholder: { type: "string" },
          multiline: { type: "boolean" },
        },
      },
    },
  ];

  for (const type of types) {
    // Check if type already exists
    const existing = await db.query.questionType.findFirst({
      where: eq(questionType.code, type.code),
    });

    if (existing) {
      console.log(
        `  ⏭️  Question type ${type.code} already exists, skipping...`,
      );
      continue;
    }

    await db.insert(questionType).values({
      ...type,
      configSchema: type.configSchema as unknown,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`  ✅ Seeded question type: ${type.name} (${type.code})`);
  }

  console.log("✅ Question types seeding complete!");
}
