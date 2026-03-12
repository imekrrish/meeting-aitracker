import sanitizeHtml from "sanitize-html";

export function sanitizePlainText(value: string): string {
  const stripped = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
  return stripped.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim();
}

export function sanitizeOptionalText(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const sanitized = sanitizePlainText(value);
  return sanitized.length ? sanitized : null;
}

