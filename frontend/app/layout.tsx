import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import QueryProvider from "@/lib/QueryProvider";
import ChatbotWidget from "@/components/ChatbotWidget";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Haji Cafe — Admin Dashboard",
  description: "Multi-Branch Café Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
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
                background: "#1e293b",
                color: "#f1f5f9",
                border: "1px solid #334155",
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
