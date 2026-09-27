import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "myFlashCard — Study anything, offline",
  description:
    "Free offline flashcard app. Browse the public deck library or create your own JSON decks with AI.",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "myFlashCard",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 font-sans antialiased min-h-screen flex flex-col">
        <ServiceWorkerRegistration />
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-gray-200 py-8 text-center text-sm text-gray-400">
          © 2025 WillYGO Incorporation · myFlashCard
        </footer>
      </body>
    </html>
  );
}
