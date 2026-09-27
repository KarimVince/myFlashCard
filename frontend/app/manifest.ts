import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "myFlashCard",
    short_name: "myFlashCard",
    description:
      "Free offline flashcard app. Browse the public deck library or create your own with AI.",
    start_url: "/",
    display: "standalone",
    background_color: "#f9fafb",
    theme_color: "#0d9488",
    orientation: "portrait",
    icons: [
      {
        src: "/apple-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
