"use client";

import React, { useState } from "react";
import { Calculator, Clock, DollarSign, TrendingUp, Sparkles, ArrowRight } from "lucide-react";

interface LandingCalculatorProps {
  onOpenAuth: (tab: "login" | "register") => void;
}

export default function LandingCalculator({ onOpenAuth }: LandingCalculatorProps) {
  const [dailyOrders, setDailyOrders] = useState<number>(240);
  const [branchCount, setBranchCount] = useState<number>(2);
  const [avgTicket, setAvgTicket] = useState<number>(6.5);

  const monthlyOrders = dailyOrders * branchCount * 30;
  const monthlyRevenue = monthlyOrders * avgTicket;
  const hoursSavedMonthly = Math.round((monthlyOrders * 28) / 3600); // 28 seconds saved per order
  const inventorySavings = Math.round(monthlyRevenue * 0.045); // 4.5% shrinkage reduction
  const laborValue = hoursSavedMonthly * 18; // ~$18/hr staff value
  const totalMonthlyBenefit = inventorySavings + laborValue;
  const annualBenefit = totalMonthlyBenefit * 12;

  return (
    <section
      id="calculator"
      style={{
        padding: "80px 24px",
        backgroundColor: "var(--bg-card)",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        position: "relative",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", maxWidth: "800px", margin: "0 auto 48px auto" }}>
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
            <Calculator size={14} /> ROI &amp; EFFICIENCY CALCULATOR
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
            Calculate Your <span className="landing-gradient-text">Time &amp; Profit Savings</span>
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            Adjust the sliders below based on your current cafe operations to calculate the immediate time and revenue
            benefits of switching to Haji Cafe POS.
          </p>
        </div>

        {/* Calculator Box */}
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "24px",
            padding: "36px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "40px",
            alignItems: "center",
            boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
          }}
        >
          {/* Sliders Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            {/* Slider 1: Daily Orders */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
                  Daily Orders per Branch
                </label>
                <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--accent)" }}>
                  {dailyOrders} orders/day
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="800"
                step="10"
                value={dailyOrders}
                onChange={(e) => setDailyOrders(Number(e.target.value))}
                style={{
                  width: "100%",
                  accentColor: "var(--accent)",
                  cursor: "pointer",
                  height: "6px",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-faint)", marginTop: "4px" }}>
                <span>30 (Small Kiosk)</span>
                <span>400 (Busy Cafe)</span>
                <span>800 (High Volume)</span>
              </div>
            </div>

            {/* Slider 2: Number of Branches */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
                  Number of Cafe Branches
                </label>
                <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--accent)" }}>
                  {branchCount} {branchCount === 1 ? "Location" : "Locations"}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={branchCount}
                onChange={(e) => setBranchCount(Number(e.target.value))}
                style={{
                  width: "100%",
                  accentColor: "var(--accent)",
                  cursor: "pointer",
                  height: "6px",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-faint)", marginTop: "4px" }}>
                <span>1 Branch</span>
                <span>10 Branches</span>
                <span>20+ Enterprise</span>
              </div>
            </div>

            {/* Slider 3: Average Ticket Price */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
                  Average Ticket / Order Value
                </label>
                <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--accent)" }}>
                  ${avgTicket.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="25"
                step="0.5"
                value={avgTicket}
                onChange={(e) => setAvgTicket(Number(e.target.value))}
                style={{
                  width: "100%",
                  accentColor: "var(--accent)",
                  cursor: "pointer",
                  height: "6px",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-faint)", marginTop: "4px" }}>
                <span>$3.00</span>
                <span>$12.00</span>
                <span>$25.00+</span>
              </div>
            </div>
          </div>

          {/* Results Output Column */}
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              borderRadius: "20px",
              border: "1px solid var(--border)",
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Estimated Operational ROI
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {/* Metric 1 */}
              <div
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderRadius: "14px",
                  padding: "16px",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent)", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                  <Clock size={14} /> Time Saved / Month
                </div>
                <div style={{ fontSize: "26px", fontWeight: 900, color: "var(--text-primary)" }}>
                  {hoursSavedMonthly} hrs
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Faster billing &amp; inventory sync
                </div>
              </div>

              {/* Metric 2 */}
              <div
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderRadius: "14px",
                  padding: "16px",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--success)", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                  <DollarSign size={14} /> Waste Saved / Mo
                </div>
                <div style={{ fontSize: "26px", fontWeight: 900, color: "var(--text-primary)" }}>
                  ${inventorySavings.toLocaleString()}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Low-stock &amp; spoilage prevention
                </div>
              </div>
            </div>

            {/* Total Annual Value Card */}
            <div
              style={{
                backgroundColor: "rgba(245, 158, 11, 0.08)",
                border: "1px solid var(--accent)",
                borderRadius: "16px",
                padding: "20px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", marginBottom: "4px" }}>
                Total Estimated Annual Value Created
              </div>
              <div
                style={{
                  fontSize: "36px",
                  fontWeight: 900,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                +${annualBenefit.toLocaleString()}
                <span style={{ fontSize: "16px", color: "var(--text-muted)", fontWeight: 500 }}> / year</span>
              </div>
            </div>

            <button
              onClick={() => onOpenAuth("register")}
              type="button"
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                fontWeight: 700,
                fontSize: "14px",
                boxShadow: "0 4px 16px var(--accent-glow)",
              }}
            >
              Unlock These Savings - Start Free <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
