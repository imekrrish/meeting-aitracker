export type InsightRow = {
  speaker: string | null;
  workDone: string | null;
  blocker: string | null;
  actionItem: string | null;
  owner: string | null;
  eta: string | null;
  priority: "low" | "medium" | "high" | null;
  status: "not_started" | "in_progress" | "blocked" | "done" | null;
  notes: string | null;
  confidence: number;
};

export type MeetingInsights = {
  meetingTitleSuggestion: string | null;
  overallSummary: string;
  managerSummary: string | null;
  executiveSummary: string | null;
  keyDecisions: string[];
  blockers: string[];
  risks: string[];
  followUpQuestions: string[];
  followUpEmailDraft: string | null;
  dailyStandupFormat: {
    yesterday: string[];
    today: string[];
    blockers: string[];
  };
  ownerWiseActionTracker: Array<{
    owner: string | null;
    items: string[];
  }>;
  blockerRadar: Array<{
    blocker: string;
    severity: "low" | "medium" | "high" | null;
    owner: string | null;
  }>;
  riskAndDependencySection: string[];
  suggestedNextMeetingAgenda: string[];
  highlightReel: string[];
  rows: InsightRow[];
};

export type ProcessResponse = {
  historyId: string;
  meetingTitle: string;
  projectName: string | null;
  source: {
    type: string;
    label: string | null;
  };
  normalizedTranscriptPreview: string;
  downloads: {
    excelUrl: string;
    pdfUrl: string;
  };
  email: {
    sent: boolean;
    message: string;
  };
  insights: MeetingInsights;
};

export type HistoryItem = {
  id: string;
  userName: string;
  userEmail: string;
  meetingTitle: string;
  projectName: string | null;
  overallSummary: string;
  generatedExcelUrl: string;
  generatedPdfUrl: string;
  emailSent: boolean;
  createdAt: string;
};

