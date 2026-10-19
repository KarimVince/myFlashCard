"use client";

import { useRef, useState } from "react";
import { errorMessage, extractDocument } from "@/lib/api";
import { SourceDocument } from "@/lib/types";

const ACCEPT = ".pdf,.docx,.txt,.md,.csv";

/** Optional document whose text the AI uses as source material. Only the text is sent; nothing is stored. */
export default function DocumentPicker({
  token,
  doc,
  onChange,
  disabled,
}: {
  token: string;
  doc: SourceDocument | null;
  onChange: (doc: SourceDocument | null) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setReading(true);
    setError(null);
    try {
      onChange(await extractDocument(token, file));
    } catch (e) {
      onChange(null);
      setError(errorMessage(e));
    } finally {
      setReading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="hidden"
        aria-label="Source document"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {doc ? (
        <div className="flex items-start justify-between gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="font-medium text-gray-800 truncate">📄 {doc.filename}</p>
            <p className="text-xs text-gray-500">
              {doc.chars.toLocaleString()} characters
              {doc.truncated && " — only the beginning is used (the document is long)"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            className="text-xs text-gray-400 hover:text-red-600 shrink-0"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={disabled || reading}
          className="text-sm text-teal-700 hover:underline disabled:opacity-50"
        >
          {reading ? "Reading the document…" : "＋ Add a document (optional) — PDF, Word or text"}
        </button>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
