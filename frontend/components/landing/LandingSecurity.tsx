"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  Key,
  Database,
  History,
  FileCheck,
  UserCheck,
  Check,
  X,
  Sparkles,
  Server,
  Zap,
} from "lucide-react";

type RoleKey = "SUPER_ADMIN" | "CAFE_OWNER" | "BRANCH_MANAGER" | "CASHIER" | "KITCHEN_STAFF";

interface RolePermissionInfo {
  title: string;
  badge: string;
  badgeColor: string;
  scope: string;
  desc: string;
  allowed: string[];
  restricted: string[];
}

const ROLES_INFO: Record<RoleKey, RolePermissionInfo> = {
  SUPER_ADMIN: {
    title: "Super Admin",
    badge: "GLOBAL PRIVILEGE",
    badgeColor: "var(--danger)",
    scope: "System-Wide (All Cafes & Tenancies)",
    desc: "Platform administrator with full governance over multi-tenant franchises, cafe lifecycle archiving, and global user role promotions.",
    allowed: [
      "Create, archive & restore cafes across the platform",
      "Assign global & tenant-scoped user roles",
      "Inspect complete multi-tenant audit logs",
      "Access global telemetry & system configuration",
    ],
    restricted: [],
  },
  CAFE_OWNER: {
    title: "Cafe Franchise Owner",
    badge: "FRANCHISE OVERSIGHT",
    badgeColor: "var(--warning)",
    scope: "Assigned Cafe Franchise & All Its Branches",
    desc: "Franchise principal overseeing brand menu catalog, branch expansions, consolidated revenue analytics, and manager appointments.",
    allowed: [
      "Manage master menu catalog & category hierarchies",
      "Create & configure branch locations and tax settings",
      "View consolidated multi-branch financial reports & PDF exports",
      "Appoint & manage branch managers and cashier staff",
    ],
    restricted: [
      "Cannot access other cafe brands or platform infrastructure",
    ],
  },
  BRANCH_MANAGER: {
    title: "Branch Manager",
    badge: "LOCATION SCOPED",
    badgeColor: "var(--info)",
    scope: "Assigned Physical Branch Location",
    desc: "Location operator managing day-to-day inventory levels, localized price overrides, daily shifts, and localized stock history.",
    allowed: [
      "Perform stock restocks & record ingredient shrinkage",
      "Set branch-specific price overrides & low-stock thresholds",
      "View branch daily sales volume & ticket breakdown",
      "Oversee kitchen order flow & cashier shifts",
    ],
    restricted: [
      "Cannot modify franchise-wide master recipes",
      "Cannot view financial records of other branch locations",
    ],
  },
  CASHIER: {
    title: "Cashier & Counter Staff",
    badge: "POS BILLING ONLY",
    badgeColor: "var(--accent)",
    scope: "Assigned Branch POS Register",
    desc: "Front-of-house counter staff dedicated to rapid order entry, modifier selections, bill splits, and thermal receipt printing.",
    allowed: [
      "Create dine-in, takeaway, and delivery orders",
      "Apply drink modifiers & print thermal receipts",
      "View personal shift order tally",
      "Use Voice AI counter order input",
    ],
    restricted: [
      "Cannot override base prices or delete menu items",
      "Cannot alter stock counts or view profit margins",
      "Zero access to management audit logs",
    ],
  },
  KITCHEN_STAFF: {
    title: "Kitchen & Barista Staff",
    badge: "KDS WORKFLOW ONLY",
    badgeColor: "var(--success)",
    scope: "Assigned Branch Kitchen Display",
    desc: "Back-of-house team dedicated strictly to order fulfillment, preparation timers, priority tags, and item completion notifications.",
    allowed: [
      "View real-time incoming kitchen ticket queue",
      "Update order preparation state (In Prep ➔ Ready to Serve)",
      "Receive audio chime announcements for rush tickets",
      "Filter by station (Espresso Bar, Bakery, Grill)",
    ],
    restricted: [
      "Zero access to cashier billing or customer pricing",
      "Cannot modify recipes, taxes, or branch settings",
      "Zero access to sales revenue figures",
    ],
  },
};

