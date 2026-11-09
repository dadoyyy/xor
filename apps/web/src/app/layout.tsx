import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fredoka";
import "@fontsource-variable/nunito";
import "@/styles/globals.css";
import RegisterSW from "@/components/layout/RegisterSW";
import { FeedbackProvider } from "@/components/ui/Feedback";
import SoundFx from "@/components/layout/SoundFx";

export const metadata: Metadata = {
  title: { default: "xor", template: "xor" },
  description:
    "Study rooms for your group: upload PDFs or import formatted Q&A, Multiple Choice, and Fill-in-the-Blank sets, track assignment due dates on your personal academic calendar, and build your daily GitHub-style study streak.",
  applicationName: "xor",
  appleWebApp: { capable: true, title: "xor", statusBarStyle: "default" },
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
        <FeedbackProvider>{children}</FeedbackProvider>
        <RegisterSW />
        <SoundFx />
      </body>
    </html>
  );
}

