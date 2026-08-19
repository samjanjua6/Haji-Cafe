"use client";

import { UserProfile } from "@/hooks/useCurrentUser";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Calendar, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface IntegrationsTabProps {
  user: UserProfile;
}

export default function IntegrationsTab({ user }: IntegrationsTabProps) {
  const queryClient = useQueryClient();

  const handleConnect = async () => {
    try {
      const data = await api.get<{ connect_url: string }>("/auth/google/connect");
      if (data.connect_url) {
        window.location.href = data.connect_url;
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to connect to Google.");
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Google Calendar? Staff meetings will no longer sync.")) return;
    try {
      await api.post("/auth/google/disconnect", {});
      toast.success("Google Calendar disconnected.");
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect.");
    }
  };

  return (
    <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px" }}>Integrations</h2>
        <p style={{ color: "var(--text-color)", fontSize: "14px", opacity: 0.8, margin: 0 }}>
          Connect third-party apps to enhance your workflow.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", padding: "16px", border: "1px solid var(--sidebar-hover)", borderRadius: "12px", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "48px", height: "48px", background: "var(--bg-card)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
              <Calendar color="#3b82f6" size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
                Google Calendar
                {user.has_google_calendar && (
                  <span className="badge badge-success badge-sm" style={{ padding: "4px 8px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }}>Connected</span>
                )}
              </div>
              <div style={{ fontSize: "14px", opacity: 0.7, marginTop: "2px" }}>
                Sync staff meetings and schedules directly to your calendar.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {user.has_google_calendar ? (
              <>
                <button className="btn btn-ghost" onClick={handleConnect} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <RefreshCw size={14} /> Reconnect
                </button>
                <button className="btn" style={{ background: "var(--danger)", color: "var(--text-primary)" }} onClick={handleDisconnect}>
                  Disconnect
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={handleConnect}>
                Connect Account
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
