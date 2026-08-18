"use client";

import { useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import ProfileTab from "./components/ProfileTab";
import SecurityTab from "./components/SecurityTab";
import NotificationsTab from "./components/NotificationsTab";
import IntegrationsTab from "./components/IntegrationsTab";
import DefaultsTab from "./components/DefaultsTab";
import { User, Shield, Bell, Blocks, Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  const { data: user, isLoading } = useCurrentUser();
  const [activeTab, setActiveTab] = useState("profile");

  if (isLoading) {
    return <div className="p-8">Loading settings...</div>;
  }

  if (!user) return null;

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "integrations", label: "Integrations", icon: Blocks },
    { id: "defaults", label: "Defaults", icon: SettingsIcon },
  ];

  return (
    <div style={{ padding: "32px", maxWidth: "1152px", margin: "0 auto" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and preferences</p>
      </div>

      <div style={{ display: "flex", gap: "32px", flexDirection: "row", flexWrap: "wrap" }}>
        {/* Sidebar */}
        <div style={{ width: "256px", flexShrink: 0 }}>
          <div className="card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    textAlign: "left",
                    background: isActive ? "var(--accent)" : "transparent",
                    color: isActive ? "#0f172a" : "var(--text-primary)",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: isActive ? 600 : 500,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "var(--bg-surface)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Panel */}
        <div style={{ flex: 1, minWidth: "300px" }}>
          {activeTab === "profile" && <ProfileTab user={user} />}
          {activeTab === "security" && <SecurityTab user={user} />}
          {activeTab === "notifications" && <NotificationsTab user={user} />}
          {activeTab === "integrations" && <IntegrationsTab user={user} />}
          {activeTab === "defaults" && <DefaultsTab user={user} />}
        </div>
      </div>
    </div>
  );
}
