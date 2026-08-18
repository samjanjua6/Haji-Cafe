"use client";

import { useState } from "react";
import { UserProfile } from "@/hooks/useCurrentUser";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

interface DefaultsTabProps {
  user: UserProfile;
}

export default function DefaultsTab({ user }: DefaultsTabProps) {
  const [defaultCafeId, setDefaultCafeId] = useState<string>(user.defaultCafeId ? String(user.defaultCafeId) : "");
  const [defaultBranchId, setDefaultBranchId] = useState<string>(user.defaultBranchId ? String(user.defaultBranchId) : "");
  const [timezone, setTimezone] = useState<string>(user.timezone || "UTC");
  const [saving, setSaving] = useState(false);

  // Derive unique cafes from scopes for the dropdown
  const uniqueCafes = Array.from(new Map(
    user.scopes.filter(s => s.cafeId).map(s => [s.cafeId, { id: s.cafeId, name: s.cafeName }])
  ).values());

  // Filter branches based on selected cafe
  const availableBranches = defaultCafeId 
    ? user.scopes.filter(s => String(s.cafeId) === defaultCafeId && s.branchId)
    : [];

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put("/auth/me", {
        defaultCafeId: defaultCafeId ? parseInt(defaultCafeId) : null,
        defaultBranchId: defaultBranchId ? parseInt(defaultBranchId) : null,
        timezone,
      });
      toast.success("Defaults saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save defaults");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-6 flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Workspace Defaults</h2>
        <p className="text-[var(--text-color)] text-sm opacity-80">
          Set default locations and timezones for your dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Default Café</span>
          </label>
          <select 
            className="select select-bordered w-full"
            value={defaultCafeId}
            onChange={(e) => {
              setDefaultCafeId(e.target.value);
              setDefaultBranchId(""); // reset branch when cafe changes
            }}
          >
            <option value="">None (Show global dashboard)</option>
            {uniqueCafes.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Default Branch</span>
          </label>
          <select 
            className="select select-bordered w-full"
            value={defaultBranchId}
            onChange={(e) => setDefaultBranchId(e.target.value)}
            disabled={!defaultCafeId}
          >
            <option value="">None (Show all branches)</option>
            {availableBranches.map((b) => (
              <option key={b.branchId} value={String(b.branchId)}>{b.branchName}</option>
            ))}
          </select>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Timezone</span>
          </label>
          <select 
            className="select select-bordered w-full"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="Europe/London">London (GMT/BST)</option>
            <option value="Asia/Dubai">Dubai (GST)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
            <option value="Australia/Sydney">Sydney (AEST)</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <button 
          className="btn btn-primary" 
          onClick={handleSave} 
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Defaults"}
        </button>
      </div>
    </div>
  );
}
