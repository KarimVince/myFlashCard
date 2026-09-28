"use client";

import Link from "next/link";
import { useFeatures } from "@/lib/features";

type Step = { title: string; body: string; link?: { href: string; label: string } };

const AI_STEPS: Step[] = [
  {
    title: "Create a free account",
    body: "Only an alias and an email. Confirm your email with the link we send you — that unlocks AI generation.",
    link: { href: "/account/register?next=/create", label: "Create an account →" },
  },
  {
    title: "Pick a deck type and describe your deck",
    body: 'On the Create page (or the Create tab in the app), choose a type such as Recipe, Study or Travel, then describe what you want: "3 days in Lisbon on a budget, with food and transport tips".',
    link: { href: "/create", label: "Open the Create page →" },
  },
  {
    title: "Get your deck in under a minute",
    body: "The AI writes the deck in the right format. We check it before you see it, and a token is only used when you get a valid deck.",
  },
  {
    title: "Study it anywhere",
    body: "In the iPhone web app and the Android app, the new deck goes straight into My Decks. On the website you can preview it, download the JSON, or add it to My Decks for the web app.",
  },
];

const MANUAL_STEPS: Step[] = [
  {
    title: "Copy the AI prompt for your deck type",
    body: "Go to the JSON Schema page, pick your deck type and copy its prompt. It tells the AI exactly what structure to produce.",
    link: { href: "/schema", label: "Go to JSON Schema →" },
  },
  {
    title: "Paste it into any AI chat",
    body: 'Paste the prompt into Claude, ChatGPT, Gemini or Mistral, then add your topic in plain text: "Make me a recipe deck with 5 pasta dishes". The AI answers with a JSON deck.',
  },
  {
    title: "Save it as a .json file",
    body: "Copy the JSON and save it as a file on your phone (e.g. pasta.json) — in Files, Google Drive, or any folder your phone can open.",
  },
  {
    title: "Load it in myFlashCard",
    body: 'On Android, go to the third tab and tap "Load from file". The deck loads instantly and works fully offline.',
  },
];

function Steps({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-7">
      {steps.map(({ title, body, link }, i) => (
        <li key={title} className="flex gap-5">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
            {i + 1}
          </div>
          <div className="pt-0.5">
            <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{body}</p>
            {link && (
              <Link href={link.href} className="text-teal-600 text-sm font-medium mt-1 inline-block hover:underline">
                {link.label}
              </Link>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function HowToPage() {
  const { ai, loaded } = useFeatures();
  if (!loaded) return null;
  if (!ai) return <ManualOnly />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Create your own deck</h1>
      <p className="text-gray-500 mb-8">
        Two ways to get a deck on any topic — no JSON writing needed for either.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-14">
        <a href="#ai" className="block bg-white border-2 border-teal-600 rounded-xl p-5 hover:bg-teal-50 transition-colors">
          <p className="text-2xl mb-2">✨</p>
          <p className="font-semibold text-gray-900">Generate with AI</p>
          <p className="text-sm text-gray-500 mt-1">
            Describe it, get it in a minute. Free account, free decks every month.
          </p>
        </a>
        <a href="#manual" className="block bg-white border border-gray-200 rounded-xl p-5 hover:bg-gray-50 transition-colors">
          <p className="text-2xl mb-2">🛠️</p>
          <p className="font-semibold text-gray-900">Do it manually</p>
          <p className="text-sm text-gray-500 mt-1">
            Use any AI chat with our prompts. No account, no limits.
          </p>
        </a>
      </div>

      <section id="ai" className="scroll-mt-20 mb-16">
        <h2 className="text-xl font-bold text-gray-900 mb-6">✨ Generate with AI</h2>
        <Steps steps={AI_STEPS} />
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-5 text-sm text-gray-600 space-y-2">
          <p className="font-semibold text-gray-900">About tokens</p>
          <p>
            Each deck uses a token. Free accounts get a set number of tokens every month, renewed on the 1st; unused
            tokens don&apos;t carry over. If the AI can&apos;t produce a valid deck, no token is used.
          </p>
        </div>
      </section>

      <section id="manual" className="scroll-mt-20">
        <h2 className="text-xl font-bold text-gray-900 mb-6">🛠️ Do it manually</h2>
        <Steps steps={MANUAL_STEPS} />
      </section>

      <section className="mt-16 bg-teal-50 border border-teal-100 rounded-xl p-6">
        <h2 className="font-semibold text-teal-800 mb-3">💡 Tips for better decks (both ways)</h2>
        <ul className="space-y-2 text-sm text-teal-700">
          <li>✓ Be specific: the topic, your level, and what the deck should include.</li>
          <li>✓ Ask for 5–10 cards — smaller decks are easier to review.</li>
          <li>✓ Say which language you want, or just write your description in that language.</li>
          <li>✓ Don&apos;t put personal or sensitive information in your description.</li>
          <li>✓ Doing it manually and the JSON has errors? Paste it back and say &quot;fix the JSON so it matches the schema&quot;.</li>
        </ul>
      </section>

      <div className="mt-10 flex flex-wrap gap-3 justify-center">
        <Link href="/create" className="inline-flex items-center gap-2 bg-teal-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-teal-700 transition-colors">
          ✨ Create with AI
        </Link>
        <Link href="/schema" className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 font-semibold px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors">
          AI prompts by deck type →
        </Link>
      </div>
    </div>
  );
}

/** The v1 how-to: shown while AI generation is switched off. */
function ManualOnly() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Create your own deck with AI</h1>
      <p className="text-gray-500 mb-12">
        You don&apos;t need to write JSON by hand. Use a free AI tool and our prompts — you&apos;ll have a working
        flashcard deck in under two minutes.
      </p>
      <Steps steps={MANUAL_STEPS} />
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
        <Link href="/schema" className="inline-flex items-center gap-2 bg-teal-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-teal-700 transition-colors">
          See AI prompts by deck type →
        </Link>
      </div>
    </div>
  );
}
