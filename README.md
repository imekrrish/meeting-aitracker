# Meeting Tracker AI

Meeting Tracker AI now supports two transcript sources in the same app:

- manual transcript upload
- Microsoft Teams transcript automation through Microsoft Graph

The existing AI -> Excel -> PDF -> email pipeline is still reused. Microsoft automation is added as another source that feeds the same backend workflow.

## What Changed

- Microsoft OAuth login now signs the user into the app and stores a Microsoft integration record in MongoDB.
- Teams transcript automation is handled through Microsoft Graph change notifications.
- Generated Excel and PDF files can be uploaded to Cloudinary and saved in meeting history.
- The dashboard now shows:
  - Microsoft integration status
  - automation settings
  - recent processed meetings
  - download links
  - the existing manual upload flow

## Backend Architecture

Existing services reused:

- [openai.service.ts](/c:/Users/ChaitanyaLanka/Downloads/meeting-aitracker/backend/src/services/openai.service.ts)
- [excel.service.ts](/c:/Users/ChaitanyaLanka/Downloads/meeting-aitracker/backend/src/services/excel.service.ts)
- [pdf.service.ts](/c:/Users/ChaitanyaLanka/Downloads/meeting-aitracker/backend/src/services/pdf.service.ts)
- [email.service.ts](/c:/Users/ChaitanyaLanka/Downloads/meeting-aitracker/backend/src/services/email.service.ts)

New orchestration/services:

- [meeting-processing.service.ts](/c:/Users/ChaitanyaLanka/Downloads/meeting-aitracker/backend/src/services/meeting-processing.service.ts)
- [microsoftAuth.service.ts](/c:/Users/ChaitanyaLanka/Downloads/meeting-aitracker/backend/src/services/microsoftAuth.service.ts)
- [microsoftGraph.service.ts](/c:/Users/ChaitanyaLanka/Downloads/meeting-aitracker/backend/src/services/microsoftGraph.service.ts)
- [transcriptSubscription.service.ts](/c:/Users/ChaitanyaLanka/Downloads/meeting-aitracker/backend/src/services/transcriptSubscription.service.ts)
- [transcriptFetch.service.ts](/c:/Users/ChaitanyaLanka/Downloads/meeting-aitracker/backend/src/services/transcriptFetch.service.ts)
- [cloudinary.service.ts](/c:/Users/ChaitanyaLanka/Downloads/meeting-aitracker/backend/src/services/cloudinary.service.ts)

Transcript source adapters:

- [manual-upload.adapter.ts](/c:/Users/ChaitanyaLanka/Downloads/meeting-aitracker/backend/src/services/adapters/manual-upload.adapter.ts)
- [microsoft-teams.adapter.ts](/c:/Users/ChaitanyaLanka/Downloads/meeting-aitracker/backend/src/services/adapters/microsoft-teams.adapter.ts)

## Key Endpoints

Auth:

- `GET /auth/microsoft/login`
- `GET /auth/callback`
- `GET /api/auth/session`
- `POST /api/auth/logout`

Microsoft integration:

- `GET /api/integrations/microsoft/status`
- `PATCH /api/integrations/microsoft/settings`

Meetings:

- `GET /api/meetings/history`
- `GET /api/meetings/:id`
- `GET /api/meetings/:id/download/excel`
- `GET /api/meetings/:id/download/pdf`

Webhook:

- `POST /webhooks/microsoft/transcripts`

## Prisma Models

The Prisma schema now includes:

- `User`
- `MicrosoftIntegration`
- `ProcessingHistory`
- `OtpToken`

`ProcessingHistory` stores both manual and Microsoft Teams runs, including source type, meeting ids, transcript ids, Cloudinary URLs, processing status, and email status/error metadata.

## Required Environment Variables

Backend:

```env
PORT=3000
FRONTEND_URL=http://localhost:5173
CLIENT_ORIGIN=http://localhost:5173
REDIRECT_URI=http://localhost:3000/auth/callback

CLIENT_ID=your-azure-app-client-id
CLIENT_SECRET=your-azure-app-client-secret-value
TENANT_ID=common
MICROSOFT_LOGIN_SCOPES=User.Read offline_access OnlineMeetings.Read OnlineMeetingTranscript.Read.All
MICROSOFT_WEBHOOK_URL=https://your-public-domain.example.com/webhooks/microsoft/transcripts
MICROSOFT_SUBSCRIPTION_SECRET=replace-with-a-random-shared-secret

JWT_SECRET=replace-with-a-long-random-secret
DATABASE_URL=your-mongodb-connection-string
OPENAI_API_KEY=your-openai-api-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-app-password
MAIL_FROM=Meeting Tracker AI <no-reply@example.com>

CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

Frontend:

```env
VITE_API_URL=http://localhost:3000
```

## Microsoft Graph Requirements

Azure app registration should include:

- Web redirect URI: `http://localhost:3000/auth/callback`
- Delegated scopes:
  - `User.Read`
  - `offline_access`
  - `OnlineMeetings.Read`
  - `OnlineMeetingTranscript.Read.All`

Important:

- Teams transcript subscriptions are intended for work or school Microsoft accounts.
- Personal Microsoft accounts do not reliably support the transcript subscription flow.
- The webhook URL must be publicly reachable by Microsoft Graph. Use a tunnel such as `ngrok` during local development.

## Local Run

1. Install packages:

```bash
npm install
```

2. Create env files:

```bash
copy backend\\.env.example backend\\.env
copy frontend\\.env.example frontend\\.env
```

3. Push Prisma schema to MongoDB:

```bash
npm run db:push
```

4. Start both apps:

```bash
npm run dev
```

5. Open:

- frontend: `http://localhost:5173`
- backend: `http://localhost:3000`

## Manual Flow

1. Sign in with Microsoft.
2. Dashboard loads.
3. Use the Manual Upload section.
4. Existing pipeline generates AI summary, Excel, PDF, Cloudinary URLs, DB history, and email.

## Microsoft Automation Flow

1. Click `Connect Microsoft`.
2. Finish consent.
3. Backend creates or updates the user and Microsoft integration record.
4. Backend registers or renews a transcript subscription for that user.
5. When Microsoft sends a transcript-ready notification:
   - webhook receives event
   - backend fetches meeting metadata
   - backend enforces safe rules
   - transcript is fetched
   - shared meeting-processing workflow runs
   - Excel/PDF are uploaded to Cloudinary
   - DB history is saved
   - email is sent

## Safe Processing Rules

Default processing mode is `tagged_meetings_only`.

Rules:

- transcript must exist
- meeting must be organized by the connected user
- if mode is `tagged_meetings_only`, title must contain `[TRACK]`
- if mode is `organizer_only`, organizer match is sufficient

## Verification Performed

- frontend production build passes
- backend TypeScript compilation passes with:
  - `cmd /c ".\\node_modules\\.bin\\tsc.cmd -p backend\\tsconfig.json --noEmit"`

Note:

- the full backend `npm run build --workspace backend` can fail on Windows if Prisma's query engine DLL is locked by a running backend dev process
- stop the backend dev server before running the full backend build if that occurs

## Remaining Assumptions

- webhook delivery from Microsoft Graph requires a public HTTPS callback URL
- transcript subscription support depends on the Microsoft account type and tenant permissions
- Cloudinary upload falls back to local generated file URLs if Cloudinary credentials are not configured
