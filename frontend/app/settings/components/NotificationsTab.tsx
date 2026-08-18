"use client";

import { useState } from "react";
import { UserProfile } from "@/hooks/useCurrentUser";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

interface NotificationsTabProps {
  user: UserProfile;
}

export default function NotificationsTab({ user }: NotificationsTabProps) {
  const defaultPrefs = user.preferences || {};
  
  const [notifyNewOrder, setNotifyNewOrder] = useState(defaultPrefs.notifyNewOrder !== false);
  const [notifyOrderCancel, setNotifyOrderCancel] = useState(defaultPrefs.notifyOrderCancel !== false);
  const [notifyOrderStatus, setNotifyOrderStatus] = useState(defaultPrefs.notifyOrderStatus !== false);
  const [notifyLowStock, setNotifyLowStock] = useState(defaultPrefs.notifyLowStock !== false);
  const [notifyMeeting, setNotifyMeeting] = useState(defaultPrefs.notifyMeeting !== false);
  
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put("/auth/me", {
        preferences: {
          ...defaultPrefs,
          notifyNewOrder,
          notifyOrderCancel,
          notifyOrderStatus,
          notifyLowStock,
          notifyMeeting
        }
      });
      toast.success("Notification preferences saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const NotificationToggle = ({ label, description, checked, onChange }: any) => (
    <div className="flex justify-between items-center py-4 border-b border-[var(--sidebar-hover)] last:border-0">
      <div>
        <div className="font-semibold">{label}</div>
        <div className="text-sm opacity-70">{description}</div>
      </div>
      <label className="cursor-pointer">
        <input 
          type="checkbox" 
          className="toggle toggle-primary" 
          checked={checked} 
          onChange={(e) => onChange(e.target.checked)} 
        />
      </label>
    </div>
  );

  return (
    <div className="card p-6 flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Notifications</h2>
        <p className="text-[var(--text-color)] text-sm opacity-80">
          Manage how and when you receive alerts.
        </p>
      </div>

      <div className="flex flex-col">
        <NotificationToggle 
          label="New Orders" 
          description="Get notified when a new order is placed."
          checked={notifyNewOrder}
          onChange={setNotifyNewOrder}
        />
        <NotificationToggle 
          label="Order Cancellations" 
          description="Alerts for cancelled or rejected orders."
          checked={notifyOrderCancel}
          onChange={setNotifyOrderCancel}
        />
        <NotificationToggle 
          label="Order Status Updates" 
          description="Alerts when an order moves to preparation or completed."
          checked={notifyOrderStatus}
          onChange={setNotifyOrderStatus}
        />
        <NotificationToggle 
          label="Low Stock Alerts" 
          description="Get notified when inventory drops below threshold."
          checked={notifyLowStock}
          onChange={setNotifyLowStock}
        />
        <NotificationToggle 
          label="Staff Meeting Reminders" 
          description="Reminders for upcoming scheduled staff meetings."
          checked={notifyMeeting}
          onChange={setNotifyMeeting}
        />
      </div>

      <div className="flex justify-end mt-4">
        <button 
          className="btn btn-primary" 
          onClick={handleSave} 
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}
