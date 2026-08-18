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
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="card p-4 flex flex-col gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? "bg-[var(--accent-color)] text-white"
                      : "text-[var(--text-color)] hover:bg-[var(--sidebar-hover)]"
                  }`}
                >
                  <Icon size={18} />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Panel */}
        <div className="flex-1">
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
