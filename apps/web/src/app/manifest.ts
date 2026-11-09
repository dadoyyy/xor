import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return (
    {
      name: "xor — study together",
      short_name: "xor",
      description: "Private subjects: turn PDFs into flashcards and quizzes, and climb the leaderboard with friends.",
      start_url: "/subjects",
      scope: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#ffffff",
      categories: ["education", "productivity"],
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    }
  );
}

