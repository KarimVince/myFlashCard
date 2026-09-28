export default function PolicyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-600 rounded-full px-3 py-1 mb-6">
        <span className="w-2 h-2 rounded-full bg-teal-600" />
        <span className="text-xs font-semibold uppercase tracking-wide text-teal-600">
          myFlashCard · WillYGO
        </span>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-10">
        Effective date: October 2026 · Version 2.0
      </p>

      <div className="bg-teal-50 border-l-4 border-teal-600 rounded-r-xl px-5 py-4 mb-10">
        <p className="text-teal-800 font-medium text-sm">
          You can use myFlashCard without an account. If you create one, we keep only an alias,
          your email and what&apos;s needed to run the service. We never sell your data.
        </p>
      </div>

      {[
        {
          title: "What this policy covers",
          content:
            'This Privacy Policy describes how WillYGO Incorporation ("we", "our", or "us") handles information in connection with myFlashCard: the Android app, the iPhone web app and the myFlashCard website (together, "the service").',
        },
        {
          title: "Using myFlashCard without an account",
          content:
            "Browsing the library, downloading decks and viewing your own deck files need no account. Decks you load or save are stored on your device only. To show the library, the app and website request the deck list and deck files from our server; our hosting provider keeps standard technical logs (such as IP address and time of request) for security and troubleshooting. There is no advertising or analytics tracking.",
        },
        {
          title: "Information we collect when you create an account",
          content:
            "An alias of your choice, your email address and your password (stored only as a secure one-way hash — we cannot read it). We also record when the account was created, when you last logged in, whether your email is confirmed, and any access you've been given (for example Premium). Your email is used to log you in, confirm your address and send password-reset links. It is never shown publicly or used for marketing.",
        },
        {
          title: "AI deck generation",
          content:
            "If you generate a deck with AI, the category and the description you write are sent to the AI provider you choose — Google (Gemini) or Anthropic (Claude) — to create the deck. Don't include personal or sensitive information in descriptions. Google may use content submitted through the free Gemini service to improve its products. We keep your descriptions, the generated decks and your token usage in your account so you can find your decks again and so we can enforce monthly limits and prevent misuse.",
        },
        {
          title: "Where your data is stored",
          content:
            "Account data is stored in our database hosted by Render. Library deck files are stored with Cloudflare. Emails are sent through Resend. These providers process data only on our behalf to run the service. When you're logged in, a login token is kept in your browser or app so you stay signed in; logging out removes it.",
        },
        {
          title: "Deleting your account",
          content:
            "You can delete your account at any time from your account page on the website or in the app. This permanently deletes your alias, email, password hash, access rights, AI generation history and tokens. Decks you saved on your device stay on your device.",
        },
        {
          title: "Children's privacy",
          content:
            "Accounts are not intended for children under 13, and we don't knowingly collect their information. The app can be used without an account by anyone.",
        },
        {
          title: "Changes to this policy",
          content:
            'If we update this policy, we will revise the date at the top. We will notify users of material changes through a notice in the app or on the website, or an updated listing on Google Play.',
        },
      ].map(({ title, content }) => (
        <section key={title} className="mb-8">
          <h2 className="font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-100">
            {title}
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">{content}</p>
        </section>
      ))}

      <section className="mb-8">
        <h2 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
          Contact us
        </h2>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm space-y-1">
          <p className="font-semibold text-gray-900">WillYGO Incorporation</p>
          <p className="text-gray-500">Email: privacy@willygo.app</p>
          <p className="text-gray-500">App: myFlashCard for Android, iPhone (web app) and web</p>
          <p className="text-gray-500">Package: com.willygo.myflashcard</p>
        </div>
      </section>

      <footer className="pt-6 border-t border-gray-100 text-xs text-gray-400">
        © 2026 WillYGO Incorporation. All rights reserved. · myFlashCard v2.0
      </footer>
    </div>
  );
}
