"use client";

import React from "react";
import { Store, ShoppingBag, Zap, ShieldCheck } from "lucide-react";

export default function LandingStats() {
  const stats = [
    {
      icon: Store,
      value: "500+",
      label: "Active Cafes & Outlets",
      desc: "Trusted by specialty roasteries, bistros & multi-branch chains",
    },
    {
      icon: ShoppingBag,
      value: "1.5M+",
      label: "Orders Processed",
      desc: "Processed across dine-in counters, takeaway, and digital delivery",
    },
    {
      icon: Zap,
      value: "3.5x",
      label: "Faster Counter Billing",
      desc: "Cut customer wait times with rapid 1-tap POS & AI voice entry",
    },
    {
      icon: ShieldCheck,
      value: "99.99%",
      label: "Cloud POS Reliability",
      desc: "Instant real-time synchronization with secure encrypted backups",
    },
  ];

  return (
    <section
      style={{
        padding: "30px 20px 50px 20px",
        position: "relative",
      }}
    >
      <div
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
        }}
      >
        {/* Top 4 Scale Metric Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "20px",
          }}
        >
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={i}
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "18px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  transition: "all 0.2s ease",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 10px 25px var(--accent-glow)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "12px",
                    backgroundColor: "var(--accent-muted)",
                    color: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "4px",
                  }}
                >
                  <Icon size={22} />
                </div>
                <div
                  style={{
                    fontSize: "36px",
                    fontWeight: 900,
                    color: "var(--text-primary)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {stat.label}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--text-muted)",
                    lineHeight: 1.4,
                  }}
                >
                  {stat.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
