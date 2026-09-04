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
} from "lucide-react";

export default function LandingFeatures() {
  const features = [
    {
      icon: Zap,
      title: "Smart Counter POS & Fast Billing",
      desc: "Designed for speed during rush hours. Custom drink modifiers, split checks, Dine-in/Takeaway modes, and instant receipt generation.",
      bullets: ["Custom modifiers (Oat milk, sugar free)", "1-tap order dispatch to kitchen", "Thermal receipt & e-invoice print"],
      badge: "ULTRA FAST",
      color: "#f59e0b",
      colorLight: "rgba(245, 158, 11, 0.12)",
    },
    {
      icon: Store,
      title: "Multi-Branch & Franchise Control",
      desc: "Manage multiple cafes, kiosks, and drive-throughs from a unified portal. Synchronize menu pricing and monitor sales per location.",
      bullets: ["Instant branch switching", "Centralized master menu catalog", "Location-specific taxes and currencies"],
      badge: "MULTI-LOCATION",
      color: "#3b82f6",
      colorLight: "rgba(59, 130, 246, 0.12)",
    },
    {
      icon: Mic,
      title: "Live Voice AI Assistant",
      desc: "Allow staff to take voice orders, inquire about daily revenue, and check inventory hands-free without leaving the coffee station.",
      bullets: ["Hands-free voice order entry", "Natural language revenue queries", "Automated stock availability alerts"],
      badge: "VOICE AI",
      color: "#8b5cf6",
      colorLight: "rgba(139, 92, 246, 0.12)",
    },
    {
      icon: Package,
      title: "Smart Inventory & Low-Stock Alerts",
      desc: "Keep coffee beans, syrups, cups, and dairy strictly accounted for with automatic recipe deductions and low-stock threshold warnings.",
      bullets: ["Automated ingredient decrementing", "Custom reorder alert thresholds", "Waste & shrinkage reduction logs"],
      badge: "ZERO STOCKOUTS",
      color: "#10b981",
      colorLight: "rgba(16, 185, 129, 0.12)",
    },
    {
      icon: TrendingUp,
      title: "Predictive Analytics & Reports",
      desc: "Make data-driven menu adjustments. Gain instant visibility into daily gross revenue, peak business hours, and best-performing items.",
      bullets: ["Historical & predictive revenue charts", "Top 10 best-selling items ranking", "1-click Excel & PDF export reports"],
      badge: "DEEP INSIGHTS",
      color: "#06b6d4",
      colorLight: "rgba(6, 182, 212, 0.12)",
    },
    {
      icon: ShieldCheck,
      title: "Role-Based Security & Audit Logs",
      desc: "Protect sensitive cafe finances with fine-grained access control for Super Admins, Owners, Branch Managers, Cashiers, and Baristas.",
      bullets: ["Granular role permissions", "Complete chronological audit trail", "Google 1-Tap Sign-In & Bank-Grade Security"],
      badge: "ENTERPRISE GRADE",
      color: "#ec4899",
      colorLight: "rgba(236, 72, 153, 0.12)",
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
                  backgroundImage: `radial-gradient(ellipse 260px 180px at 100% 0%, ${f.colorLight}, transparent 70%)`,
                  border: "1px solid var(--border)",
                  borderRadius: "24px",
                  padding: "32px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                  position: "relative",
                  boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.04)",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${f.color}60`;
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow = `0 20px 40px -12px ${f.color}25, 0 0 0 1px ${f.color}30`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 20px -2px rgba(0, 0, 0, 0.04)";
                }}
              >
                {/* Top Subtle Color Accent Bar */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 32,
                    right: 32,
                    height: "3px",
                    background: `linear-gradient(90deg, transparent, ${f.color}, transparent)`,
                    opacity: 0.7,
                  }}
                />

                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "22px",
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: "16px",
                        background: `linear-gradient(135deg, ${f.color}20, ${f.color}08)`,
                        border: `1px solid ${f.color}35`,
                        color: f.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: `0 8px 18px -4px ${f.color}30`,
                        transition: "transform 0.25s ease",
                      }}
                    >
                      <Icon size={24} strokeWidth={2.2} />
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        color: f.color,
                        backgroundColor: `${f.color}12`,
                        padding: "5px 12px",
                        borderRadius: "8px",
                        border: `1px solid ${f.color}28`,
                      }}
                    >
                      {f.badge}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: "20px",
                      fontWeight: 800,
                      color: "var(--text-primary)",
                      marginBottom: "10px",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {f.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "var(--text-muted)",
                      lineHeight: 1.6,
                      marginBottom: "24px",
                    }}
                  >
                    {f.desc}
                  </p>
                </div>

                <div
                  style={{
                    borderTop: "1px solid var(--border-subtle)",
                    paddingTop: "18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {f.bullets.map((b, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        fontSize: "13px",
                        color: "var(--text-primary)",
                      }}
                    >
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "6px",
                          backgroundColor: `${f.color}15`,
                          border: `1px solid ${f.color}30`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: f.color,
                          flexShrink: 0,
                        }}
                      >
                        <Check size={12} strokeWidth={3} />
                      </div>
                      <span style={{ fontWeight: 500 }}>{b}</span>
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
