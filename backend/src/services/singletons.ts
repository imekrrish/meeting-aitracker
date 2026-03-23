import { MicrosoftAuthService } from "./microsoftAuth.service";
import { TranscriptFetchService } from "./transcriptFetch.service";
import { TranscriptSubscriptionService } from "./transcriptSubscription.service";

export const microsoftAuthService = new MicrosoftAuthService();
export const transcriptFetchService = new TranscriptFetchService();
export const transcriptSubscriptionService = new TranscriptSubscriptionService();
