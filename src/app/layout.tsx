import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Click the Target Game",
  description: "A simple mini web game - click the red square!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
