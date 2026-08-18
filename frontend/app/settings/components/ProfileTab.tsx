"use client";

import { useState } from "react";
import { UserProfile } from "@/hooks/useCurrentUser";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

interface ProfileTabProps {
  user: UserProfile;
}

export default function ProfileTab({ user }: ProfileTabProps) {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [saving, setSaving] = useState(false);

  // Format member since
  const memberSince = user.createdAt 
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "Unknown";

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put("/auth/me", { displayName });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px" }}>Profile</h2>
        <p style={{ color: "var(--text-color)", fontSize: "14px", opacity: 0.8, margin: 0 }}>
          Manage your personal information and avatar.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "24px" }}>
        <div className="form-control">
          <label className="label">
            <span className="label-text" style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-faint)" }}>Display Name</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            style={{ width: "100%" }}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="John Doe"
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text" style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-faint)" }}>Email Address</span>
          </label>
          <input
            type="email"
            className="input input-bordered"
            style={{ width: "100%", opacity: 0.7 }}
            value={user.email}
            disabled
          />
          <span style={{ fontSize: "12px", color: "var(--text-color)", opacity: 0.7, marginTop: "4px", display: "block" }}>
            To change your email address, please contact platform support.
          </span>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text" style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-faint)" }}>Role</span>
          </label>
          <div style={{ marginTop: "4px" }}>
            <span style={{ padding: "4px 12px", background: "var(--sidebar-hover)", borderRadius: "6px", fontWeight: 600, fontSize: "14px" }}>
              {user.role.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text" style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-faint)" }}>Member Since</span>
          </label>
          <div style={{ paddingTop: "8px", fontWeight: 500 }}>
            {memberSince}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
        <button 
          className="btn btn-primary" 
          onClick={handleSave} 
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
