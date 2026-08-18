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
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: "1px solid var(--sidebar-hover)" }}>
      <div>
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: "14px", opacity: 0.7 }}>{description}</div>
      </div>
      <label style={{ cursor: "pointer" }}>
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
    <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px" }}>Notifications</h2>
        <p style={{ color: "var(--text-color)", fontSize: "14px", opacity: 0.8, margin: 0 }}>
          Manage how and when you receive alerts.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
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

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
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
