import Link from "next/link";

const STEPS = [
  {
    n: 1,
    title: "Pick a deck type",
    body: "Choose from Recipe, Study, Training, or Song. Each type has its own JSON structure that the app understands.",
  },
  {
    n: 2,
    title: "Copy the AI prompt",
    body: 'Go to the JSON Schema page, pick your category and copy the prompt. It tells the AI exactly what structure to produce.',
    link: { href: "/schema", label: "Go to JSON Schema →" },
  },
  {
    n: 3,
    title: "Paste into Claude or ChatGPT",
    body: 'Paste the prompt, then add your content in plain text: "Make me a recipe deck with 5 pasta dishes", for example. The AI generates a valid JSON deck.',
  },
  {
    n: 4,
    title: "Save as a .json file",
    body: "Copy the JSON output and save it as a file on your phone (e.g. pasta.json) — in Files, Google Drive, or any folder your phone can access.",
  },
  {
    n: 5,
    title: "Load in myFlashCard",
    body: "Open the app, tap the + button, navigate to your JSON file, and it loads instantly. Works fully offline.",
  },
  {
    n: 6,
    title: "Share with the community (optional)",
    body: "Upload your deck to this library using the upload form. Other users can browse and download it.",
    link: { href: "/admin/upload", label: "Upload a deck →" },
  },
];

export default function HowToPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Create your own deck with AI
      </h1>
      <p className="text-gray-500 mb-12">
        You don&apos;t need to write JSON by hand. Use a free AI tool and the
        prompts below — you&apos;ll have a working flashcard deck in under two minutes.
      </p>

      <ol className="space-y-8">
        {STEPS.map(({ n, title, body, link }) => (
          <li key={n} className="flex gap-5">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
              {n}
            </div>
            <div className="pt-0.5">
              <h2 className="font-semibold text-gray-900 mb-1">{title}</h2>
              <p className="text-gray-500 text-sm leading-relaxed">{body}</p>
              {link && (
                <Link
                  href={link.href}
                  className="text-teal-600 text-sm font-medium mt-1 inline-block hover:underline"
                >
                  {link.label}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>

      {/* Tips */}
      <section className="mt-16 bg-teal-50 border border-teal-100 rounded-xl p-6">
        <h2 className="font-semibold text-teal-800 mb-3">💡 Tips for best results</h2>
        <ul className="space-y-2 text-sm text-teal-700">
          <li>✓ Keep each card focused on one concept, dish, or exercise.</li>
          <li>✓ Ask the AI for 5–10 cards — smaller decks are easier to review.</li>
          <li>✓ Ask the AI to &quot;add an accentColor in hex&quot; to colour-code your deck.</li>
          <li>✓ If the output has errors, paste it back and say &quot;fix the JSON so it matches the schema&quot;.</li>
          <li>✓ You can ask the AI to translate the deck into any language.</li>
        </ul>
      </section>

      <div className="mt-10 text-center">
        <Link
          href="/schema"
          className="inline-flex items-center gap-2 bg-teal-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-teal-700 transition-colors"
        >
          See AI prompts by deck type →
        </Link>
      </div>
    </div>
  );
}
