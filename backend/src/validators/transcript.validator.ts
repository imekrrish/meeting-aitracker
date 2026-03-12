import { z } from "zod";

export const processTranscriptSchema = z
  .object({
    fullName: z.string().trim().max(120).optional().or(z.literal("")),
    email: z.string().trim().email().max(200),
    meetingTitle: z.string().trim().max(200).optional().or(z.literal("")),
    projectName: z.string().trim().max(200).optional().or(z.literal("")),
    transcriptText: z.string().trim().optional().or(z.literal("")),
    customColumns: z.array(z.string().trim().min(1)).optional()
  })
  .superRefine((value, ctx) => {
    if (!value.transcriptText || value.transcriptText.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Transcript text or file upload is required.",
        path: ["transcriptText"]
      });
    }
  });

export const emailTranscriptSchema = z.object({
  historyId: z.string().trim().min(1),
  email: z.string().trim().email().optional()
});

export type ProcessTranscriptInput = z.infer<typeof processTranscriptSchema>;
export type EmailTranscriptInput = z.infer<typeof emailTranscriptSchema>;

