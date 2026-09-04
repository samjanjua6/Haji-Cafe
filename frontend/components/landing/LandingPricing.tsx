"use client";

import React, { useState } from "react";
import { Check, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

interface LandingPricingProps {
  onOpenAuth: (tab: "login" | "register") => void;
}

export default function LandingPricing({ onOpenAuth }: LandingPricingProps) {
  const [annual, setAnnual] = useState(true);

  const tiers = [
    {
      name: "Starter Cafe",
      badge: "SINGLE OUTLET",
      priceMonthly: 29,
      priceAnnual: 24,
      desc: "Perfect for single-location specialty coffee shops, kiosks, and food trucks.",
      features: [
        "1 Cafe Branch Location",
        "Unlimited Menu Items & Categories",
        "Fast POS Billing & Receipt Printing",
        "Basic Inventory & Raw Ingredient Tracking",
        "Standard Daily Sales Summary",
        "Email Support (support@mychatbot.codes)",
      ],
      popular: false,
      buttonText: "Start 14-Day Free Trial",
    },
    {
      name: "Growth Pro",
      badge: "MOST POPULAR",
      priceMonthly: 79,
      priceAnnual: 64,
      desc: "Engineered for high-volume cafes and expanding boutique coffee chains.",
      features: [
        "Up to 3 Cafe Branches",
        "Hands-Free Voice AI Order Assistant",
        "Automated Low-Stock Threshold Alerts",
        "Predictive Sales Analytics & Forecasting",
        "1-Click PDF & Excel Reports Export",
        "Role-Based Staff Access (Admin, Manager, Barista)",
        "Priority Support (Email & Phone)",
      ],
      popular: true,
      buttonText: "Claim Pro Free Trial",
    },
    {
      name: "Franchise Enterprise",
      badge: "UNLIMITED SCALE",
      priceMonthly: 199,
      priceAnnual: 159,
      desc: "For multi-location cafe groups and nationwide franchise operations.",
      features: [
        "Unlimited Cafe Branches & Outlets",
        "Enterprise Multi-Branch Revenue Analytics",
        "Custom Voice AI Workflows & Modifiers",
        "Dedicated Account Specialist",
        "24/7 Phone & Email VIP Support",
        "Full Security Audit Logs & 99.99% SLA",
      ],
      popular: false,
      buttonText: "Get Enterprise Access",
    },
  ];

  return (
    <section
      id="pricing"
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
        {/* Header */}
        <div style={{ textAlign: "center", maxWidth: "800px", margin: "0 auto 48px auto" }}>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 800,
              color: "var(--text-primary)",
              lineHeight: 1.2,
              marginBottom: "16px",
            }}
          >
            Simple Plans for <span className="landing-gradient-text">Cafes of Any Size</span>
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "var(--text-muted)",
              lineHeight: 1.6,
              marginBottom: "28px",
            }}
          >
            All plans include a full 14-day free trial. No credit card required to start.
          </p>

          {/* Billing Switcher */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              backgroundColor: "var(--bg-surface)",
              padding: "6px 14px",
              borderRadius: "99px",
              border: "1px solid var(--border)",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: !annual ? "var(--text-primary)" : "var(--text-muted)",
                cursor: "pointer",
              }}
              onClick={() => setAnnual(false)}
            >
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              type="button"
              style={{
                width: "44px",
                height: "24px",
                borderRadius: "99px",
                backgroundColor: annual ? "var(--accent)" : "var(--border)",
                border: "none",
                cursor: "pointer",
                position: "relative",
                transition: "background-color 0.2s",
              }}
            >
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  backgroundColor: "#0f172a",
                  position: "absolute",
                  top: "3px",
                  left: annual ? "23px" : "3px",
                  transition: "left 0.2s ease",
                }}
              />
            </button>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: annual ? "var(--text-primary)" : "var(--text-muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              onClick={() => setAnnual(true)}
            >
              Annual
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  backgroundColor: "var(--success-glow)",
                  color: "var(--success)",
                  padding: "2px 6px",
                  borderRadius: "6px",
                  border: "1px solid var(--success)33",
                }}
              >
                SAVE 20%
              </span>
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "28px",
            alignItems: "stretch",
          }}
        >
          {tiers.map((t, idx) => {
            const price = annual ? t.priceAnnual : t.priceMonthly;
            return (
              <div
                key={idx}
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderRadius: "24px",
                  border: t.popular ? "2px solid var(--accent)" : "1px solid var(--border)",
                  padding: "36px 28px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                  boxShadow: t.popular ? "0 15px 40px var(--accent-glow)" : "none",
                  transform: t.popular ? "scale(1.02)" : "none",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
              >
                {t.popular && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-13px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      backgroundColor: "var(--accent)",
                      color: "#0f172a",
                      fontSize: "11px",
                      fontWeight: 800,
                      padding: "4px 14px",
                      borderRadius: "99px",
                      letterSpacing: "0.05em",
                      boxShadow: "0 2px 10px var(--accent-glow)",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <Sparkles size={11} /> RECOMMENDED FOR MOST CAFES
                    </span>
                  </div>
                )}

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <h3 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                      {t.name}
                    </h3>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        backgroundColor: "var(--bg-card)",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        color: "var(--text-muted)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {t.badge}
                    </span>
                  </div>

                  <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: "20px" }}>
                    {t.desc}
                  </p>

                  <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "24px" }}>
                    <span style={{ fontSize: "42px", fontWeight: 900, color: "var(--text-primary)" }}>
                      ${price}
                    </span>
                    <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                      / month {annual ? "(billed annually)" : ""}
                    </span>
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid var(--border)",
                      paddingTop: "20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      marginBottom: "28px",
                    }}
                  >
                    {t.features.map((f, fIdx) => (
                      <div key={fIdx} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "13px" }}>
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            backgroundColor: "var(--accent-muted)",
                            color: "var(--accent)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: "2px",
                          }}
                        >
                          <Check size={11} strokeWidth={3} />
                        </div>
                        <span style={{ color: "var(--text-primary)", lineHeight: 1.4 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => onOpenAuth("register")}
                  type="button"
                  className={t.popular ? "btn btn-primary" : "btn btn-ghost"}
                  style={{
                    width: "100%",
                    padding: "13px",
                    borderRadius: "12px",
                    fontWeight: 700,
                    fontSize: "14px",
                  }}
                >
                  {t.buttonText} <ArrowRight size={15} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
