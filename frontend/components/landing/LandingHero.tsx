"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  Coffee,
  CheckCircle2,
  Mic,
  Receipt,
  Store,
  Layers,
  TrendingUp,
  Zap,
  Clock,
  Volume2,
  ChefHat,
  Monitor,
  BarChart3,
  Search,
  Check,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";

interface LandingHeroProps {
  onOpenAuth: (tab: "login" | "register") => void;
}

type ShowcaseTab = "pos" | "kds" | "analytics" | "voice";

export default function LandingHero({ onOpenAuth }: LandingHeroProps) {
  const [activeTab, setActiveTab] = useState<ShowcaseTab>("pos");
  const [selectedCategory, setSelectedCategory] = useState("All Coffees");
  const [searchQuery, setSearchQuery] = useState("");

  const playKitchenBell = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      toast.success("🔔 KDS Kitchen Bell Chime Played!", { icon: "🛎️" });
    } catch {
      toast.success("🔔 Order Bell Triggered!");
    }
  };

  const posItems = [
    { name: "Spanish Latte", category: "Coffee", price: 4.5, icon: "☕", stock: "94 in stock", popular: true },
    { name: "Iced Caramel Macchiato", category: "Coffee", price: 5.2, icon: "🧊", stock: "68 in stock", popular: true },
    { name: "Butter Croissant", category: "Bakery", price: 3.5, icon: "🥐", stock: "32 in stock", popular: false },
    { name: "Blueberry Cheesecake", category: "Bakery", price: 6.0, icon: "🍰", stock: "18 in stock", popular: false },
    { name: "Artisan Turkey Panini", category: "Snacks", price: 7.5, icon: "🥪", stock: "24 in stock", popular: false },
    { name: "Matcha Fusion Latte", category: "Tea", price: 5.0, icon: "🍵", stock: "45 in stock", popular: true },
  ];

  const filteredItems = posItems.filter(
    (item) =>
      (selectedCategory === "All Coffees" || item.category === selectedCategory || (selectedCategory === "Popular" && item.popular)) &&
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section
      style={{
        position: "relative",
        padding: "36px 24px 60px 24px",
        overflow: "hidden",
      }}
    >
      {/* Ambient background glow effects */}
      <div
        style={{
          position: "absolute",
          top: "0%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "900px",
          height: "380px",
          background: "radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 70%)",
          filter: "blur(60px)",
          opacity: 0.5,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Main Hero Header */}
        <div style={{ textAlign: "center", maxWidth: "860px", margin: "0 auto 36px auto" }}>
          {/* Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "5px 14px",
              borderRadius: "99px",
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--accent)",
              color: "var(--accent)",
              fontSize: "12px",
              fontWeight: 700,
              marginBottom: "16px",
              boxShadow: "0 2px 12px var(--accent-glow)",
              animation: "fadeIn 0.5s ease-out",
            }}
          >
            <Sparkles size={14} /> All-in-One Cloud POS • Kitchen Display • Live Voice AI
          </div>

          {/* Heading */}
          <h1
            style={{
              fontSize: "clamp(26px, 4vw, 46px)",
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              marginBottom: "16px",
              color: "var(--text-primary)",
            }}
          >
            Run Your Entire Cafe &amp; Franchise with{" "}
            <span className="landing-gradient-text">Lightning POS &amp; Live Voice AI</span>
          </h1>

          {/* Subheading */}
          <p
            style={{
              fontSize: "clamp(14px, 1.8vw, 16px)",
              color: "var(--text-muted)",
              lineHeight: 1.6,
              maxWidth: "700px",
              margin: "0 auto 24px auto",
            }}
          >
            The enterprise-ready operating system built for single coffee bars, artisanal bakeries, and expanding
            multi-branch franchises. Accelerate cashier billing, eliminate stockouts with predictive alerts, and coordinate
            kitchens in real time.
          </p>

          {/* CTA Buttons */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <button
              onClick={() => onOpenAuth("register")}
              type="button"
              className="btn btn-primary"
              style={{
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: 700,
                borderRadius: "10px",
                boxShadow: "0 4px 16px var(--accent-glow)",
              }}
            >
              Start Free 14-Day Trial <ArrowRight size={16} />
            </button>
            <button
              onClick={() => onOpenAuth("login")}
              type="button"
              className="btn btn-ghost"
              style={{
                padding: "12px 20px",
                fontSize: "14px",
                fontWeight: 600,
                borderRadius: "10px",
              }}
            >
              <Store size={16} color="var(--accent)" /> Sign In to POS Dashboard
            </button>
          </div>

          {/* Trust Badges */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: "18px",
              color: "var(--text-muted)",
              fontSize: "12.5px",
              fontWeight: 500,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={15} color="var(--success)" /> 100% Browser &amp; Tablet Ready
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={15} color="var(--success)" /> Real-Time KDS WebSockets
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={15} color="var(--success)" /> LiveKit Voice WebRTC (48kHz)
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={15} color="var(--success)" /> Scoped Multi-Branch Security
            </div>
          </div>
        </div>

        {/* Interactive 4-View Live Product Tour Showcase */}
        <div
          id="product-tour"
          style={{
            maxWidth: "1160px",
            margin: "0 auto",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
            position: "relative",
          }}
        >
          {/* Top Bar with 4 Showcase Tabs */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              paddingBottom: "18px",
              borderBottom: "1px solid var(--border)",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "var(--bg-surface)",
                  padding: "6px 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                }}
              >
                <Store size={16} color="var(--accent)" />
                <span style={{ fontSize: "13px", fontWeight: 700 }}>Haji Cafe - Downtown Branch #01</span>
              </div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  color: "var(--success)",
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: "var(--success)",
                    boxShadow: "0 0 8px var(--success)",
                  }}
                />
                Live Network Active
              </span>
            </div>

            {/* 4-View Switcher Tabs */}
            <div
              style={{
                display: "flex",
                backgroundColor: "var(--bg-surface)",
                borderRadius: "12px",
                padding: "3px",
                border: "1px solid var(--border)",
                gap: "2px",
              }}
            >
              {[
                { id: "pos", label: "Counter POS", icon: Monitor },
                { id: "kds", label: "Kitchen Display (KDS)", icon: ChefHat },
                { id: "analytics", label: "Executive Analytics", icon: BarChart3 },
                { id: "voice", label: "Live Voice AI", icon: Mic },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as ShowcaseTab)}
                    type="button"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 14px",
                      borderRadius: "9px",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 700,
                      backgroundColor: active ? "var(--accent)" : "transparent",
                      color: active ? "#0f172a" : "var(--text-muted)",
                      transition: "all 0.2s ease",
                      boxShadow: active ? "0 2px 8px var(--accent-glow)" : "none",
                    }}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB 1: POS REGISTER VIEW */}
          {activeTab === "pos" && (
            <div style={{ animation: "fadeIn 0.2s ease-out" }}>
              {/* POS Top Control Bar */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, maxWidth: "320px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      padding: "8px 12px",
                      width: "100%",
                    }}
                  >
                    <Search size={15} color="var(--text-muted)" />
                    <input
                      type="text"
                      placeholder="Search menu catalog..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        fontSize: "13px",
                        color: "var(--text-primary)",
                        padding: 0,
                      }}
                    />
                  </div>
                </div>

                {/* Category Filter Pills */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {["All Coffees", "Popular", "Bakery", "Tea", "Snacks"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      type="button"
                      style={{
                        padding: "5px 12px",
                        borderRadius: "8px",
                        border: selectedCategory === cat ? "1px solid var(--accent)" : "1px solid var(--border)",
                        backgroundColor: selectedCategory === cat ? "var(--accent-muted)" : "var(--bg-surface)",
                        color: selectedCategory === cat ? "var(--accent)" : "var(--text-muted)",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* POS Menu Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: "14px",
                  marginBottom: "20px",
                }}
              >
                {filteredItems.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "16px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "8px",
                      transition: "all 0.2s ease",
                      position: "relative",
                    }}
                  >
                    {item.popular && (
                      <span
                        style={{
                          position: "absolute",
                          top: "10px",
                          right: "10px",
                          fontSize: "9px",
                          fontWeight: 800,
                          backgroundColor: "var(--accent-muted)",
                          color: "var(--accent)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          border: "1px solid var(--accent)",
                        }}
                      >
                        TOP SELLER
                      </span>
                    )}

                    <div style={{ fontSize: "32px", marginBottom: "4px" }}>{item.icon}</div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                        {item.stock}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderTop: "1px solid var(--border-subtle)",
                        paddingTop: "10px",
                        marginTop: "4px",
                      }}
                    >
                      <span style={{ fontSize: "15px", fontWeight: 900, color: "var(--accent)" }}>
                        ${item.price.toFixed(2)}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          backgroundColor: "var(--bg-card)",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          color: "var(--text-muted)",
                        }}
                      >
                        POS Ready
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* POS Status Footer */}
              <div
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderRadius: "12px",
                  padding: "12px 18px",
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px", color: "var(--text-muted)" }}>
                  <span>
                    Shift Active: <strong>Cashier Ali</strong>
                  </span>
                  <span>•</span>
                  <span>Terminal: <strong>Register #01 (Thermal ESC/POS Linked)</strong></span>
                </div>
                <button
                  onClick={() => onOpenAuth("login")}
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 700 }}
                >
                  Launch Full POS Screen <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: KITCHEN DISPLAY SYSTEM (KDS) VIEW */}
          {activeTab === "kds" && (
            <div style={{ animation: "fadeIn 0.2s ease-out" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <ChefHat size={18} color="var(--accent)" />
                  <span style={{ fontSize: "14px", fontWeight: 700 }}>Live Kitchen Ticket Stream</span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      backgroundColor: "var(--success-glow)",
                      color: "var(--success)",
                      padding: "2px 8px",
                      borderRadius: "99px",
                      border: "1px solid var(--success)33",
                    }}
                  >
                    ● 3 Tickets Active
                  </span>
                </div>

                <button
                  onClick={playKitchenBell}
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ gap: "6px", fontSize: "12px" }}
                >
                  <Volume2 size={14} color="var(--accent)" /> Test Kitchen Bell
                </button>
              </div>

              {/* Kitchen Tickets Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "16px",
                  marginBottom: "20px",
                }}
              >
                {/* Ticket 1 */}
                <div
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--warning)",
                    borderRadius: "16px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "15px", fontWeight: 800 }}>Ticket #4092</span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          backgroundColor: "var(--warning-glow)",
                          color: "var(--warning)",
                          padding: "3px 8px",
                          borderRadius: "6px",
                        }}
                      >
                        IN PREPARATION
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
                      <Clock size={13} color="var(--warning)" /> 02:45m elapsed • Table #06 (Dine-in)
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: "var(--text-primary)" }}>
                      <div style={{ fontWeight: 600 }}>• 2x Spanish Latte (Oat Milk)</div>
                      <div style={{ fontWeight: 600 }}>• 1x Butter Croissant (Warmed)</div>
                    </div>
                  </div>
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px", fontSize: "11px", color: "var(--text-faint)" }}>
                    Assigned: Barista Station 1
                  </div>
                </div>

                {/* Ticket 2 */}
                <div
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--danger)",
                    borderRadius: "16px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "15px", fontWeight: 800 }}>Ticket #4093</span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          backgroundColor: "var(--danger-glow)",
                          color: "var(--danger)",
                          padding: "3px 8px",
                          borderRadius: "6px",
                        }}
                      >
                        URGENT RUSH
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
                      <Clock size={13} color="var(--danger)" /> 04:12m elapsed • Takeaway #108
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: "var(--text-primary)" }}>
                      <div style={{ fontWeight: 600 }}>• 1x Iced Caramel Macchiato</div>
                      <div style={{ fontWeight: 600 }}>• 1x Artisan Turkey Panini (Toasted)</div>
                    </div>
                  </div>
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px", fontSize: "11px", color: "var(--text-faint)" }}>
                    Assigned: Kitchen Grill &amp; Espresso
                  </div>
                </div>

                {/* Ticket 3 */}
                <div
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--success)",
                    borderRadius: "16px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "15px", fontWeight: 800 }}>Ticket #4091</span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          backgroundColor: "var(--success-glow)",
                          color: "var(--success)",
                          padding: "3px 8px",
                          borderRadius: "6px",
                        }}
                      >
                        READY TO SERVE
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
                      <CheckCircle2 size={13} color="var(--success)" /> Completed in 01:50m • Table #02
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: "var(--text-primary)" }}>
                      <div style={{ fontWeight: 600 }}>• 1x Matcha Fusion Latte</div>
                      <div style={{ fontWeight: 600 }}>• 1x Blueberry Cheesecake</div>
                    </div>
                  </div>
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px", fontSize: "11px", color: "var(--text-faint)" }}>
                    Dispatched to Service Counter
                  </div>
                </div>
              </div>

              {/* KDS Info Bar */}
              <div
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderRadius: "12px",
                  padding: "12px 18px",
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Kitchen Display integrates with direct browser audio announcements &amp; kitchen ticket printers.
                </div>
                <button
                  onClick={() => onOpenAuth("login")}
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 700 }}
                >
                  Access Kitchen Display <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: EXECUTIVE ANALYTICS VIEW */}
          {activeTab === "analytics" && (
            <div style={{ animation: "fadeIn 0.2s ease-out" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "14px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    padding: "18px",
                    borderRadius: "14px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                    Today&apos;s Gross Revenue
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: 900, color: "var(--accent)", marginTop: "4px" }}>
                    $4,850.20
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--success)", fontWeight: 700, marginTop: "2px" }}>
                    ↑ +22.4% vs Yesterday
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    padding: "18px",
                    borderRadius: "14px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                    Total Orders Processed
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: 900, color: "var(--text-primary)", marginTop: "4px" }}>
                    642 orders
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                    Across 3 Cafe Branches
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    padding: "18px",
                    borderRadius: "14px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                    Average Ticket Value
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: 900, color: "var(--text-primary)", marginTop: "4px" }}>
                    $7.55
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--success)", fontWeight: 700, marginTop: "2px" }}>
                    ↑ +$0.85 per guest
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    padding: "18px",
                    borderRadius: "14px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                    Average Prep Time
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: 900, color: "var(--success)", marginTop: "4px" }}>
                    1m 45s
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                    Industry leading speed
                  </div>
                </div>
              </div>

              {/* Multi-Branch Breakdown Bar */}
              <div
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderRadius: "14px",
                  padding: "18px",
                  border: "1px solid var(--border)",
                  marginBottom: "20px",
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "12px", display: "flex", justifyContent: "space-between" }}>
                  <span>Multi-Branch Daily Revenue Distribution</span>
                  <span style={{ color: "var(--accent)" }}>3 Locations Active</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span>Downtown Flagship Branch</span>
                      <strong>$2,450.00 (50.5%)</strong>
                    </div>
                    <div style={{ height: "8px", backgroundColor: "var(--bg-card)", borderRadius: "99px", overflow: "hidden" }}>
                      <div style={{ width: "50.5%", height: "100%", backgroundColor: "var(--accent)" }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span>Mall Foodcourt Outlet</span>
                      <strong>$1,520.20 (31.3%)</strong>
                    </div>
                    <div style={{ height: "8px", backgroundColor: "var(--bg-card)", borderRadius: "99px", overflow: "hidden" }}>
                      <div style={{ width: "31.3%", height: "100%", backgroundColor: "var(--info)" }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span>Airport Express Kiosk</span>
                      <strong>$880.00 (18.2%)</strong>
                    </div>
                    <div style={{ height: "8px", backgroundColor: "var(--bg-card)", borderRadius: "99px", overflow: "hidden" }}>
                      <div style={{ width: "18.2%", height: "100%", backgroundColor: "var(--success)" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Analytics Footer */}
              <div
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderRadius: "12px",
                  padding: "12px 18px",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Export full reports to PDF, XLSX, and connect directly to Google Calendar.
                </div>
                <button
                  onClick={() => onOpenAuth("login")}
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 700 }}
                >
                  View Executive Portal <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: LIVE VOICE AI HUB */}
          {activeTab === "voice" && (
            <div style={{ animation: "fadeIn 0.2s ease-out" }}>
              <div
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderRadius: "16px",
                  padding: "24px",
                  border: "1px solid var(--accent)",
                  marginBottom: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "18px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        backgroundColor: "var(--accent)",
                        color: "#0f172a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Mic size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: 800 }}>LiveKit WebRTC Voice Pipeline</div>
                      <div style={{ fontSize: "12px", color: "var(--success)", fontWeight: 600 }}>
                        ● 48kHz Full-Duplex Audio Engine Connected
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      backgroundColor: "var(--accent-muted)",
                      color: "var(--accent)",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--accent)",
                    }}
                  >
                    GEMINI &amp; GROQ LLM
                  </span>
                </div>

                {/* Voice Pipeline 4-Stage Breakdown */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <div style={{ backgroundColor: "var(--bg-card)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent)" }}>01. VOICE VAD</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, marginTop: "2px" }}>Silero Neural VAD</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Directional noise suppression</div>
                  </div>

                  <div style={{ backgroundColor: "var(--bg-card)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--info)" }}>02. SPEECH-TO-TEXT</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, marginTop: "2px" }}>Deepgram Nova-2</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>&lt;150ms speech transcription</div>
                  </div>

                  <div style={{ backgroundColor: "var(--bg-card)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--warning)" }}>03. REASONING ENGINE</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, marginTop: "2px" }}>Groq / Gemini LLM</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Direct DB inventory &amp; order tools</div>
                  </div>

                  <div style={{ backgroundColor: "var(--bg-card)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--success)" }}>04. VOICE SYNTHESIS</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, marginTop: "2px" }}>ElevenLabs TTS</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Natural conversational audio</div>
                  </div>
                </div>
              </div>

              {/* Voice Hub Footer */}
              <div
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderRadius: "12px",
                  padding: "12px 18px",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Experience hands-free ordering live inside the app with our floating assistant drawer.
                </div>
                <button
                  onClick={() => onOpenAuth("login")}
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 700 }}
                >
                  Try Voice Assistant Live <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
