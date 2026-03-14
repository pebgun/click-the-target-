import type { Metadata } from "next";
import "./globals.css";
import ThemeLoader from "@/components/ThemeLoader";

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
    <html lang="en" suppressHydrationWarning>
      <head>
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
