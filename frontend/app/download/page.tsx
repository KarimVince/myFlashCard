"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBuilds } from "@/lib/api";

type Build = { filename: string; url: string; size_mb: number };

function fileIcon(filename: string) {
  if (filename.endsWith(".aab")) return "📦";
  if (filename.endsWith(".ipa")) return "🍎";
  return "🤖";
}

function fileLabel(filename: string) {
  if (filename.endsWith(".aab")) return "AAB · Google Play bundle";
  if (filename.endsWith(".ipa")) return "IPA · iOS";
  return "APK · Android sideload";
}

export default function DownloadPage() {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBuilds()
      .then(setBuilds)
      .finally(() => setLoading(false));
  }, []);

  const apkBuilds = builds.filter((b) => b.filename.endsWith(".apk"));
  const otherBuilds = builds.filter((b) => !b.filename.endsWith(".apk"));

  return (
    <div className="max-w-2xl mx-auto px-4 py-20">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Download myFlashCard</h1>
        <p className="text-gray-500 text-lg">
          Direct install while we await store approval.
        </p>
      </div>

      <div className="space-y-6">
        {/* Android */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-3xl">
              🤖
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Android</h2>
              <p className="text-sm text-gray-500">Android 8.0 and above</p>
            </div>
          </div>

          {loading && (
            <div className="text-sm text-gray-400 text-center py-4">Loading…</div>
          )}

          {!loading && apkBuilds.length === 0 && (
            <div className="text-sm text-gray-400 text-center py-4">No APK available yet.</div>
          )}

          {!loading && apkBuilds.length > 0 && (
            <div className="space-y-3">
              {apkBuilds.map((b) => (
                <a
                  key={b.filename}
                  href={b.url}
                  download
                  className="flex items-center justify-between gap-3 bg-teal-600 text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-teal-700 transition-colors shadow-sm w-full"
                >
                  <span className="flex items-center gap-3">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0" aria-hidden="true">
                      <path d="M5 20h14v-2H5v2zm7-18L5.33 8h3.84v5h5.66V8h3.84L12 2z"/>
                    </svg>
                    <span className="truncate">{b.filename}</span>
                  </span>
                  <span className="text-teal-200 text-sm shrink-0">{b.size_mb} MB</span>
                </a>
              ))}
            </div>
          )}

          <div className="mt-5 bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-2">
            <p className="font-semibold text-gray-800">How to install:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-500">
              <li>Download the APK file above</li>
              <li>Open <strong>Settings → Apps → Install unknown apps</strong></li>
              <li>Allow your browser or file manager to install APKs</li>
              <li>Open the downloaded file and tap <strong>Install</strong></li>
            </ol>
          </div>

          <p className="text-xs text-gray-400 mt-4 text-center">
            Google Play Store submission pending approval
          </p>
        </div>

        {/* Other builds (AAB, IPA) if any */}
        {!loading && otherBuilds.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Other builds</h2>
            <div className="space-y-3">
              {otherBuilds.map((b) => (
                <a
                  key={b.filename}
                  href={b.url}
                  download
                  className="flex items-center justify-between gap-3 bg-gray-800 text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-gray-700 transition-colors shadow-sm w-full"
                >
                  <span className="flex items-center gap-3">
                    <span>{fileIcon(b.filename)}</span>
                    <span className="truncate">{b.filename}</span>
                    <span className="text-xs text-gray-400 hidden sm:inline">{fileLabel(b.filename)}</span>
                  </span>
                  <span className="text-gray-400 text-sm shrink-0">{b.size_mb} MB</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* iOS — PWA */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl">
              🍎
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">iPhone & iPad</h2>
              <p className="text-sm text-gray-500">Install directly from Safari — no App Store needed</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-sm text-blue-900 space-y-3">
            <p className="font-semibold text-blue-800">How to install on iPhone:</p>
            <ol className="space-y-3 text-blue-700">
              <li className="flex gap-3">
                <span className="font-bold shrink-0">1.</span>
                <span>Open <strong>Safari</strong> on your iPhone and go to <strong>myflashcard-web.onrender.com/app</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold shrink-0">2.</span>
                <span>Tap the <strong>Share</strong> button at the bottom of Safari (the square with an arrow pointing up)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold shrink-0">3.</span>
                <span>Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold shrink-0">4.</span>
                <span>Tap <strong>Add</strong> — the myFlashCard icon appears on your home screen</span>
              </li>
            </ol>
          </div>

          <p className="text-xs text-gray-400 mt-4 text-center">
            Works on iOS 14 and above · Must use Safari (not Chrome or Firefox)
          </p>
        </div>
      </div>

      <p className="text-center text-sm text-gray-400 mt-10">
        <Link href="/" className="text-teal-600 underline">← Back to home</Link>
      </p>
    </div>
  );
}
