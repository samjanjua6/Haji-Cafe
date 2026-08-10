import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-heading" });

export const metadata: Metadata = {
  title: "Haji Cafe — Admin Dashboard",
  description: "Multi-Branch Café Management System",
};

import ChatbotWidget from "@/components/ChatbotWidget";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${plusJakarta.variable} font-sans`} suppressHydrationWarning>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              boxShadow: "0 4px 12px rgba(41, 35, 31, 0.08)",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: 500,
            },
          }}
        />
        {children}
        <ChatbotWidget />
      </body>
    </html>
  );
}
