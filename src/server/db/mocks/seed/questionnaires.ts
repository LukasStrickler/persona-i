/* eslint-disable no-console */
import { db } from "@/server/db";
import {
  questionnaire,
  questionnaireVersion,
  questionBankItem,
  questionOption,
  questionnaireItem,
  questionType,
} from "@/server/db/schema";
import { QuestionTypeCode } from "@/lib/types/question-types";
import { eq } from "drizzle-orm";

/**
 * Helper function to seed questions for a questionnaire with categories
 */
async function seedQuestionnaireWithCategories(
  questionnaireId: string,
  versionId: string,
  categories: Array<{
    name: string;
    questions: Array<{
      code: string;
      prompt: string;
      type: string;
      config: unknown;
      options?: Array<{ label: string; value: string }>;
    }>;
  }>,
) {
  let globalPosition = 1;

  for (const category of categories) {
    for (const q of category.questions) {
      const questionId = crypto.randomUUID();
      await db.insert(questionBankItem).values({
        id: questionId,
        code: q.code,
        prompt: q.prompt,
        questionTypeCode: q.type,
        configJson: q.config,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Add options for single choice questions
      // Options are stored in config.options, not q.options
      if (q.type === "single_choice") {
        const config = q.config as {
          options?: Array<{ label: string; value: string }>;
        };
        const options = config?.options;
        if (options && Array.isArray(options)) {
          for (let i = 0; i < options.length; i++) {
            const option = options[i];
            if (option) {
              await db.insert(questionOption).values({
                id: crypto.randomUUID(),
                questionId,
                label: option.label,
                value: option.value,
                position: i,
                createdAt: new Date(),
              });
            }
          }
        }
      }

      // Insert questionnaire item with section
      await db.insert(questionnaireItem).values({
        id: crypto.randomUUID(),
        questionnaireVersionId: versionId,
        questionId,
        position: globalPosition,
        section: category.name,
        isRequired: true,
        createdAt: new Date(),
      });

      globalPosition++;
    }
  }
}

/**
 * Seed 3 questionnaires (DISC, Big Five, Enneagram) with 15 questions each (3 categories × 5 questions)
 */
export async function seedQuestionnaires() {
  console.log("🌱 Seeding questionnaires...");

  // Get question types
  const singleChoiceType = await db.query.questionType.findFirst({
    where: eq(questionType.code, QuestionTypeCode.SINGLE_CHOICE),
  });
  const scalarType = await db.query.questionType.findFirst({
    where: eq(questionType.code, QuestionTypeCode.SCALAR),
  });
  const booleanType = await db.query.questionType.findFirst({
    where: eq(questionType.code, QuestionTypeCode.BOOLEAN),
  });
  const textType = await db.query.questionType.findFirst({
    where: eq(questionType.code, QuestionTypeCode.TEXT),
  });

  if (!singleChoiceType || !scalarType || !booleanType || !textType) {
    throw new Error("Question types must be seeded first");
  }

  // DISC Questionnaire
  const discId = crypto.randomUUID();
  const discVersionId = crypto.randomUUID();

  const discExists = await db.query.questionnaire.findFirst({
    where: eq(questionnaire.slug, "disc"),
  });

  if (!discExists) {
    await db.insert(questionnaire).values({
      id: discId,
      slug: "disc",
      title: "DISC Personality Assessment",
      description:
        "Discover your DISC profile: Dominance, Influence, Steadiness, and Conscientiousness",
      isPublic: true,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(questionnaireVersion).values({
      id: discVersionId,
      questionnaireId: discId,
      version: 1,
      isActive: true,
      metadataJson: {
        questionCount: 15,
        sections: [
          { name: "Behavioral Patterns", questionCount: 5 },
          { name: "Communication Style", questionCount: 5 },
          { name: "Work Preferences", questionCount: 5 },
        ],
      },
      publishedAt: new Date(),
      createdAt: new Date(),
    });

    await seedQuestionnaireWithCategories(discId, discVersionId, [
      {
        name: "Behavioral Patterns",
        questions: [
          {
            code: "disc_bp_1",
            prompt: "I tend to take charge in group situations.",
            type: scalarType.code,
            config: {
              min: 1,
              max: 7,
              step: 1,
              labels: { min: "Never", max: "Always" },
            },
          },
          {
            code: "disc_bp_2",
            prompt: "I prefer working in a team rather than alone.",
            type: booleanType.code,
            config: { trueLabel: "Yes", falseLabel: "No" },
          },
          {
            code: "disc_bp_3",
            prompt: "How do you typically respond to challenges?",
            type: singleChoiceType.code,
            config: {
              options: [
                { label: "Face them head-on immediately", value: "direct" },
                { label: "Discuss with others first", value: "collaborative" },
                { label: "Take time to analyze", value: "analytical" },
                {
                  label: "Avoid confrontation when possible",
                  value: "avoidant",
                },
              ],
            },
          },
          {
            code: "disc_bp_4",
            prompt: "I am comfortable making quick decisions.",
            type: scalarType.code,
            config: {
              min: 1,
              max: 5,
              step: 1,
              labels: { min: "Strongly Disagree", max: "Strongly Agree" },
            },
          },
          {
            code: "disc_bp_5",
            prompt: "Describe your typical approach to problem-solving.",
            type: textType.code,
            config: {
              placeholder: "Enter your response...",
              rows: 3,
              maxLength: 500,
            },
          },
        ],
      },
      {
        name: "Communication Style",
        questions: [
          {
            code: "disc_cs_1",
            prompt: "Which best describes your communication style?",
            type: singleChoiceType.code,
            config: {
              options: [
                { label: "Direct and to the point", value: "direct" },
                { label: "Enthusiastic and animated", value: "enthusiastic" },
                { label: "Calm and steady", value: "calm" },
                { label: "Precise and detailed", value: "precise" },
              ],
            },
          },
          {
            code: "disc_cs_2",
            prompt: "I enjoy public speaking and presentations.",
            type: booleanType.code,
            config: { trueLabel: "Yes", falseLabel: "No" },
          },
          {
            code: "disc_cs_3",
            prompt: "How comfortable are you with expressing your opinions?",
            type: scalarType.code,
            config: {
              min: 1,
              max: 10,
              step: 1,
              labels: { min: "Very Uncomfortable", max: "Very Comfortable" },
            },
          },
          {
            code: "disc_cs_4",
            prompt: "I prefer written communication over verbal.",
            type: booleanType.code,
            config: { trueLabel: "Yes", falseLabel: "No" },
          },
          {
            code: "disc_cs_5",
            prompt: "What is your preferred method of giving feedback?",
            type: singleChoiceType.code,
            config: {
              options: [
                { label: "Face-to-face conversation", value: "face_to_face" },
                { label: "Written email or message", value: "written" },
                { label: "Formal meeting", value: "formal" },
                { label: "Casual discussion", value: "casual" },
              ],
            },
          },
        ],
      },
      {
        name: "Work Preferences",
        questions: [
          {
            code: "disc_wp_1",
            prompt: "I thrive in fast-paced, high-pressure environments.",
            type: scalarType.code,
            config: {
              min: 1,
              max: 5,
              step: 1,
              labels: { min: "Strongly Disagree", max: "Strongly Agree" },
            },
          },
          {
            code: "disc_wp_2",
            prompt: "I prefer structured, predictable work schedules.",
            type: booleanType.code,
            config: { trueLabel: "Yes", falseLabel: "No" },
          },
          {
            code: "disc_wp_3",
            prompt: "What type of work environment do you prefer?",
            type: singleChoiceType.code,
            config: {
              options: [
                {
                  label: "Competitive and results-driven",
                  value: "competitive",
                },
                {
                  label: "Collaborative and team-oriented",
                  value: "collaborative",
                },
                { label: "Stable and consistent", value: "stable" },
                {
                  label: "Detail-oriented and quality-focused",
                  value: "quality",
                },
              ],
            },
          },
          {
            code: "disc_wp_4",
            prompt: "I am motivated by recognition and achievement.",
            type: scalarType.code,
            config: {
              min: 1,
              max: 7,
              step: 1,
              labels: { min: "Not at all", max: "Extremely" },
            },
          },
          {
            code: "disc_wp_5",
            prompt: "Describe your ideal workday.",
            type: textType.code,
            config: {
              placeholder: "Describe your ideal workday...",
              rows: 4,
              maxLength: 500,
            },
          },
        ],
      },
    ]);

    console.log("  ✅ Seeded DISC questionnaire (15 questions, 3 categories)");
  }

  // Big Five Questionnaire
  const bigFiveId = crypto.randomUUID();
  const bigFiveVersionId = crypto.randomUUID();

  const bigFiveExists = await db.query.questionnaire.findFirst({
    where: eq(questionnaire.slug, "big-five"),
  });

  if (!bigFiveExists) {
    await db.insert(questionnaire).values({
      id: bigFiveId,
      slug: "big-five",
      title: "Big Five Personality Test",
      description:
        "Measure your OCEAN traits: Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism",
      isPublic: true,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(questionnaireVersion).values({
      id: bigFiveVersionId,
      questionnaireId: bigFiveId,
      version: 1,
      isActive: true,
      metadataJson: {
        questionCount: 15,
        sections: [
          { name: "Openness & Creativity", questionCount: 5 },
          { name: "Conscientiousness & Organization", questionCount: 5 },
          { name: "Extraversion & Social", questionCount: 5 },
        ],
      },
      publishedAt: new Date(),
      createdAt: new Date(),
    });

    await seedQuestionnaireWithCategories(bigFiveId, bigFiveVersionId, [
      {
        name: "Openness & Creativity",
        questions: [
          {
            code: "big5_oc_1",
            prompt: "I enjoy exploring new ideas and concepts.",
            type: scalarType.code,
            config: {
              min: 1,
              max: 5,
              step: 1,
              labels: { min: "Strongly Disagree", max: "Strongly Agree" },
            },
          },
          {
            code: "big5_oc_2",
            prompt: "I have a vivid imagination.",
            type: booleanType.code,
            config: { trueLabel: "Yes", falseLabel: "No" },
          },
          {
            code: "big5_oc_3",
            prompt: "Which best describes your approach to new experiences?",
            type: singleChoiceType.code,
            config: {
              options: [
                { label: "Eagerly embrace them", value: "embrace" },
                { label: "Cautiously consider them", value: "cautious" },
                { label: "Prefer familiar routines", value: "routine" },
                { label: "Avoid them when possible", value: "avoid" },
              ],
            },
          },
          {
            code: "big5_oc_4",
            prompt: "I appreciate art, music, and creative expression.",
            type: scalarType.code,
            config: {
              min: 1,
              max: 7,
              step: 1,
              labels: { min: "Not at all", max: "Very much" },
            },
          },
          {
            code: "big5_oc_5",
            prompt:
              "Describe a creative project or idea you've worked on recently.",
            type: textType.code,
            config: {
              placeholder: "Share your creative experience...",
              rows: 3,
              maxLength: 500,
            },
          },
        ],
      },
      {
        name: "Conscientiousness & Organization",
        questions: [
          {
            code: "big5_co_1",
            prompt: "I am organized and pay attention to details.",
            type: booleanType.code,
            config: { trueLabel: "Yes", falseLabel: "No" },
          },
          {
            code: "big5_co_2",
            prompt: "I complete tasks carefully and thoroughly.",
            type: scalarType.code,
            config: {
              min: 1,
              max: 5,
              step: 1,
              labels: { min: "Rarely", max: "Always" },
            },
          },
          {
            code: "big5_co_3",
            prompt: "How do you typically manage your time and tasks?",
            type: singleChoiceType.code,
            config: {
              options: [
                { label: "Detailed planning and schedules", value: "detailed" },
                { label: "General to-do lists", value: "general" },
                { label: "Flexible, adapt as needed", value: "flexible" },
                { label: "Handle things as they come", value: "spontaneous" },
              ],
            },
          },
          {
            code: "big5_co_4",
            prompt: "I am reliable and follow through on commitments.",
            type: scalarType.code,
            config: {
              min: 1,
              max: 7,
              step: 1,
              labels: { min: "Strongly Disagree", max: "Strongly Agree" },
            },
          },
          {
            code: "big5_co_5",
            prompt: "Describe your approach to planning and organization.",
            type: textType.code,
            config: {
              placeholder: "Explain your organizational style...",
              rows: 3,
              maxLength: 500,
            },
          },
        ],
      },
      {
        name: "Extraversion & Social",
        questions: [
          {
            code: "big5_es_1",
            prompt: "I am outgoing and sociable.",
            type: scalarType.code,
            config: {
              min: 1,
              max: 5,
              step: 1,
              labels: { min: "Strongly Disagree", max: "Strongly Agree" },
            },
          },
          {
            code: "big5_es_2",
            prompt: "I enjoy being the center of attention.",
            type: booleanType.code,
            config: { trueLabel: "Yes", falseLabel: "No" },
          },
          {
            code: "big5_es_3",
            prompt: "What is your preferred social setting?",
            type: singleChoiceType.code,
            config: {
              options: [
                { label: "Large parties and events", value: "large" },
                { label: "Small group gatherings", value: "small" },
                { label: "One-on-one conversations", value: "one_on_one" },
                { label: "Prefer solitude", value: "solitude" },
              ],
            },
          },
          {
            code: "big5_es_4",
            prompt: "I feel energized after social interactions.",
            type: scalarType.code,
            config: {
              min: 1,
              max: 7,
              step: 1,
              labels: { min: "Never", max: "Always" },
            },
          },
          {
            code: "big5_es_5",
            prompt: "Describe your ideal social activity.",
            type: textType.code,
            config: {
              placeholder: "What social activities do you enjoy?...",
              rows: 3,
              maxLength: 500,
            },
          },
        ],
      },
    ]);

    console.log(
      "  ✅ Seeded Big Five questionnaire (15 questions, 3 categories)",
    );
  }

  // Enneagram Questionnaire
  const enneagramId = crypto.randomUUID();
  const enneagramVersionId = crypto.randomUUID();

  const enneagramExists = await db.query.questionnaire.findFirst({
    where: eq(questionnaire.slug, "enneagram"),
  });

  if (!enneagramExists) {
    await db.insert(questionnaire).values({
      id: enneagramId,
      slug: "enneagram",
      title: "Enneagram Personality Test",
      description:
        "Discover your Enneagram type and understand your core motivations",
      isPublic: true,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(questionnaireVersion).values({
      id: enneagramVersionId,
      questionnaireId: enneagramId,
      version: 1,
      isActive: true,
      metadataJson: {
        questionCount: 15,
        sections: [
          { name: "Core Motivations", questionCount: 5 },
          { name: "Emotional Patterns", questionCount: 5 },
          { name: "Behavioral Tendencies", questionCount: 5 },
        ],
      },
      publishedAt: new Date(),
      createdAt: new Date(),
    });

    await seedQuestionnaireWithCategories(enneagramId, enneagramVersionId, [
      {
        name: "Core Motivations",
        questions: [
          {
            code: "enneagram_cm_1",
            prompt: "What drives you most in life?",
            type: textType.code,
            config: {
              placeholder: "Describe what motivates you...",
              rows: 4,
              maxLength: 500,
            },
          },
          {
            code: "enneagram_cm_2",
            prompt: "I am motivated by achieving perfection.",
            type: scalarType.code,
            config: {
              min: 1,
              max: 10,
              step: 1,
              labels: { min: "Not at all", max: "Completely" },
            },
          },
          {
            code: "enneagram_cm_3",
            prompt: "What is your primary life goal?",
            type: singleChoiceType.code,
            config: {
              options: [
                { label: "To be perfect and correct", value: "perfection" },
                { label: "To be loved and appreciated", value: "love" },
                { label: "To be successful and valuable", value: "success" },
                { label: "To be unique and authentic", value: "authenticity" },
                {
                  label: "To be knowledgeable and capable",
                  value: "knowledge",
                },
              ],
            },
          },
          {
            code: "enneagram_cm_4",
            prompt: "I strive to help others and make a positive impact.",
            type: booleanType.code,
            config: { trueLabel: "Yes", falseLabel: "No" },
          },
          {
            code: "enneagram_cm_5",
            prompt: "How important is it for you to be understood?",
            type: scalarType.code,
            config: {
              min: 1,
              max: 7,
              step: 1,
              labels: { min: "Not important", max: "Very important" },
            },
          },
        ],
      },
      {
        name: "Emotional Patterns",
        questions: [
          {
            code: "enneagram_ep_1",
            prompt: "I often feel anxious or worried.",
            type: scalarType.code,
            config: {
              min: 1,
              max: 5,
              step: 1,
              labels: { min: "Rarely", max: "Frequently" },
            },
          },
          {
            code: "enneagram_ep_2",
            prompt: "How do you typically handle stress?",
            type: singleChoiceType.code,
            config: {
              options: [
                {
                  label: "Become more focused and organized",
                  value: "focused",
                },
                { label: "Seek support from others", value: "support" },
                { label: "Withdraw and process alone", value: "withdraw" },
                { label: "Express emotions openly", value: "express" },
              ],
            },
          },
          {
            code: "enneagram_ep_3",
            prompt: "I remain calm in tense situations.",
            type: booleanType.code,
            config: { trueLabel: "Yes", falseLabel: "No" },
          },
          {
            code: "enneagram_ep_4",
            prompt: "How do you typically express your emotions?",
            type: textType.code,
            config: {
              placeholder: "Describe your emotional expression...",
              rows: 3,
              maxLength: 500,
            },
          },
          {
            code: "enneagram_ep_5",
            prompt: "I am comfortable with my emotional state.",
            type: scalarType.code,
            config: {
              min: 1,
              max: 7,
              step: 1,
              labels: { min: "Strongly Disagree", max: "Strongly Agree" },
            },
          },
        ],
      },
      {
        name: "Behavioral Tendencies",
        questions: [
          {
            code: "enneagram_bt_1",
            prompt: "I am individualistic and expressive.",
            type: scalarType.code,
            config: {
              min: 1,
              max: 5,
              step: 1,
              labels: { min: "Strongly Disagree", max: "Strongly Agree" },
            },
          },
          {
            code: "enneagram_bt_2",
            prompt: "How do you typically approach conflicts?",
            type: singleChoiceType.code,
            config: {
              options: [
                { label: "Address them directly", value: "direct" },
                { label: "Avoid confrontation", value: "avoid" },
                { label: "Seek compromise", value: "compromise" },
                { label: "Withdraw and process", value: "withdraw" },
              ],
            },
          },
          {
            code: "enneagram_bt_3",
            prompt: "I am analytical and enjoy gaining knowledge.",
            type: booleanType.code,
            config: { trueLabel: "Yes", falseLabel: "No" },
          },
          {
            code: "enneagram_bt_4",
            prompt: "I adapt my behavior based on the situation.",
            type: scalarType.code,
            config: {
              min: 1,
              max: 7,
              step: 1,
              labels: { min: "Never", max: "Always" },
            },
          },
          {
            code: "enneagram_bt_5",
            prompt:
              "Describe a situation where you had to adapt your behavior.",
            type: textType.code,
            config: {
              placeholder: "Share an example...",
              rows: 3,
              maxLength: 500,
            },
          },
        ],
      },
    ]);

    console.log(
      "  ✅ Seeded Enneagram questionnaire (15 questions, 3 categories)",
    );
  }

  console.log("✅ Questionnaires seeding complete!");
}
