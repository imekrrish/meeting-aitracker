import OpenAI from "openai";
import { env } from "../config/env";
import { SYSTEM_PROMPT } from "../constants/prompts";
import { type MeetingInsight, meetingInsightSchema } from "../types/meeting-insight";
import { HttpError } from "../utils/http-error";

const insightJsonSchema = {
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
        required: [
          "speaker",
          "workDone",
          "blocker",
          "actionItem",
          "owner",
          "eta",
          "priority",
          "status",
          "notes",
          "confidence"
        ],
        properties: {
          speaker: { type: ["string", "null"] },
          workDone: { type: ["string", "null"] },
          blocker: { type: ["string", "null"] },
          actionItem: { type: ["string", "null"] },
          owner: { type: ["string", "null"] },
          eta: { type: ["string", "null"] },
          priority: { type: ["string", "null"], enum: ["low", "medium", "high", null] },
          status: {
            type: ["string", "null"],
            enum: ["not_started", "in_progress", "blocked", "done", null]
          },
          notes: { type: ["string", "null"] },
          confidence: { type: "number", minimum: 0, maximum: 1 }
        }
      }
    }
  }
} as const;

export class OpenAIService {
  private readonly client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  public async extractMeetingInsights(params: {
    meetingTitle: string;
    projectName: string | null;
    transcriptText: string;
  }): Promise<MeetingInsight> {
    const response = await this.client.responses.create({
      model: env.OPENAI_MODEL,
      input: [
        {
          role: "system",
          content: SYSTEM_PROMPT
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
          schema: insightJsonSchema
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

