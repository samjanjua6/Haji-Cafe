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
    <div className="card p-6 flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Integrations</h2>
        <p className="text-[var(--text-color)] text-sm opacity-80">
          Connect third-party apps to enhance your workflow.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border border-[var(--sidebar-hover)] rounded-xl gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <Calendar className="text-blue-500" size={24} />
            </div>
            <div>
              <div className="font-bold text-lg flex items-center gap-2">
                Google Calendar
                {user.has_google_calendar && (
                  <span className="badge badge-success badge-sm">Connected</span>
                )}
              </div>
              <div className="text-sm opacity-70">
                Sync staff meetings and schedules directly to your calendar.
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {user.has_google_calendar ? (
              <>
                <button className="btn btn-ghost btn-sm" onClick={handleConnect}>
                  <RefreshCw size={14} /> Reconnect
                </button>
                <button className="btn btn-danger btn-sm" onClick={handleDisconnect}>
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
