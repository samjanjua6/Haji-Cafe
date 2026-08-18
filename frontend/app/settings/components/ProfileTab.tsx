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
    <div className="card p-6 flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Profile</h2>
        <p className="text-[var(--text-color)] text-sm opacity-80">
          Manage your personal information and avatar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Display Name</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="John Doe"
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Email Address</span>
          </label>
          <input
            type="email"
            className="input input-bordered opacity-70"
            value={user.email}
            disabled
          />
          <span className="text-xs text-[var(--text-color)] opacity-70 mt-1">
            To change your email address, please contact platform support.
          </span>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Role</span>
          </label>
          <div>
            <span className="px-3 py-1 bg-[var(--sidebar-hover)] rounded-md font-semibold text-sm">
              {user.role.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Member Since</span>
          </label>
          <div className="pt-2 font-medium">
            {memberSince}
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-4">
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
