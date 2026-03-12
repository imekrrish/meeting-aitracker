import { z } from "zod";

export const rowInsightSchema = z.object({
  speaker: z.string().nullable(),
  workDone: z.string().nullable(),
  blocker: z.string().nullable(),
  actionItem: z.string().nullable(),
  owner: z.string().nullable(),
  eta: z.string().nullable(),
  priority: z.enum(["low", "medium", "high"]).nullable(),
  status: z.enum(["not_started", "in_progress", "blocked", "done"]).nullable(),
  notes: z.string().nullable(),
  confidence: z.number().min(0).max(1)
});

export const ownerActionSchema = z.object({
  owner: z.string().nullable(),
  items: z.array(z.string())
});

export const blockerRadarSchema = z.object({
  blocker: z.string(),
  severity: z.enum(["low", "medium", "high"]).nullable(),
  owner: z.string().nullable()
});

export const dailyStandupSchema = z.object({
  yesterday: z.array(z.string()),
  today: z.array(z.string()),
  blockers: z.array(z.string())
});

export const meetingInsightSchema = z.object({
  meetingTitleSuggestion: z.string().nullable(),
  overallSummary: z.string(),
  managerSummary: z.string().nullable(),
  executiveSummary: z.string().nullable(),
  keyDecisions: z.array(z.string()),
  blockers: z.array(z.string()),
  risks: z.array(z.string()),
  followUpQuestions: z.array(z.string()),
  followUpEmailDraft: z.string().nullable(),
  dailyStandupFormat: dailyStandupSchema,
  ownerWiseActionTracker: z.array(ownerActionSchema),
  blockerRadar: z.array(blockerRadarSchema),
  riskAndDependencySection: z.array(z.string()),
  suggestedNextMeetingAgenda: z.array(z.string()),
  highlightReel: z.array(z.string()).max(5),
  rows: z.array(rowInsightSchema)
});

export type MeetingInsight = z.infer<typeof meetingInsightSchema>;
export type InsightRow = z.infer<typeof rowInsightSchema>;

