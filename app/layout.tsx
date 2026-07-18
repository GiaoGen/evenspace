import type { Metadata } from "next";
import { getInitialMockSession } from "@/data/mock/mock-session-seed";
import { MockSessionProvider } from "@/features/mock-session/components/mock-session-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "EventSpace",
    template: "%s · EventSpace",
  },
  description: "Private, temporary rooms for shared events.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialSession = getInitialMockSession();
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body><MockSessionProvider initialSession={initialSession}>{children}</MockSessionProvider></body>
    </html>
  );
}
