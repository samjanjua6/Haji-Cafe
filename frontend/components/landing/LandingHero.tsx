"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  Coffee,
  CheckCircle2,
  Mic,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Store,
  Layers,
  TrendingUp,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

interface LandingHeroProps {
  onOpenAuth: (tab: "login" | "register") => void;
}

interface DemoItem {
  id: string;
  name: string;
  category: string;
  price: number;
  icon: string;
}

const DEMO_ITEMS: DemoItem[] = [
  { id: "1", name: "Spanish Latte", category: "Coffee", price: 4.5, icon: "☕" },
  { id: "2", name: "Iced Caramel Macchiato", category: "Coffee", price: 5.2, icon: "🧊" },
  { id: "3", name: "Butter Croissant", category: "Bakery", price: 3.5, icon: "🥐" },
  { id: "4", name: "Blueberry Cheesecake", category: "Bakery", price: 6.0, icon: "🍰" },
  { id: "5", name: "Artisan Turkey Panini", category: "Snacks", price: 7.5, icon: "🥪" },
  { id: "6", name: "Matcha Fusion Latte", category: "Tea", price: 5.0, icon: "🍵" },
];

export default function LandingHero({ onOpenAuth }: LandingHeroProps) {
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway" | "delivery">("dine-in");
  const [cart, setCart] = useState<{ item: DemoItem; qty: number }[]>([
    { item: DEMO_ITEMS[0], qty: 2 },
    { item: DEMO_ITEMS[2], qty: 1 },
  ]);
  const [tableNo, setTableNo] = useState("Table #04");
  const [isProcessing, setIsProcessing] = useState(false);

  const addItem = (item: DemoItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) => (c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { item, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.item.id === id ? { ...c, qty: c.qty + delta } : c))
        .filter((c) => c.qty > 0)
    );
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((c) => c.item.id !== id));
  };

  const subtotal = cart.reduce((acc, c) => acc + c.item.price * c.qty, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("Add at least one item to checkout!");
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      toast.success(`🎉 Order #${Math.floor(1000 + Math.random() * 9000)} Placed! Receipt Sent to Kitchen.`);
      setCart([
        { item: DEMO_ITEMS[1], qty: 1 },
        { item: DEMO_ITEMS[3], qty: 1 },
      ]);
    }, 1000);
  };

  return (
    <section
      style={{
        position: "relative",
        padding: "60px 24px 80px 24px",
        overflow: "hidden",
      }}
    >
      {/* Background glow effects */}
      <div
        style={{
          position: "absolute",
          top: "0%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "900px",
          height: "400px",
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
        <div style={{ textAlign: "center", maxWidth: "900px", margin: "0 auto 50px auto" }}>
          {/* Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 16px",
              borderRadius: "99px",
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--accent)",
              color: "var(--accent)",
              fontSize: "13px",
              fontWeight: 700,
              marginBottom: "20px",
              boxShadow: "0 2px 12px var(--accent-glow)",
              animation: "fadeIn 0.5s ease-out",
            }}
          >
            <Sparkles size={15} /> Next-Gen AI Voice & Cloud POS Suite
          </div>

          {/* Heading */}
          <h1
            style={{
              fontSize: "clamp(32px, 5.5vw, 62px)",
              fontWeight: 900,
              lineHeight: 1.12,
              letterSpacing: "-0.03em",
              marginBottom: "20px",
              color: "var(--text-primary)",
            }}
          >
            Run Your Entire Cafe Chain with{" "}
            <span className="landing-gradient-text">Lightning POS & Live AI Voice</span>
          </h1>

          {/* Subheading */}
          <p
            style={{
              fontSize: "clamp(15px, 2vw, 19px)",
              color: "var(--text-muted)",
              lineHeight: 1.6,
              maxWidth: "760px",
              margin: "0 auto 32px auto",
            }}
          >
            The comprehensive operating system engineered for single cafes, boutique roasteries, and expanding
            franchises. Accelerate billing, sync multi-branch stock in real-time, and take voice orders effortlessly.
          </p>

          {/* CTA Buttons */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: "14px",
              marginBottom: "36px",
            }}
          >
            <button
              onClick={() => onOpenAuth("register")}
              type="button"
              className="btn btn-primary"
              style={{
                padding: "14px 28px",
                fontSize: "16px",
                fontWeight: 700,
                borderRadius: "12px",
                boxShadow: "0 4px 20px var(--accent-glow)",
              }}
            >
              Start Free 14-Day Trial <ArrowRight size={18} />
            </button>
            <a
              href="#ai-pos"
              className="btn btn-ghost"
              style={{
                padding: "14px 24px",
                fontSize: "15px",
                fontWeight: 600,
                borderRadius: "12px",
                textDecoration: "none",
              }}
            >
              <Mic size={17} color="var(--accent)" /> Explore Live Voice AI
            </a>
          </div>

          {/* Trust Highlights */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: "24px",
              color: "var(--text-muted)",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={16} color="var(--success)" /> No Hardware Lock-in
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={16} color="var(--success)" /> 1-Click Multi-Branch Setup
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={16} color="var(--success)" /> Real-Time LiveKit Voice AI
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={16} color="var(--success)" /> Free Automatic Upgrades
            </div>
          </div>
        </div>

        {/* Interactive POS Simulator & Showcase Container */}
        <div
          style={{
            maxWidth: "1140px",
            margin: "0 auto",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
            position: "relative",
          }}
        >
          {/* Top Bar of POS Simulator */}
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
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
                <span style={{ fontSize: "13px", fontWeight: 700 }}>Haji Cafe - Downtown Branch</span>
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
                Terminal Live
              </span>
            </div>

            {/* Order Type Tabs */}
            <div
              style={{
                display: "flex",
                backgroundColor: "var(--bg-surface)",
                borderRadius: "10px",
                padding: "3px",
                border: "1px solid var(--border)",
              }}
            >
              {(["dine-in", "takeaway", "delivery"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setOrderType(t)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                    textTransform: "capitalize",
                    backgroundColor: orderType === t ? "var(--accent)" : "transparent",
                    color: orderType === t ? "#0f172a" : "var(--text-muted)",
                    transition: "all 0.2s",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* POS Grid: Menu Selection on Left, Live Cart on Right */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "24px",
            }}
          >
            {/* Left: Quick Tap Menu */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "14px",
                }}
              >
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                  Quick-Tap Menu Items
                </span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Click to add to live POS bill 👇
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(135px, 1fr))",
                  gap: "12px",
                }}
              >
                {DEMO_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addItem(item)}
                    type="button"
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "14px",
                      padding: "14px 10px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                      transition: "all 0.18s ease",
                      textAlign: "center",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.backgroundColor = "var(--accent-muted)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.backgroundColor = "var(--bg-surface)";
                    }}
                  >
                    <span style={{ fontSize: "28px" }}>{item.icon}</span>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        lineHeight: 1.2,
                      }}
                    >
                      {item.name}
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 800,
                        color: "var(--accent)",
                        marginTop: "2px",
                      }}
                    >
                      ${item.price.toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>

              {/* Floating Voice Assistant Banner inside POS */}
              <div
                style={{
                  marginTop: "18px",
                  padding: "12px 16px",
                  borderRadius: "14px",
                  backgroundColor: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    backgroundColor: "var(--accent)",
                    color: "#0f172a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Mic size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase" }}>
                    Live AI Assistant Listening
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    &quot;Added 2 Spanish Lattes &amp; 1 Croissant to Table #04&quot;
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Live Cart & Bill Processing */}
            <div
              style={{
                backgroundColor: "var(--bg-surface)",
                borderRadius: "16px",
                border: "1px solid var(--border)",
                padding: "18px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                    paddingBottom: "8px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Receipt size={16} color="var(--accent)" />
                    <span style={{ fontSize: "14px", fontWeight: 700 }}>Current Bill</span>
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--accent)",
                      backgroundColor: "var(--accent-muted)",
                      padding: "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    {tableNo}
                  </span>
                </div>

                {/* Cart Items List */}
                <div
                  style={{
                    maxHeight: "180px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    marginBottom: "12px",
                  }}
                >
                  {cart.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: "13px" }}>
                      Cart is empty. Click menu items on the left!
                    </div>
                  ) : (
                    cart.map(({ item, qty }) => (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "6px 8px",
                          backgroundColor: "var(--bg-card)",
                          borderRadius: "8px",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span>{item.icon}</span>
                          <div>
                            <div style={{ fontSize: "12px", fontWeight: 600 }}>{item.name}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                              ${item.price.toFixed(2)} each
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              backgroundColor: "var(--bg-surface)",
                              borderRadius: "6px",
                              padding: "2px",
                            }}
                          >
                            <button
                              onClick={() => updateQty(item.id, -1)}
                              type="button"
                              style={{
                                width: 22,
                                height: 22,
                                border: "none",
                                borderRadius: "4px",
                                background: "transparent",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--text-muted)",
                              }}
                            >
                              <Minus size={12} />
                            </button>
                            <span style={{ fontSize: "12px", fontWeight: 700, minWidth: "16px", textAlign: "center" }}>
                              {qty}
                            </span>
                            <button
                              onClick={() => updateQty(item.id, 1)}
                              type="button"
                              style={{
                                width: 22,
                                height: 22,
                                border: "none",
                                borderRadius: "4px",
                                background: "transparent",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--text-muted)",
                              }}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <span style={{ fontSize: "13px", fontWeight: 700, minWidth: "50px", textAlign: "right" }}>
                            ${(item.price * qty).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bill Totals & Checkout Button */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
                  <span>Sales Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "14px" }}>
                  <span>Total Amount</span>
                  <span style={{ color: "var(--accent)" }}>${total.toFixed(2)}</span>
                </div>

                <button
                  onClick={handleCheckout}
                  type="button"
                  disabled={isProcessing || cart.length === 0}
                  className="btn btn-primary"
                  style={{ width: "100%", padding: "12px", fontWeight: 700, borderRadius: "10px", fontSize: "14px" }}
                >
                  {isProcessing ? (
                    <>
                      <span className="spinner" /> Generating Kitchen Ticket...
                    </>
                  ) : (
                    <>
                      <Zap size={16} /> Pay &amp; Print Order (${total.toFixed(2)})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
