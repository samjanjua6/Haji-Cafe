"use client";

import React from "react";
import {
  Zap,
  Store,
  Mic,
  Package,
  TrendingUp,
  ShieldCheck,
  Check,
  Sparkles,
} from "lucide-react";

export default function LandingFeatures() {
  const features = [
    {
      icon: Zap,
      title: "Smart Counter POS & Fast Billing",
      desc: "Designed for speed during rush hours. Custom drink modifiers, split checks, Dine-in/Takeaway modes, and instant receipt generation.",
      bullets: ["Custom modifiers (Oat milk, sugar free)", "1-tap order dispatch to kitchen", "Thermal receipt & e-invoice print"],
      badge: "ULTRA FAST",
      color: "var(--accent)",
    },
    {
      icon: Store,
      title: "Multi-Branch & Franchise Control",
      desc: "Manage multiple cafes, kiosks, and drive-throughs from a unified portal. Synchronize menu pricing and monitor sales per location.",
      bullets: ["Instant branch switching", "Centralized master menu catalog", "Location-specific taxes and currencies"],
      badge: "MULTI-LOCATION",
      color: "var(--info)",
    },
    {
      icon: Mic,
      title: "Live Voice AI Assistant",
      desc: "Powered by LiveKit WebRTC and Gemini. Allow staff to take voice orders, inquire about daily revenue, and check inventory hands-free.",
      bullets: ["Hands-free voice order entry", "Natural language revenue queries", "Automated stock availability alerts"],
      badge: "VOICE AI",
      color: "var(--warning)",
    },
    {
      icon: Package,
      title: "Smart Inventory & Low-Stock Alerts",
      desc: "Keep coffee beans, syrups, cups, and dairy strictly accounted for with automatic recipe deductions and low-stock threshold warnings.",
      bullets: ["Automated ingredient decrementing", "Custom reorder alert thresholds", "Waste & shrinkage reduction logs"],
      badge: "ZERO STOCKOUTS",
      color: "var(--success)",
    },
    {
      icon: TrendingUp,
      title: "Predictive Analytics & Reports",
      desc: "Make data-driven menu adjustments. Gain instant visibility into daily gross revenue, peak business hours, and best-performing items.",
      bullets: ["Historical & predictive revenue charts", "Top 10 best-selling items ranking", "1-click Excel & PDF export reports"],
      badge: "DEEP INSIGHTS",
      color: "var(--accent)",
    },
    {
      icon: ShieldCheck,
      title: "Role-Based Security & Audit Logs",
      desc: "Protect sensitive cafe finances with fine-grained access control for Super Admins, Owners, Branch Managers, Cashiers, and Baristas.",
      bullets: ["Granular role permissions", "Complete chronological audit trail", "Google OAuth & 256-bit token encryption"],
      badge: "ENTERPRISE GRADE",
      color: "var(--danger)",
    },
  ];

  return (
    <section
      id="features"
      style={{
        padding: "60px 20px",
        position: "relative",
      }}
    >
      <div
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", maxWidth: "800px", margin: "0 auto 56px auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 14px",
              borderRadius: "99px",
              backgroundColor: "var(--bg-surface)",
              color: "var(--accent)",
              fontSize: "12px",
              fontWeight: 700,
              marginBottom: "16px",
              border: "1px solid var(--border)",
            }}
          >
            <Sparkles size={14} /> COMPLETE CAFE MANAGEMENT PLATFORM
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
            Engineered for <span className="landing-gradient-text">High-Volume Cafe Excellence</span>
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            Say goodbye to fragmented software and clunky POS systems. Haji Cafe unifies point of sale, multi-branch
            oversight, inventory tracking, and voice intelligence into one seamless dashboard.
          </p>
        </div>

        {/* Feature Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: "24px",
          }}
        >
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "20px",
                  padding: "32px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.25s ease",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 12px 30px var(--accent-glow)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "20px",
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "14px",
                        backgroundColor: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        color: f.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={24} />
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        color: f.color,
                        backgroundColor: "var(--bg-surface)",
                        padding: "4px 10px",
                        borderRadius: "99px",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {f.badge}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: "19px",
                      fontWeight: 800,
                      color: "var(--text-primary)",
                      marginBottom: "10px",
                    }}
                  >
                    {f.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "var(--text-muted)",
                      lineHeight: 1.55,
                      marginBottom: "20px",
                    }}
                  >
                    {f.desc}
                  </p>
                </div>

                <div
                  style={{
                    borderTop: "1px solid var(--border-subtle)",
                    paddingTop: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {f.bullets.map((b, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "13px",
                        color: "var(--text-primary)",
                      }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          backgroundColor: "var(--accent-muted)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--accent)",
                          flexShrink: 0,
                        }}
                      >
                        <Check size={11} strokeWidth={3} />
                      </div>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
