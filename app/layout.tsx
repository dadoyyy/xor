import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fredoka";
import "@fontsource-variable/nunito";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";
import { FeedbackProvider } from "@/components/Feedback";
import NavProgress from "@/components/NavProgress";

export const metadata: Metadata = {
  title: { default: "xor", template: "%s · xor" },
  description: "Study rooms for you and your friends. Turn PDFs into flashcards and quizzes, then climb the leaderboard together.",
  applicationName: "xor",
  appleWebApp: { capable: true, title: "xor", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192" }, { url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <NavProgress />
        <FeedbackProvider>{children}</FeedbackProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
