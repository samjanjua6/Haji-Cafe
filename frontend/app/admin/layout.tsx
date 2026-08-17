"use client";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <main className="page-content">
          <div className="page-content-inner">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
