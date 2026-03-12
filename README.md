# Meeting Tracker AI

Meeting Tracker AI is a production-structured MVP for turning raw meeting transcripts into usable project outputs. Users can upload a `.txt` transcript or paste transcript text, then receive:

- validated AI-generated meeting insights
- an Excel workbook
- a professional PDF summary
- automatic email delivery through Gmail SMTP
- saved processing history in SQLite

The codebase is split into a React frontend and an Express backend, with a future-ready transcript adapter layer so Microsoft Graph / Teams automation can be added later without rewriting the core pipeline.

## Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Validation: Zod
- Uploads: multer
- Excel: exceljs
- PDF: pdf-lib
- Email: nodemailer with Gmail SMTP
- AI: OpenAI API
- Database: SQLite with Prisma client
- Config: dotenv

`pdf-lib` was chosen over Puppeteer for the MVP because it avoids a Chromium dependency and keeps local setup lighter.

## Folder Structure

```text
meeting-tracker-ai/
  backend/
    prisma/
    samples/
    src/
      config/
      constants/
      controllers/
      middleware/
      routes/
      services/
        adapters/
        storage/
      types/
      utils/
      validators/
  frontend/
    src/
      components/
      lib/
      types/
```

## Architecture

The backend is deliberately separated into stages:

- Transcript ingestion: adapter layer in `backend/src/services/adapters`
- Transcript normalization: `backend/src/services/transcript-normalizer.service.ts`
- AI extraction: `backend/src/services/openai.service.ts`
- File generation: `backend/src/services/excel.service.ts` and `backend/src/services/pdf.service.ts`
- Email delivery: `backend/src/services/email.service.ts`
- Persistence: `backend/src/services/history.service.ts`
- Future integrations: `TranscriptSourceAdapter` interface

Implemented adapter:

- `ManualUploadAdapter`

Planned future adapters:

- `MicrosoftTeamsAdapter`
- `GoogleMeetAdapter`
- `ZoomAdapter`

## Local Setup

Requirements:

- Node.js 20+ recommended
- npm 10+ recommended
- OpenAI API key
- Gmail account with App Password enabled

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment files

Backend:

```bash
cp backend/.env.example backend/.env
```

Frontend:

```bash
cp frontend/.env.example frontend/.env
```

Windows PowerShell alternative:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

### 3. Fill the backend environment

Required values in `backend/.env`:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`
- `DATABASE_URL`
- `CLIENT_ORIGIN`

Use a Gmail App Password for `SMTP_PASS`. Do not use your regular Gmail password.

Recommended defaults:

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
OPENAI_MODEL=gpt-4.1-mini
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
DATABASE_URL=file:./dev.db
MAX_UPLOAD_SIZE_MB=2
```

### 4. Run the app

```bash
npm run dev
```

That starts:

- frontend on `http://localhost:5173`
- backend on `http://localhost:4000`

## Build Commands

```bash
npm run build
```

Extra scripts:

- `npm run dev:frontend`
- `npm run dev:backend`
- `npm run db:generate`
- `npm run db:push`

Note:

- The backend also initializes the main SQLite table on startup through Prisma, so the MVP can boot even if `prisma db push` is skipped.
- In this environment, `prisma generate` worked, but `prisma db push` returned a generic Prisma schema-engine error with SQLite. Because of that, startup includes a safe `CREATE TABLE IF NOT EXISTS` fallback for the `ProcessingHistory` table.

## API Endpoints

- `GET /api/health`
- `POST /api/transcripts/process`
- `POST /api/transcripts/email`
- `GET /api/history`

## Request Format

`POST /api/transcripts/process` accepts `multipart/form-data`.

Fields:

- `fullName`
- `email`
- `meetingTitle`
- `projectName` optional
- `transcriptText` optional if file is present
- `transcriptFile` optional `.txt` file if text is present

## Output JSON

The backend requests structured JSON from OpenAI and validates it with Zod before using it.

Core extracted fields:

- `meetingTitleSuggestion`
- `overallSummary`
- `managerSummary`
- `keyDecisions`
- `blockers`
- `risks`
- `followUpQuestions`
- `followUpEmailDraft`
- `dailyStandupFormat`
- `rows[]`

Value-add fields:

- `executiveSummary`
- `ownerWiseActionTracker`
- `blockerRadar`
- `riskAndDependencySection`
- `suggestedNextMeetingAgenda`
- `highlightReel`

## Excel Sheets

The generated workbook contains:

- `Summary`
- `Structured Updates`
- `Action Items`
- `Blockers`
- `Owner View`

## PDF Sections

The generated PDF contains:

- meeting title
- generated date/time
- overall summary
- manager summary
- executive summary
- key decisions
- action items
- blockers
- risks
- owner-wise tasks
- next steps
- suggested next meeting agenda
- follow-up email draft

## Security Notes

- file size limit is enforced by multer
- only plain-text transcript uploads are accepted in this MVP
- metadata and transcript inputs are sanitized
- malformed AI JSON is rejected
- credentials are environment-driven only
- email failure does not block downloads

## Sample Assets

- sample transcript: [backend/samples/sample-transcript.txt](/c:/Users/91918/Downloads/meeting-tracker-ai/backend/samples/sample-transcript.txt)
- sample process response: [backend/samples/sample-response.json](/c:/Users/91918/Downloads/meeting-tracker-ai/backend/samples/sample-response.json)
- sample history response: [backend/samples/sample-history-response.json](/c:/Users/91918/Downloads/meeting-tracker-ai/backend/samples/sample-history-response.json)

## Verification Performed

- `npm install`
- `npm audit --json` returned zero vulnerabilities after dependency updates
- `npm run build`
- runtime health-check against `GET /api/health` with temporary local env values

