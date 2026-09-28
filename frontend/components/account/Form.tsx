"use client";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mb-6">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export function Field({
  label, type = "text", value, onChange, autoComplete, autoFocus, hint,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  autoFocus?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
      {hint && <span className="block text-xs text-gray-400 mt-1">{hint}</span>}
    </label>
  );
}

export function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full bg-teal-600 text-white font-semibold py-2 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-60"
    >
      {busy ? "Please wait…" : children}
    </button>
  );
}

export function Notice({ kind, children }: { kind: "error" | "success" | "info"; children: React.ReactNode }) {
  const styles = {
    error: "text-red-600 bg-red-50 border-red-200",
    success: "text-teal-800 bg-teal-50 border-teal-200",
    info: "text-amber-800 bg-amber-50 border-amber-200",
  }[kind];
  return <p className={`text-sm border rounded-lg px-3 py-2 ${styles}`}>{children}</p>;
}
