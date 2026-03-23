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
  sourceType: "manual" | "microsoft_teams";
  status: "pending" | "processing" | "completed" | "failed";
  processingMode: "tagged_meetings_only" | "organizer_only" | null;
  meetingId: string | null;
  transcriptId: string | null;
  meetingTitle: string;
  projectName: string | null;
  meetingStartTime: string | null;
  meetingEndTime: string | null;
  overallSummary: string;
  summaryPreview: string;
  generatedExcelUrl: string | null;
  generatedPdfUrl: string | null;
  emailSent: boolean;
  emailError: string | null;
  createdAt: string;
  updatedAt: string;
  structuredJson: MeetingInsights | null;
};

export type MicrosoftIntegrationStatus = {
  connected: boolean;
  email?: string;
  displayName?: string;
  automationEnabled: boolean;
  processingMode: "tagged_meetings_only" | "organizer_only";
  grantedScopes: string | null;
  subscriptionExpiresAt: string | null;
  lastSyncError: string | null;
};

export type AuthSession = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  microsoftIntegration: null | {
    id: string;
    email: string;
    displayName: string;
    automationEnabled: boolean;
    processingMode: "tagged_meetings_only" | "organizer_only";
    grantedScopes: string | null;
    subscriptionId: string | null;
    subscriptionExpiresAt: string | null;
    lastSyncError: string | null;
  };
};

