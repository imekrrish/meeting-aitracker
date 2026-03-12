import OpenAI from "openai";
import { env } from "../config/env";
import { SYSTEM_PROMPT } from "../constants/prompts";
import { type MeetingInsight, meetingInsightSchema } from "../types/meeting-insight";
import { HttpError } from "../utils/http-error";

export class OpenAIService {
  private readonly client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  private getInsightJsonSchema(customColumns?: string[]) {
    // Basic fields mapping for rows if custom columns aren't array
    const hasCustomColumns = Array.isArray(customColumns) && customColumns.length > 0;

    let rowProperties: Record<string, any> = {};
    let rowRequired: string[] = [];

    if (hasCustomColumns) {
      customColumns!.forEach(col => {
        rowProperties[col] = { type: ["string", "null"] };
        rowRequired.push(col);
      });
    } else {
      rowProperties = {
        "Speaker": { type: ["string", "null"] },
        "Task": { type: ["string", "null"] },
        "Work Done Today": { type: ["string", "null"] },
        "Task Progress": { type: ["string", "null"] },
        "Deadline": { type: ["string", "null"] },
        "Further Discussion": { type: ["string", "null"] }
      };
      rowRequired = Object.keys(rowProperties);
    }

    return {
      type: "object",
      additionalProperties: false,
      required: [
        "meetingTitleSuggestion",
        "overallSummary",
        "managerSummary",
        "executiveSummary",
        "keyDecisions",
        "blockers",
        "risks",
        "followUpQuestions",
        "followUpEmailDraft",
        "dailyStandupFormat",
        "ownerWiseActionTracker",
        "blockerRadar",
        "riskAndDependencySection",
        "suggestedNextMeetingAgenda",
        "highlightReel",
        "rows"
      ],
      properties: {
        meetingTitleSuggestion: { type: ["string", "null"] },
        overallSummary: { type: "string" },
        managerSummary: { type: ["string", "null"] },
        executiveSummary: { type: ["string", "null"] },
        keyDecisions: { type: "array", items: { type: "string" } },
        blockers: { type: "array", items: { type: "string" } },
        risks: { type: "array", items: { type: "string" } },
        followUpQuestions: { type: "array", items: { type: "string" } },
        followUpEmailDraft: { type: ["string", "null"] },
        dailyStandupFormat: {
          type: "object",
          additionalProperties: false,
          required: ["yesterday", "today", "blockers"],
          properties: {
            yesterday: { type: "array", items: { type: "string" } },
            today: { type: "array", items: { type: "string" } },
            blockers: { type: "array", items: { type: "string" } }
          }
        },
        ownerWiseActionTracker: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["owner", "items"],
            properties: {
              owner: { type: ["string", "null"] },
              items: { type: "array", items: { type: "string" } }
            }
          }
        },
        blockerRadar: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["blocker", "severity", "owner"],
            properties: {
              blocker: { type: "string" },
              severity: { type: ["string", "null"], enum: ["low", "medium", "high", null] },
              owner: { type: ["string", "null"] }
            }
          }
        },
        riskAndDependencySection: { type: "array", items: { type: "string" } },
        suggestedNextMeetingAgenda: { type: "array", items: { type: "string" } },
        highlightReel: {
          type: "array",
          maxItems: 5,
          items: { type: "string" }
        },
        rows: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: rowRequired,
            properties: rowProperties
          }
        }
      }
    };
  }

  public async extractMeetingInsights(params: {
    meetingTitle: string;
    projectName: string | null;
    transcriptText: string;
    customColumns?: string[];
  }): Promise<MeetingInsight> {
    const dynamicSchema = this.getInsightJsonSchema(params.customColumns);
    const customPromptInstructions = Array.isArray(params.customColumns) && params.customColumns.length > 0
      ? `\nIMPORTANT: The user explicitly requested custom Excel columns for the row extractions: [${params.customColumns.join(", ")}]. You MUST extract the conversational data into these exact columns under the 'rows' property. CRITICAL: You MUST consolidate the rows so there is ONLY ONE row per person (Speaker). Group all of a speaker's tasks, progress, and discussion points into their single row. DO NOT create multiple rows for the same person.`
      : "\nCRITICAL: For the 'rows' extraction, you MUST consolidate the rows so there is ONLY ONE row per person (Speaker). Group all of a speaker's tasks, progress, and discussion points into their single row. DO NOT create multiple rows for the same person.";

    const response = await this.client.responses.create({
      model: env.OPENAI_MODEL,
      input: [
        {
          role: "system",
          content: SYSTEM_PROMPT + customPromptInstructions
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `Meeting title: ${params.meetingTitle}`,
                `Project/module: ${params.projectName ?? "Unknown"}`,
                "",
                "Transcript:",
                params.transcriptText
              ].join("\n")
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "meeting_tracker_output",
          strict: true,
          schema: dynamicSchema
        }
      }
    });

    const rawText = response.output_text?.trim();
    if (!rawText) {
      throw new HttpError(502, "OpenAI returned an empty response.");
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      throw new HttpError(502, "OpenAI returned malformed JSON.");
    }

    const validated = meetingInsightSchema.safeParse(parsedJson);
    if (!validated.success) {
      throw new HttpError(502, "OpenAI returned JSON that failed validation.");
    }

    return validated.data;
  }
}