export default function LandingSecurity() {
  const [activeRole, setActiveRole] = useState<RoleKey>("CAFE_OWNER");

  const pillars = [
    {
      icon: Key,
      title: "Dual-Token Authentication (JWT)",
      desc: "15-minute cryptographically signed access tokens coupled with rotating refresh tokens and instant multi-session revocation.",
      badge: "RFC 7519",
    },
    {
      icon: UserCheck,
      title: "Multi-Tenant Scoped RBAC",
      desc: "Strict database query boundaries prevent cross-tenant data access. Staff cannot access unauthorized branch records.",
      badge: "ZERO TRUST",
    },
    {
      icon: History,
      title: "Immutable Purchase Price Locking",
      desc: "Historical purchase prices are locked at order creation (`price_at_purchase`). Future menu price adjustments never distort past tax or revenue reports.",
      badge: "AUDIT PROOF",
    },
    {
      icon: Database,
      title: "PostgreSQL ACID Reliability",
      desc: "Prisma ORM transactions guarantee relational consistency, foreign key integrity, and zero phantom stock decrements.",
      badge: "ACID SAFE",
    },
    {
      icon: Lock,
      title: "256-Bit Encrypted WebRTC & WSS",
      desc: "LiveKit voice streams and KDS WebSocket connections are secured with end-to-end TLS 1.3 encryption.",
      badge: "AES-256",
    },
    {
      icon: FileCheck,
      title: "Chronological System Audit Trail",
      desc: "Every critical action—stock adjustments, price modifications, and role updates—is permanently recorded with user ID and timestamp.",
      badge: "COMPLIANCE",
    },
  ];

  const currentRoleInfo = ROLES_INFO[activeRole];

  return (
    <section
      id="security"
      style={{
        padding: "60px 20px",
        backgroundColor: "var(--bg-card)",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        position: "relative",
      }}
    >
      <div
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
        }}
      >
        {/* Section Header */}
        <div style={{ textAlign: "center", maxWidth: "840px", margin: "0 auto 56px auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 14px",
              borderRadius: "99px",
              backgroundColor: "var(--accent-muted)",
              color: "var(--accent)",
              fontSize: "12px",
              fontWeight: 700,
              marginBottom: "16px",
              border: "1px solid var(--accent)",
            }}
          >
            <ShieldCheck size={14} /> ENTERPRISE SECURITY &amp; RBAC ARCHITECTURE
          </div>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 800,
              color: "var(--text-primary)",
              lineHeight: 1.2,
              marginBottom: "16px",
            }}
          >
            Engineered for <span className="landing-gradient-text">Mission-Critical Integrity &amp; Security</span>
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            From strict multi-tenant role isolation to immutable financial purchase records, Haji Cafe protects your
            cafe franchise with banking-grade compliance standards.
          </p>
        </div>

        {/* Interactive Role-Based Access Control (RBAC) Permission Matrix */}
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "24px",
            padding: "32px",
            marginBottom: "48px",
            boxShadow: "0 15px 40px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", marginBottom: "4px" }}>
              Interactive Security Matrix
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
              Select a Role to Inspect Exact Scoped Permissions:
            </h3>
          </div>

          {/* Role Tabs */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              marginBottom: "24px",
            }}
          >
            {(Object.keys(ROLES_INFO) as RoleKey[]).map((r) => {
              const info = ROLES_INFO[r];
              const isSelected = activeRole === r;
              return (
                <button
                  key={r}
                  onClick={() => setActiveRole(r)}
                  type="button"
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                    backgroundColor: isSelected ? "var(--bg-card)" : "transparent",
                    color: isSelected ? "var(--text-primary)" : "var(--text-muted)",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: isSelected ? "0 2px 10px var(--accent-glow)" : "none",
                  }}
                >
                  {info.title}
                </button>
              );
            })}
          </div>

          {/* Active Role Details Card */}
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              borderRadius: "16px",
              border: "1px solid var(--border)",
              padding: "24px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "24px",
            }}
          >
            {/* Left: Role Scope & Description */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <span style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)" }}>
                  {currentRoleInfo.title}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    backgroundColor: "var(--bg-surface)",
                    color: currentRoleInfo.badgeColor,
                    padding: "3px 8px",
                    borderRadius: "99px",
                    border: `1px solid ${currentRoleInfo.badgeColor}44`,
                  }}
                >
                  {currentRoleInfo.badge}
                </span>
              </div>

              <div style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 600, marginBottom: "12px" }}>
                Scope: {currentRoleInfo.scope}
              </div>

              <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
                {currentRoleInfo.desc}
              </p>
            </div>

            {/* Right: Allowed vs Restricted Permissions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Allowed Actions */}
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--success)", textTransform: "uppercase", marginBottom: "8px" }}>
                  ✓ Permitted Operational Actions:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {currentRoleInfo.allowed.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-primary)" }}>
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          backgroundColor: "var(--success-glow)",
                          color: "var(--success)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Check size={10} strokeWidth={3} />
                      </div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Restricted Actions */}
              {currentRoleInfo.restricted.length > 0 && (
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--danger)", textTransform: "uppercase", marginBottom: "8px" }}>
                    ✕ Enforced Boundary Protections:
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {currentRoleInfo.restricted.map((item, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            backgroundColor: "var(--danger-glow)",
                            color: "var(--danger)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <X size={10} strokeWidth={3} />
                        </div>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 6 Enterprise Security Pillars Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
          }}
        >
          {pillars.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderRadius: "18px",
                  border: "1px solid var(--border)",
                  padding: "26px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "12px",
                        backgroundColor: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        color: "var(--accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={22} />
                    </div>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        backgroundColor: "var(--bg-card)",
                        color: "var(--text-muted)",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {p.badge}
                    </span>
                  </div>

                  <h4 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>
                    {p.title}
                  </h4>
                  <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.55, margin: 0 }}>
                    {p.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
