"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Sun,
  Moon,
  Sparkles,
  Menu,
  X,
  ArrowRight,
  LayoutDashboard,
  ShieldCheck,
  HelpCircle,
  Zap,
  Mic,
  Monitor,
  Mail,
  ChevronDown,
  ChevronUp,
  Check,
  Search,
  Key,
  Database,
  History,
  Lock,
  Copy,
  Send,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { auth } from "@/lib/auth";
import toast from "react-hot-toast";

export type NavTabKey = "features" | "tour" | "voice" | "security" | "pricing" | "faq" | "contact";

interface LandingNavbarProps {
  onOpenAuth: (tab: "login" | "register") => void;
}

export default function LandingNavbar({ onOpenAuth }: LandingNavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [expandedTab, setExpandedTab] = useState<NavTabKey | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const islandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoggedIn(auth.isLoggedIn());

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && expandedTab) {
        setExpandedTab(null);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (islandRef.current && !islandRef.current.contains(e.target as Node) && expandedTab) {
        setExpandedTab(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [expandedTab]);

  const handleTabClick = (tabKey: NavTabKey) => {
    if (expandedTab === tabKey) {
      setExpandedTab(null);
    } else {
      setExpandedTab(tabKey);
    }
  };

  const navLinks: { key: NavTabKey; label: string; icon: any }[] = [
    { key: "features", label: "Features", icon: Sparkles },
    { key: "tour", label: "Product Tour", icon: Monitor },
    { key: "voice", label: "Voice AI", icon: Mic },
    { key: "security", label: "Security", icon: ShieldCheck },
    { key: "pricing", label: "Pricing", icon: Zap },
    { key: "faq", label: "FAQ", icon: HelpCircle },
    { key: "contact", label: "Contact", icon: Mail },
  ];

  return (
    <>
      {/* Soft Ambient Backdrop (When Dynamic Island is Expanded) */}
      {expandedTab && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.4)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 990,
            animation: "fadeIn 0.2s ease-out",
          }}
          onClick={() => setExpandedTab(null)}
        />
      )}

      {/* Floating Dynamic Island Container */}
      <div
        ref={islandRef}
        style={{
          position: "fixed",
          top: "12px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          width: "calc(100% - 32px)",
          maxWidth: "1080px",
          backgroundColor:
            theme === "dark"
              ? "rgba(15, 23, 42, 0.94)"
              : "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: expandedTab ? "24px" : "9999px",
          border: expandedTab ? "1px solid var(--accent)" : "1px solid var(--border)",
          boxShadow: expandedTab
            ? "0 20px 60px rgba(0,0,0,0.5), 0 0 30px var(--accent-glow)"
            : "0 8px 24px rgba(0,0,0,0.18)",
          maxHeight: expandedTab ? "80vh" : "46px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "all 0.32s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Top Control Capsule Bar */}
        <div
          style={{
            padding: "5px 10px 5px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            minHeight: "46px",
            borderBottom: expandedTab ? "1px solid var(--border)" : "1px solid transparent",
            backgroundColor: expandedTab ? "var(--bg-surface)" : "transparent",
            transition: "all 0.25s ease",
            flexShrink: 0,
          }}
        >
          {/* Brand Logo & Title (Left) */}
          <Link
            href="/"
            onClick={() => setExpandedTab(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(234,88,12,0.1) 100%)",
                border: "1px solid var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px var(--accent-glow)",
                flexShrink: 0,
              }}
            >
              <img src="/logo.png" alt="Haji Cafe Logo" style={{ width: "18px", height: "18px", objectFit: "contain" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  fontSize: "14.5px",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                  whiteSpace: "nowrap",
                }}
              >
                Haji Cafe
              </span>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  padding: "1px 5px",
                  borderRadius: "99px",
                  background: "var(--accent-muted)",
                  color: "var(--accent)",
                  border: "1px solid var(--accent)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "2px",
                  whiteSpace: "nowrap",
                }}
              >
                <Sparkles size={8} /> AI POS
              </span>
            </div>
          </Link>

          {/* Liquid Desktop Tabs (Center) */}
          <nav
            style={{
              display: "none",
              alignItems: "center",
              gap: "2px",
              flexWrap: "nowrap",
            }}
            className="desktop-nav"
          >
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isSelected = expandedTab === link.key;
              return (
                <button
                  key={link.key}
                  onClick={() => handleTabClick(link.key)}
                  type="button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    background: isSelected ? "var(--accent)" : "transparent",
                    border: isSelected ? "1px solid var(--accent)" : "1px solid transparent",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: isSelected ? "#0f172a" : "var(--text-muted)",
                    padding: "4px 10px",
                    borderRadius: "9999px",
                    cursor: "pointer",
                    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    boxShadow: isSelected ? "0 2px 8px var(--accent-glow)" : "none",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.color = "var(--text-primary)";
                      e.currentTarget.style.backgroundColor = "var(--bg-surface)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.color = "var(--text-muted)";
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <Icon size={12} />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Items */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              type="button"
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "50%",
                width: "30px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
                cursor: "pointer",
                transition: "all 0.2s",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--accent)";
                e.currentTarget.style.borderColor = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
            </button>

            {/* Collapse Toggle or Auth Buttons */}
            {expandedTab ? (
              <button
                onClick={() => setExpandedTab(null)}
                type="button"
                className="btn btn-ghost btn-sm"
                style={{
                  padding: "4px 10px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  borderRadius: "9999px",
                  color: "var(--text-primary)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  whiteSpace: "nowrap",
                }}
              >
                <ChevronUp size={13} /> Collapse
              </button>
            ) : (
              <>
                {isLoggedIn ? (
                  <Link
                    href="/dashboard"
                    className="btn btn-primary"
                    style={{
                      padding: "4px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      borderRadius: "9999px",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <LayoutDashboard size={13} /> Dashboard
                  </Link>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <button
                      onClick={() => onOpenAuth("login")}
                      type="button"
                      className="btn btn-ghost"
                      style={{
                        padding: "4px 10px",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        borderRadius: "9999px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => onOpenAuth("register")}
                      type="button"
                      className="btn btn-primary"
                      style={{
                        padding: "4px 12px",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        borderRadius: "9999px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Get Started
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "50%",
                width: "30px",
                height: "30px",
                color: "var(--text-primary)",
                cursor: "pointer",
                flexShrink: 0,
              }}
              className="mobile-toggle"
            >
              {mobileMenuOpen ? <X size={14} /> : <Menu size={14} />}
            </button>
          </div>
        </div>

        {/* Liquid In-Place Body */}
        {expandedTab && (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 24px 28px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              animation: "fadeIn 0.2s ease-out",
            }}
          >
            {expandedTab === "security" && <SecurityIslandContent />}
            {expandedTab === "faq" && <FaqIslandContent />}
            {expandedTab === "pricing" && <PricingIslandContent onOpenAuth={onOpenAuth} onClose={() => setExpandedTab(null)} />}
            {expandedTab === "voice" && <VoiceIslandContent onOpenAuth={onOpenAuth} onClose={() => setExpandedTab(null)} />}
            {expandedTab === "tour" && <TourIslandContent onOpenAuth={onOpenAuth} onClose={() => setExpandedTab(null)} />}
            {expandedTab === "features" && <FeaturesIslandContent onOpenAuth={onOpenAuth} onClose={() => setExpandedTab(null)} />}
            {expandedTab === "contact" && <ContactIslandContent />}
          </div>
        )}

        {/* Mobile Drawer */}
        {mobileMenuOpen && !expandedTab && (
          <div
            style={{
              padding: "14px 18px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              borderTop: "1px solid var(--border)",
            }}
          >
            {navLinks.map((link) => (
              <button
                key={link.key}
                onClick={() => {
                  setMobileMenuOpen(false);
                  setExpandedTab(link.key);
                }}
                type="button"
                style={{
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  padding: "6px 0",
                  cursor: "pointer",
                }}
              >
                {link.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @media (min-width: 960px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-toggle {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}

// ----------------------------------------------------
// 1. SECURITY & RBAC ISLAND MODULE
// ----------------------------------------------------
function SecurityIslandContent() {
  const [activeRole, setActiveRole] = useState<"owner" | "manager" | "cashier" | "kitchen">("owner");

  const roles = {
    owner: {
      title: "Cafe Franchise Owner",
      scope: "Franchise Oversight & All Branches",
      allowed: ["Master Menu Catalog & Category Hierarchy", "Branch Creation & Tax Configurations", "Consolidated Revenue Reports & PDF Exports", "Staff Role Promotions & Shift Audit"],
    },
    manager: {
      title: "Branch Manager",
      scope: "Assigned Physical Location",
      allowed: ["Stock Restock Logs & Shrinkage Recording", "Localized Price Overrides", "Daily Cashier Shifts & Terminal Tallies", "Branch Sales Summary"],
    },
    cashier: {
      title: "Cashier & Counter Staff",
      scope: "POS Billing Register",
      allowed: ["Rapid Counter Order Creation & Splits", "Drink Modifier Selections (Oat Milk, Sugar Free)", "Thermal Receipt Printing", "Personal Shift Summary"],
    },
    kitchen: {
      title: "Kitchen & Barista Staff",
      scope: "Kitchen Display System (KDS)",
      allowed: ["Real-Time Order Ticket Queue", "Preparation Status Updates (In Prep ➔ Ready)", "Audio Chime Rush Notifications", "Zero Access to Pricing & Margins"],
    },
  };

  return (
    <div style={{ animation: "fadeIn 0.2s ease-out" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "10.5px", fontWeight: 800, color: "var(--accent)", textTransform: "uppercase", marginBottom: "3px" }}>
            <ShieldCheck size={12} /> Enterprise Security &amp; RBAC Architecture
          </div>
          <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
            Scoped Multi-Tenant Security &amp; Immutable Audit Logs
          </h3>
        </div>
      </div>

      {/* Role Tabs */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
        {(["owner", "manager", "cashier", "kitchen"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setActiveRole(r)}
            type="button"
            style={{
              padding: "5px 10px",
              borderRadius: "6px",
              border: activeRole === r ? "1px solid var(--accent)" : "1px solid var(--border)",
              backgroundColor: activeRole === r ? "var(--accent-muted)" : "var(--bg-surface)",
              color: activeRole === r ? "var(--accent)" : "var(--text-muted)",
              fontWeight: 700,
              fontSize: "11.5px",
              cursor: "pointer",
            }}
          >
            {roles[r].title}
          </button>
        ))}
      </div>

      {/* Role Permission Card */}
      <div style={{ backgroundColor: "var(--bg-surface)", borderRadius: "12px", padding: "14px 16px", border: "1px solid var(--border)", marginBottom: "14px" }}>
        <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-primary)" }}>{roles[activeRole].title}</div>
        <div style={{ fontSize: "11.5px", color: "var(--accent)", fontWeight: 600, marginTop: "2px", marginBottom: "8px" }}>
          Scope: {roles[activeRole].scope}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "6px" }}>
          {roles[activeRole].allowed.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-primary)" }}>
              <Check size={12} color="var(--success)" strokeWidth={3} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4 Pillars */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
        <div style={{ backgroundColor: "var(--bg-surface)", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <Key size={14} color="var(--accent)" />
          <div style={{ fontSize: "12px", fontWeight: 700, marginTop: "3px" }}>Dual-Token JWT Auth</div>
          <div style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "1px" }}>15m access + rotating refresh tokens</div>
        </div>
        <div style={{ backgroundColor: "var(--bg-surface)", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <History size={14} color="var(--info)" />
          <div style={{ fontSize: "12px", fontWeight: 700, marginTop: "3px" }}>Price Immutability</div>
          <div style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "1px" }}>`price_at_purchase` locking</div>
        </div>
        <div style={{ backgroundColor: "var(--bg-surface)", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <Database size={14} color="var(--warning)" />
          <div style={{ fontSize: "12px", fontWeight: 700, marginTop: "3px" }}>PostgreSQL ACID</div>
          <div style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "1px" }}>Prisma relational transaction safety</div>
        </div>
        <div style={{ backgroundColor: "var(--bg-surface)", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <Lock size={14} color="var(--success)" />
          <div style={{ fontSize: "12px", fontWeight: 700, marginTop: "3px" }}>256-Bit TLS 1.3</div>
          <div style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "1px" }}>Encrypted WebRTC &amp; WebSockets</div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 2. FAQ ISLAND MODULE
// ----------------------------------------------------
function FaqIslandContent() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [search, setSearch] = useState("");

  const faqs = [
    {
      q: "What hardware and devices does Haji Cafe POS support?",
      a: "Haji Cafe runs in any modern web browser across iPads, Android tablets, touchscreen POS terminals, Windows PCs, and Macs. It supports standard ESC/POS USB, Ethernet, and Bluetooth thermal receipt printers.",
    },
    {
      q: "How does the Live Voice AI Assistant operate during noisy peak hours?",
      a: "The Voice Assistant uses LiveKit WebRTC with directional noise suppression and Gemini processing. Baristas can speak via tablet mics, hands-free earpieces, or counter mics without espresso machine noise interference.",
    },
    {
      q: "Can I manage multiple cafe branches with different prices and staff?",
      a: "Yes! Haji Cafe was built from the ground up for multi-location scalability. You can configure individual branch operating hours, local tax rates, distinct menu availability, and assign Branch Managers or Cashiers with scoped permissions.",
    },
    {
      q: "How does automated low-stock tracking and recipe decrementing work?",
      a: "Every time a drink or food item is sold, exact recipe ingredients (e.g., 18g espresso beans, 250ml oat milk) are automatically deducted from your branch inventory. Safety threshold warnings alert you before stockouts occur.",
    },
  ];

  const filtered = faqs.filter(
    (f) => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ animation: "fadeIn 0.2s ease-out" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
            Frequently Asked Questions
          </h3>
          <p style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
            Instant answers about our cloud POS platform, voice AI capabilities, and hardware compatibility.
          </p>
        </div>

        <div style={{ position: "relative", width: "200px" }}>
          <Search size={12} color="var(--text-muted)" style={{ position: "absolute", left: 9, top: 9 }} />
          <input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              paddingLeft: "28px",
              paddingTop: "5px",
              paddingBottom: "5px",
              fontSize: "11.5px",
              backgroundColor: "var(--bg-surface)",
              borderRadius: "6px",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {filtered.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              style={{
                backgroundColor: "var(--bg-surface)",
                borderRadius: "10px",
                border: isOpen ? "1px solid var(--accent)" : "1px solid var(--border)",
                overflow: "hidden",
                transition: "all 0.2s ease",
              }}
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                type="button"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "var(--text-primary)",
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: 700 }}>{faq.q}</span>
                <ChevronDown
                  size={14}
                  style={{
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                    color: isOpen ? "var(--accent)" : "var(--text-muted)",
                    flexShrink: 0,
                  }}
                />
              </button>

              {isOpen && (
                <div
                  style={{
                    padding: "0 16px 12px 16px",
                    color: "var(--text-muted)",
                    fontSize: "12px",
                    lineHeight: 1.5,
                    borderTop: "1px solid var(--border-subtle)",
                    paddingTop: "8px",
                  }}
                >
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 3. PRICING ISLAND MODULE
// ----------------------------------------------------
function PricingIslandContent({ onOpenAuth, onClose }: { onOpenAuth: (t: "login" | "register") => void; onClose: () => void }) {
  const [annual, setAnnual] = useState(true);

  const tiers = [
    {
      name: "Starter Cafe",
      price: annual ? 24 : 29,
      desc: "For single-location coffee bars and kiosks.",
      features: ["1 Cafe Branch", "Unlimited Menu Catalog", "POS Billing & Receipts", "Email Support"],
      popular: false,
    },
    {
      name: "Growth Pro",
      price: annual ? 64 : 79,
      desc: "For high-volume cafes and expanding boutique chains.",
      features: ["Up to 3 Cafe Branches", "Live Voice AI Assistant", "Automated Low-Stock Alerts", "Predictive Analytics"],
      popular: true,
    },
    {
      name: "Enterprise",
      price: annual ? 159 : 199,
      desc: "For multi-location restaurant groups and franchises.",
      features: ["Unlimited Branches", "Custom Voice Workflows", "Dedicated Account Lead", "24/7 VIP Phone SLA"],
      popular: false,
    },
  ];

  return (
    <div style={{ animation: "fadeIn 0.2s ease-out" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
            Transparent Pricing Plans
          </h3>
          <p style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
            14-day free trial on all plans. No credit card required.
          </p>
        </div>

        {/* Toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "var(--bg-surface)",
            padding: "3px 8px",
            borderRadius: "99px",
            border: "1px solid var(--border)",
          }}
        >
          <span style={{ fontSize: "10.5px", fontWeight: 600, color: !annual ? "var(--text-primary)" : "var(--text-muted)", cursor: "pointer" }} onClick={() => setAnnual(false)}>
            Monthly
          </span>
          <button
            onClick={() => setAnnual(!annual)}
            type="button"
            style={{
              width: "28px",
              height: "16px",
              borderRadius: "99px",
              backgroundColor: annual ? "var(--accent)" : "var(--border)",
              border: "none",
              cursor: "pointer",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: "#0f172a",
                position: "absolute",
                top: "3px",
                left: annual ? "15px" : "3px",
                transition: "left 0.2s",
              }}
            />
          </button>
          <span style={{ fontSize: "10.5px", fontWeight: 600, color: annual ? "var(--text-primary)" : "var(--text-muted)", cursor: "pointer" }} onClick={() => setAnnual(true)}>
            Annual (Save 20%)
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
        {tiers.map((t, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: "var(--bg-surface)",
              borderRadius: "14px",
              border: t.popular ? "2px solid var(--accent)" : "1px solid var(--border)",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-primary)" }}>{t.name}</div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: "var(--text-primary)", margin: "6px 0" }}>
                ${t.price}
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}> / mo</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
                {t.features.map((f, fIdx) => (
                  <div key={fIdx} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px" }}>
                    <Check size={11} color="var(--accent)" strokeWidth={3} />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenAuth("register");
              }}
              type="button"
              className={t.popular ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
              style={{ width: "100%", padding: "7px", borderRadius: "6px", fontSize: "11.5px", fontWeight: 700, marginTop: "12px" }}
            >
              Choose {t.name}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 4. VOICE AI ISLAND MODULE
// ----------------------------------------------------
function VoiceIslandContent({ onOpenAuth, onClose }: { onOpenAuth: (t: "login" | "register") => void; onClose: () => void }) {
  return (
    <div style={{ animation: "fadeIn 0.2s ease-out" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
            LiveKit WebRTC Voice AI Operations
          </h3>
          <p style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
            Hands-free voice order entry, inventory lookups, and sales inquiries.
          </p>
        </div>
        <button
          onClick={() => {
            onClose();
            onOpenAuth("login");
          }}
          type="button"
          className="btn btn-primary btn-sm"
          style={{ fontWeight: 700, padding: "5px 12px", fontSize: "11.5px" }}
        >
          Try Live Voice Assistant <ArrowRight size={12} />
        </button>
      </div>

      <div style={{ backgroundColor: "var(--bg-surface)", borderRadius: "12px", padding: "14px", border: "1px solid var(--accent)", display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ fontSize: "12.5px", fontWeight: 800, color: "var(--text-primary)" }}>Sample Voice Commands:</div>
        <div style={{ backgroundColor: "var(--bg-card)", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "12px" }}>
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>Barista Spoken:</span> &quot;Create order: 2 Iced Spanish Lattes with Oat Milk for Table 4&quot;
          <div style={{ color: "var(--text-muted)", fontSize: "10.5px", marginTop: "2px" }}>➔ Dispatches instant kitchen ticket to Barista KDS display</div>
        </div>
        <div style={{ backgroundColor: "var(--bg-card)", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "12px" }}>
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>Manager Spoken:</span> &quot;What are today&apos;s total sales across all 3 branches?&quot;
          <div style={{ color: "var(--text-muted)", fontSize: "10.5px", marginTop: "2px" }}>➔ &quot;Total gross sales is $4,850.20 (+22% vs yesterday)&quot;</div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 5. TOUR ISLAND MODULE
// ----------------------------------------------------
function TourIslandContent({ onOpenAuth, onClose }: { onOpenAuth: (t: "login" | "register") => void; onClose: () => void }) {
  return (
    <div style={{ animation: "fadeIn 0.2s ease-out" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
            Unified System Showcase
          </h3>
          <p style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
            The 4 operational pillars of Haji Cafe POS.
          </p>
        </div>
        <button
          onClick={() => {
            onClose();
            onOpenAuth("login");
          }}
          type="button"
          className="btn btn-primary btn-sm"
          style={{ fontWeight: 700, padding: "5px 12px", fontSize: "11.5px" }}
        >
          Sign In to POS <ArrowRight size={12} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
        <div style={{ backgroundColor: "var(--bg-surface)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "20px" }}>📱</div>
          <div style={{ fontSize: "13px", fontWeight: 800, marginTop: "4px" }}>1. Counter POS</div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>1-tap billing, drink modifiers, thermal printing</div>
        </div>
        <div style={{ backgroundColor: "var(--bg-surface)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "20px" }}>🍳</div>
          <div style={{ fontSize: "13px", fontWeight: 800, marginTop: "4px" }}>2. Kitchen KDS</div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Preparation timers, priority tags, audio chimes</div>
        </div>
        <div style={{ backgroundColor: "var(--bg-surface)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "20px" }}>📊</div>
          <div style={{ fontSize: "13px", fontWeight: 800, marginTop: "4px" }}>3. Analytics Hub</div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Daily revenue, peak hours, PDF/Excel export</div>
        </div>
        <div style={{ backgroundColor: "var(--bg-surface)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "20px" }}>🎙️</div>
          <div style={{ fontSize: "13px", fontWeight: 800, marginTop: "4px" }}>4. Voice AI</div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Hands-free voice orders via LiveKit WebRTC</div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 6. FEATURES ISLAND MODULE
// ----------------------------------------------------
function FeaturesIslandContent({ onOpenAuth, onClose }: { onOpenAuth: (t: "login" | "register") => void; onClose: () => void }) {
  return (
    <div style={{ animation: "fadeIn 0.2s ease-out" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
            Core Platform Capabilities
          </h3>
          <p style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
            Everything you need to automate and scale coffee chains.
          </p>
        </div>
        <button
          onClick={() => {
            onClose();
            onOpenAuth("register");
          }}
          type="button"
          className="btn btn-primary btn-sm"
          style={{ fontWeight: 700, padding: "5px 12px", fontSize: "11.5px" }}
        >
          Start Free Trial <ArrowRight size={12} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" }}>
        {[
          { title: "Multi-Branch Management", desc: "Franchise menu catalog with branch-scoped overrides." },
          { title: "Smart Recipe Decrementing", desc: "Automatic milk, bean, and syrup inventory tracking upon sale." },
          { title: "Automated Low-Stock Alerts", desc: "Threshold warnings on dashboard before items run out." },
          { title: "Thermal & Digital Invoices", desc: "Direct ESC/POS receipt printing and QR e-invoices." },
          { title: "Google Calendar Sync", desc: "Schedule staff meetings directly inside Google Calendar." },
          { title: "Role-Based Security", desc: "Granular permissions for Admins, Owners, Managers, Cashiers, Baristas." },
        ].map((f, i) => (
          <div key={i} style={{ backgroundColor: "var(--bg-surface)", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "12.5px", fontWeight: 800, color: "var(--text-primary)" }}>{f.title}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px", lineHeight: 1.35 }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 7. CONTACT ISLAND MODULE
// ----------------------------------------------------
function ContactIslandContent() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);

  const contactEmail = "support@chartboard.com";
  const contactPhone = "+92 (300) 123-4567";

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    toast.success(`Message received! Our team at ${contactEmail} will reply shortly.`);
    setTimeout(() => {
      setName("");
      setEmail("");
      setMsg("");
      setSent(false);
    }, 2000);
  };

  const copyText = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <div style={{ animation: "fadeIn 0.2s ease-out" }}>
      <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 3px 0" }}>
        Contact &amp; 24/7 Support Hub
      </h3>
      <p style={{ fontSize: "11.5px", color: "var(--text-muted)", marginBottom: "14px" }}>
        Reach our engineering and cafe onboarding specialists directly.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ backgroundColor: "var(--bg-surface)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Official Support Email</div>
            <a href={`mailto:${contactEmail}`} style={{ fontSize: "14px", fontWeight: 800, color: "var(--accent)", textDecoration: "none", display: "block", margin: "3px 0" }}>
              {contactEmail}
            </a>
            <button
              onClick={() => copyText(contactEmail, "Email")}
              type="button"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "4px", padding: "3px 6px", fontSize: "10.5px", color: "var(--text-muted)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "3px" }}
            >
              <Copy size={10} /> Copy Email
            </button>
          </div>

          <div style={{ backgroundColor: "var(--bg-surface)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Direct Helpline</div>
            <a href={`tel:${contactPhone.replace(/[^0-9+]/g, "")}`} style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-primary)", textDecoration: "none", display: "block", margin: "3px 0" }}>
              {contactPhone}
            </a>
            <button
              onClick={() => copyText(contactPhone, "Phone")}
              type="button"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "4px", padding: "3px 6px", fontSize: "10.5px", color: "var(--text-muted)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "3px" }}
            >
              <Copy size={10} /> Copy Phone
            </button>
          </div>
        </div>

        {/* Form */}
        <div style={{ backgroundColor: "var(--bg-surface)", padding: "14px", borderRadius: "12px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "12.5px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>Send Quick Message</div>
          <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ padding: "6px 8px", fontSize: "11.5px", borderRadius: "6px" }}
            />
            <input
              type="email"
              placeholder="Your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ padding: "6px 8px", fontSize: "11.5px", borderRadius: "6px" }}
            />
            <textarea
              rows={2}
              placeholder="How can we help your cafe?"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              required
              style={{ padding: "6px 8px", fontSize: "11.5px", borderRadius: "6px", resize: "none" }}
            />
            <button type="submit" disabled={sent} className="btn btn-primary btn-sm" style={{ fontWeight: 700, borderRadius: "6px", padding: "5px", fontSize: "11.5px" }}>
              <Send size={11} /> {sent ? "Sending..." : "Submit Inquiry"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
