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
    <div className="flex flex-col gap-6">
      {/* Password Change */}
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-1">Change Password</h2>
        <p className="text-[var(--text-color)] text-sm opacity-80 mb-6">
          Update your password to keep your account secure.
        </p>

        {error && <div className="text-red-500 text-sm mb-4">{error}</div>}

        <div className="flex flex-col gap-4 max-w-md">
          <div className="form-control">
            <label className="label"><span className="label-text">Current Password</span></label>
            <input
              type="password"
              className="input input-bordered"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">New Password</span></label>
            <input
              type="password"
              className="input input-bordered"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Confirm New Password</span></label>
            <input
              type="password"
              className="input input-bordered"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="flex justify-end mt-2">
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
      <div className="card p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold mb-1">Active Sessions</h2>
            <p className="text-[var(--text-color)] text-sm opacity-80">
              Manage devices currently logged into your account.
            </p>
          </div>
          <button className="btn btn-ghost text-red-500" onClick={handleLogoutAll}>
            Log out all
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {!sessions ? (
            <div className="text-sm opacity-70">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-sm opacity-70">No active sessions found.</div>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className="flex justify-between items-center p-4 bg-[var(--sidebar-hover)] rounded-lg">
                <div>
                  <div className="font-semibold">Logged in session</div>
                  <div className="text-sm opacity-70">
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
