import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import QueryProvider from "@/lib/QueryProvider";
import ChatbotWidget from "@/components/ChatbotWidget";

const inter = Inter({ subsets: ["latin"] });

import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Haji Cafe Management",
  description: "Advanced POS & Cafe Management System",
};

const themeScript = `
  (function() {
    try {
      var savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
      } else {
        var prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
        document.documentElement.setAttribute('data-theme', prefersLight ? 'light' : 'dark');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={inter.className}
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-base)",
          color: "var(--text-primary)"
        }}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <QueryProvider>
            <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                {children}
              </div>
              <ChatbotWidget />
            </div>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "var(--bg-base)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              },
            }}
          />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
