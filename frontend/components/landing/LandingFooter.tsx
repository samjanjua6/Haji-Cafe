"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, Phone, Sparkles, Send, Heart } from "lucide-react";
import toast from "react-hot-toast";

export default function LandingFooter() {
  const [newsletterEmail, setNewsletterEmail] = useState("");

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    toast.success("Subscribed! You'll receive latest cafe management updates.");
    setNewsletterEmail("");
  };

  return (
    <footer
      style={{
        backgroundColor: "var(--bg-base)",
        borderTop: "1px solid var(--border)",
        padding: "60px 20px 30px 20px",
        position: "relative",
      }}
    >
      <div
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
        }}
      >
        {/* Main Footer Columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "40px",
            marginBottom: "50px",
          }}
        >
          {/* Brand Info */}
          <div style={{ maxWidth: "320px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(234,88,12,0.1) 100%)",
                  border: "1px solid var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img src="/logo.png" alt="Haji Cafe" style={{ width: "22px", height: "22px", objectFit: "contain" }} />
              </div>
              <span style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)" }}>
                Haji Cafe
              </span>
            </div>

            <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "18px" }}>
              The all-in-one cloud POS and AI Voice platform empowering coffee shops, bakeries, and cafe
              franchises worldwide.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)" }}>
                <Mail size={15} color="var(--accent)" />
                <a href="mailto:support@mychatbot.codes" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
                  support@mychatbot.codes
                </a>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)" }}>
                <Phone size={15} color="var(--success)" />
                <a href="tel:+923406001884" style={{ color: "var(--text-primary)", textDecoration: "none" }}>
                  +92 340 6001884
                </a>
              </div>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text-primary)", textTransform: "uppercase", marginBottom: "16px", letterSpacing: "0.05em" }}>
              Product Features
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              <li>
                <a href="#features" style={{ color: "var(--text-muted)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}>
                  Smart Counter POS
                </a>
              </li>
              <li>
                <a href="#ai-pos" style={{ color: "var(--text-muted)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}>
                  Live Voice AI Assistant
                </a>
              </li>
              <li>
                <a href="#features" style={{ color: "var(--text-muted)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}>
                  Multi-Branch Management
                </a>
              </li>
              <li>
                <a href="#features" style={{ color: "var(--text-muted)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}>
                  Low-Stock Threshold Alerts
                </a>
              </li>
              <li>
                <a href="#calculator" style={{ color: "var(--text-muted)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}>
                  ROI Savings Calculator
                </a>
              </li>
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text-primary)", textTransform: "uppercase", marginBottom: "16px", letterSpacing: "0.05em" }}>
              Solutions
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              <li>
                <span style={{ color: "var(--text-muted)" }}>Specialty Coffee Shops</span>
              </li>
              <li>
                <span style={{ color: "var(--text-muted)" }}>Artisan Bakeries &amp; Bistros</span>
              </li>
              <li>
                <span style={{ color: "var(--text-muted)" }}>Drive-Thru &amp; Express Kiosks</span>
              </li>
              <li>
                <span style={{ color: "var(--text-muted)" }}>Multi-City Cafe Franchises</span>
              </li>
              <li>
                <span style={{ color: "var(--text-muted)" }}>Fine Dining Tea Lounges</span>
              </li>
            </ul>
          </div>

          {/* Newsletter Subscribe */}
          <div>
            <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text-primary)", textTransform: "uppercase", marginBottom: "16px", letterSpacing: "0.05em" }}>
              Stay Updated
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: "14px" }}>
              Get monthly hospitality tech updates, voice AI tips, and revenue growth strategies.
            </p>
            <form onSubmit={handleNewsletter} style={{ display: "flex", gap: "8px" }}>
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="you@cafe.com"
                required
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "9px 12px",
                  fontSize: "13px",
                  color: "var(--text-primary)",
                  flex: 1,
                }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: "9px 14px", borderRadius: "8px" }}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            color: "var(--text-muted)",
            textAlign: "center",
          }}
        >
          © 2026 Haji Cafe Management Platform. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
