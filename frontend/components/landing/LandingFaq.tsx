"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function LandingFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "What hardware and devices does Haji Cafe POS support?",
      a: "Haji Cafe runs effortlessly in any modern web browser across iPads, Android tablets, touch-screen POS terminals, Windows PCs, and Macs. It integrates with standard ESC/POS USB, Ethernet, and Bluetooth thermal receipt printers.",
    },
    {
      q: "How does the Live Voice AI Assistant operate during noisy cafe peak hours?",
      a: "The built-in Voice Assistant features advanced directional noise suppression. Baristas can interact via tablet mics, hands-free wireless earpieces, or counter microphones without background espresso grinder interference.",
    },
    {
      q: "Can I manage multiple cafe branches with different prices and staff?",
      a: "Yes! Haji Cafe was built from the ground up for multi-location scalability. You can configure individual branch operating hours, local sales tax rates, distinct menu item availability, and assign Branch Managers or Cashiers with scoped permissions.",
    },
    {
      q: "How does automated low-stock tracking and recipe decrementing work?",
      a: "Every time a drink or food item is sold, the exact recipe quantities (e.g., 18g espresso beans, 250ml oat milk) are automatically subtracted from your branch inventory. When items hit your custom safety threshold, instant visual alerts appear on the dashboard.",
    },
    {
      q: "How secure is my financial data and employee audit trail?",
      a: "Enterprise-grade security is baked into every layer. We utilize bank-grade data encryption, granular role-based permissions (Super Admin, Cafe Owner, Branch Manager, Cashier), and permanent chronological audit logs for all sensitive actions.",
    },
    {
      q: "Can your support team assist with migrating my existing menu items?",
      a: "Absolutely! Our team is available 24/7 at support@mychatbot.codes or via phone at +92 340 6001884 to help you import your entire menu, configure categories, and set up your branches in no time.",
    },
  ];

  return (
    <section
      id="faq"
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
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 800,
              color: "var(--text-primary)",
              lineHeight: 1.2,
              marginBottom: "16px",
            }}
          >
            Frequently Asked <span className="landing-gradient-text">Questions</span>
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            Everything you need to know about our cloud POS platform, voice AI capabilities, and multi-branch setup.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderRadius: "16px",
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
                    padding: "20px 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "var(--text-primary)",
                  }}
                >
                  <span style={{ fontSize: "16px", fontWeight: 700, lineHeight: 1.3 }}>
                    {faq.q}
                  </span>
                  <div
                    style={{
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                      color: isOpen ? "var(--accent)" : "var(--text-muted)",
                      flexShrink: 0,
                    }}
                  >
                    <ChevronDown size={18} />
                  </div>
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: "0 24px 20px 24px",
                      color: "var(--text-muted)",
                      fontSize: "14px",
                      lineHeight: 1.65,
                      borderTop: "1px solid var(--border-subtle)",
                      paddingTop: "14px",
                      animation: "fadeIn 0.2s ease-out",
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
    </section>
  );
}
