"use client";

import React from "react";
import { UserPlus, Coffee, Terminal, LineChart, Sparkles, ArrowRight } from "lucide-react";

interface LandingHowItWorksProps {
  onOpenAuth: (tab: "login" | "register") => void;
}

export default function LandingHowItWorks({ onOpenAuth }: LandingHowItWorksProps) {
  const steps = [
    {
      step: "01",
      icon: UserPlus,
      title: "Set Up Your Cafe & Branches",
      desc: "Register in 30 seconds. Define your cafe profile, branch locations, operating hours, and tax settings.",
    },
    {
      step: "02",
      icon: Coffee,
      title: "Add Menu Items & Recipes",
      desc: "Categorize coffees, teas, and pastries. Add customizable modifiers (milks, syrups) and raw ingredient tracking.",
    },
    {
      step: "03",
      icon: Terminal,
      title: "Launch POS & Voice Terminal",
      desc: "Run on any browser, tablet, or iPad. Tap items or speak voice commands to dispatch orders straight to kitchen printers.",
    },
    {
      step: "04",
      icon: LineChart,
      title: "Track Growth & Auto-Restock",
      desc: "Monitor live gross revenues, best-sellers, and low-stock alerts with predictive sales reports.",
    },
  ];

  return (
    <section
      id="how-it-works"
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
            <Sparkles size={14} /> SIMPLE ONBOARDING
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
            Get Your Cafe Operating in <span className="landing-gradient-text">4 Simple Steps</span>
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            No complex hardware setup or proprietary hardware terminals required. Run Haji Cafe on any device in
            minutes.
          </p>
        </div>

        {/* Steps Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "24px",
            position: "relative",
          }}
        >
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "20px",
                  padding: "32px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  position: "relative",
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
                {/* Step badge */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
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
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <span
                    style={{
                      fontSize: "24px",
                      fontWeight: 900,
                      color: "var(--text-faint)",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {s.step}
                  </span>
                </div>

                <div>
                  <h3
                    style={{
                      fontSize: "17px",
                      fontWeight: 800,
                      color: "var(--text-primary)",
                      marginBottom: "8px",
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--text-muted)",
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {s.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Onboarding CTA */}
        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <button
            onClick={() => onOpenAuth("register")}
            type="button"
            className="btn btn-primary"
            style={{
              padding: "12px 28px",
              borderRadius: "12px",
              fontWeight: 700,
              fontSize: "15px",
            }}
          >
            Start Your Cafe Setup in 2 Minutes <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
