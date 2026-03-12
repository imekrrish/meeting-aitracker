import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent, type KeyboardEvent } from "react";

type TranscriptFormProps = {
  onSubmit: (formData: FormData) => Promise<void>;
  isLoading: boolean;
};

type FormState = {
  meetingTitle: string;
  projectName: string;
  transcriptText: string;
};

const initialState: FormState = {
  meetingTitle: "",
  projectName: "",
  transcriptText: ""
};

export function TranscriptForm({ onSubmit, isLoading }: TranscriptFormProps) {
  const [formState, setFormState] = useState<FormState>(initialState);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [columns, setColumns] = useState<string[]>([
    "Speaker",
    "Task",
    "Work Done Today",
    "Task Progress",
    "Deadline",
    "Further Discussion"
  ]);
  const [newColumn, setNewColumn] = useState("");

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

  const handleAddColumn = (e?: FormEvent | KeyboardEvent) => {
    e?.preventDefault();
    const trimmed = newColumn.trim();
    if (trimmed && !columns.includes(trimmed)) {
      setColumns([...columns, trimmed]);
      setNewColumn("");
    }
  };

  const removeColumn = (colToRemove: string) => {
    setColumns(columns.filter((c) => c !== colToRemove));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = new FormData();
    payload.append("meetingTitle", formState.meetingTitle);
    payload.append("projectName", formState.projectName);
    payload.append("transcriptText", formState.transcriptText);
    payload.append("customColumns", JSON.stringify(columns));

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


      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="font-medium text-sm text-slate-700 mb-3">Custom Excel Columns</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {columns.map((col) => (
            <div key={col} className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
              <span>{col}</span>
              <button
                type="button"
                onClick={() => removeColumn(col)}
                className="text-slate-400 transition hover:text-red-500 font-bold"
                aria-label="Remove column"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newColumn}
            onChange={(e) => setNewColumn(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddColumn();
              }
            }}
            placeholder="Add a new column..."
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-tide"
          />
          <button
            type="button"
            onClick={handleAddColumn}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Add
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          className={`rounded-[24px] border border-dashed p-5 transition ${dragActive ? "border-tide bg-mist" : "border-slate-300 bg-white"
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
          The backend extracts structured insights with OpenAI, generates a customized Excel and PDF, and emails them to your registered email automatically.
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
