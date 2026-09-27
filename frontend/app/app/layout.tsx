import type { Metadata, Viewport } from "next";
import "../globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "myFlashCard",
  appleWebApp: { capable: true, title: "myFlashCard", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#0d9488" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 font-sans antialiased">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
