import type { Metadata } from "next";
import "./globals.css";
import ThemeLoader from "@/components/ThemeLoader";

export const metadata: Metadata = {
  title: "Click the Target",
  description: "A fast-paced aim game — click the targets, beat the clock.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem("click-target-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t;})();`,
          }}
        />
      </head>
      <body>
        <ThemeLoader />
        {children}
      </body>
    </html>
  );
}
