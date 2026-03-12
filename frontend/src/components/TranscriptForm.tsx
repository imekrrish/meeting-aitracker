import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";

type TranscriptFormProps = {
  onSubmit: (formData: FormData) => Promise<void>;
  isLoading: boolean;
};

type FormState = {
  fullName: string;
  email: string;
  meetingTitle: string;
  projectName: string;
  transcriptText: string;
};

const initialState: FormState = {
  fullName: "",
  email: "",
  meetingTitle: "",
  projectName: "",
  transcriptText: ""
};

export function TranscriptForm({ onSubmit, isLoading }: TranscriptFormProps) {
  const [formState, setFormState] = useState<FormState>(initialState);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const updateField =
    (key: keyof FormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormState((current) => ({ ...current, [key]: event.target.value }));
    };

  const handleFile = (incoming: File | null) => {
    if (!incoming) {
      return;
    }
    setFile(incoming);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = new FormData();
    payload.append("fullName", formState.fullName);
    payload.append("email", formState.email);
    payload.append("meetingTitle", formState.meetingTitle);
    payload.append("projectName", formState.projectName);
    payload.append("transcriptText", formState.transcriptText);
    if (file) {
      payload.append("transcriptFile", file);
    }

    await onSubmit(payload);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    handleFile(event.dataTransfer.files[0] ?? null);
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel space-y-6 p-6 md:p-8">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium">Full name</span>
          <input
            required
            value={formState.fullName}
            onChange={updateField("fullName")}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-tide"
            placeholder="Aarav Mehta"
          />
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium">Email</span>
          <input
            required
            type="email"
            value={formState.email}
            onChange={updateField("email")}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-tide"
            placeholder="aarav@example.com"
          />
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium">Meeting title</span>
          <input
            required
            value={formState.meetingTitle}
            onChange={updateField("meetingTitle")}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-tide"
            placeholder="Sprint 14 delivery sync"
          />
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium">Project / module</span>
          <input
            value={formState.projectName}
            onChange={updateField("projectName")}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-tide"
            placeholder="Payments platform"
          />
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          className={`rounded-[24px] border border-dashed p-5 transition ${
            dragActive ? "border-tide bg-mist" : "border-slate-300 bg-white"
          }`}
        >
          <p className="font-display text-xl font-semibold text-ink">Upload transcript</p>
          <p className="mt-2 text-sm text-slate-600">
            Drag and drop a `.txt` transcript or pick one manually. Max 2MB by default.
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-5 rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold text-ink transition hover:border-tide hover:text-tide"
          >
            Choose file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
            className="hidden"
          />
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            {file ? (
              <>
                <p className="font-medium text-ink">{file.name}</p>
                <p>{(file.size / 1024).toFixed(1)} KB ready for upload</p>
              </>
            ) : (
              <p>No file selected yet.</p>
            )}
          </div>
        </div>

        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium">Or paste transcript text</span>
          <textarea
            rows={12}
            value={formState.transcriptText}
            onChange={updateField("transcriptText")}
            className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-4 outline-none transition focus:border-tide"
            placeholder="Paste meeting transcript here..."
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl text-sm text-slate-600">
          The backend validates your input, sends the transcript to OpenAI, generates Excel and PDF outputs, emails them through Gmail SMTP, and stores the processing history in SQLite.
        </p>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? "Processing..." : "Process Transcript"}
        </button>
      </div>
    </form>
  );
}

