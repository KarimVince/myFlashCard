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
        Effective date: September 14, 2025 · Version 1.0
      </p>

      <div className="bg-teal-50 border-l-4 border-teal-600 rounded-r-xl px-5 py-4 mb-10">
        <p className="text-teal-800 font-medium text-sm">
          myFlashCard does not collect, store, or transmit any personal data.
          Everything stays on your device.
        </p>
      </div>

      {[
        {
          title: "What this policy covers",
          content:
            'This Privacy Policy describes how WillYGO Incorporation ("we", "our", or "us") handles information in connection with the myFlashCard mobile application for Android ("the app"). By using the app you confirm that you have read and understood this policy.',
        },
        {
          title: "Information we collect",
          content:
            "We collect no personal information of any kind. The app requires no account, login, or registration. We do not read your device ID, advertising ID, or any hardware identifier. The app does not request or use location permissions. There is no analytics SDK, crash reporter, or telemetry in the app. JSON deck files you load are read locally on your device and never sent anywhere. The app makes no network requests and operates fully offline.",
        },
        {
          title: "How your data is stored",
          content:
            "Flashcard decks are JSON files that you select from your own device storage. The app reads them into memory to display your cards. No data is written to external storage or transmitted over the network. When you close the app, no residual data is retained beyond what Android's standard app lifecycle manages on your device.",
        },
        {
          title: "Third-party services",
          content:
            "The app uses no third-party SDKs, advertising networks, analytics services, or cloud platforms. There is nothing to share with any third party because no data is collected in the first place.",
        },
        {
          title: "Children's privacy",
          content:
            "The app does not knowingly collect information from anyone, including children under the age of 13. Because we collect no data at all, the app is safe for users of any age in this respect.",
        },
        {
          title: "Changes to this policy",
          content:
            'If we update this policy, we will revise the "Last updated" date at the top. We will notify users of material changes through an in-app notice or an updated listing on Google Play.',
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
          <p className="text-gray-500">App: myFlashCard for Android</p>
          <p className="text-gray-500">Package: com.willygo.myflashcard</p>
        </div>
      </section>

      <footer className="pt-6 border-t border-gray-100 text-xs text-gray-400">
        © 2025 WillYGO Incorporation. All rights reserved. · myFlashCard v1.0 · Android
      </footer>
    </div>
  );
}
