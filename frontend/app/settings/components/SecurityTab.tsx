"use client";

import { useState } from "react";
import { UserProfile } from "@/hooks/useCurrentUser";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";

interface SecurityTabProps {
  user: UserProfile;
}

export default function SecurityTab({ user }: SecurityTabProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: sessions, refetch } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api.get<any[]>("/auth/sessions"),
  });

  const handleChangePassword = async () => {
    setError("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    try {
      setSaving(true);
      await api.put("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      toast.success("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!confirm("Are you sure you want to log out of all other devices?")) return;
    try {
      await api.post("/auth/logout-all", {});
      toast.success("Logged out of all other sessions.");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to logout sessions.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Password Change */}
      <div className="card" style={{ padding: "24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px" }}>Change Password</h2>
        <p style={{ color: "var(--text-color)", fontSize: "14px", opacity: 0.8, marginBottom: "24px" }}>
          Update your password to keep your account secure.
        </p>

        {error && <div style={{ color: "var(--danger)", fontSize: "14px", marginBottom: "16px" }}>{error}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "400px" }}>
          <div className="form-control">
            <label className="label"><span className="label-text" style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-faint)" }}>Current Password</span></label>
            <input
              type="password"
              className="input input-bordered"
              style={{ width: "100%" }}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text" style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-faint)" }}>New Password</span></label>
            <input
              type="password"
              className="input input-bordered"
              style={{ width: "100%" }}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text" style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-faint)" }}>Confirm New Password</span></label>
            <input
              type="password"
              className="input input-bordered"
              style={{ width: "100%" }}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
            <button 
              className="btn btn-primary" 
              onClick={handleChangePassword}
              disabled={saving}
            >
              {saving ? "Saving..." : "Change Password"}
            </button>
          </div>
        </div>
      </div>

      {/* Sessions */}
      <div className="card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px" }}>Active Sessions</h2>
            <p style={{ color: "var(--text-color)", fontSize: "14px", opacity: 0.8, margin: 0 }}>
              Manage devices currently logged into your account.
            </p>
          </div>
          <button 
            className="btn btn-ghost" 
            style={{ color: "var(--danger)" }} 
            onClick={handleLogoutAll}
          >
            Log out all
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {!sessions ? (
            <div style={{ fontSize: "14px", opacity: 0.7 }}>Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div style={{ fontSize: "14px", opacity: 0.7 }}>No active sessions found.</div>
          ) : (
            sessions.map((s) => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", background: "var(--sidebar-hover)", borderRadius: "8px" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Logged in session</div>
                  <div style={{ fontSize: "14px", opacity: 0.7 }}>
                    Created: {new Date(s.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
