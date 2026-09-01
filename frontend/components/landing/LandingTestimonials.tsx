"use client";

import React from "react";
import { Star, Quote, CheckCircle2, Sparkles } from "lucide-react";

export default function LandingTestimonials() {
  const reviews = [
    {
      name: "Sarah Jenkins",
      role: "Founder & Master Roaster",
      cafe: "Roastery & Co. (3 Branches)",
      avatar: "SJ",
      quote:
        "Haji Cafe completely transformed our morning peak rush. The LiveKit Voice Assistant allows our baristas to punch in complicated drink modifiers while steaming milk—cutting customer wait time in half!",
      rating: 5,
    },
    {
      name: "Tariq Mahmood",
      role: "Operations Director",
      cafe: "Artisan Bean Chain (5 Outlets)",
      avatar: "TM",
      quote:
        "The multi-branch dashboard and automated low-stock alerts have saved us thousands of dollars in bean and syrup wastage. I can monitor live revenue across all branches right from my phone.",
      rating: 5,
    },
    {
      name: "Elena Rostova",
      role: "General Manager",
      cafe: "Velvet Espresso Bar",
      avatar: "ER",
      quote:
        "The cleanest and most intuitive POS we have ever deployed. We trained 4 new seasonal cashiers in less than 10 minutes. The instant receipt printing and daily PDF reports are second to none.",
      rating: 5,
    },
  ];

  return (
    <section
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
            <Sparkles size={14} /> PROVEN SUCCESS STORIES
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
            Loved by <span className="landing-gradient-text">Over 500+ Cafe Owners &amp; Baristas</span>
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            See how forward-thinking specialty cafes and multi-outlet chains elevate their guest experience with Haji
            Cafe.
          </p>
        </div>

        {/* Reviews Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
          }}
        >
          {reviews.map((r, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "20px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "20px",
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
              <div>
                {/* Stars */}
                <div style={{ display: "flex", gap: "4px", marginBottom: "16px" }}>
                  {[...Array(r.rating)].map((_, i) => (
                    <Star key={i} size={16} fill="var(--accent)" color="var(--accent)" />
                  ))}
                </div>

                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--text-primary)",
                    lineHeight: 1.6,
                    fontStyle: "italic",
                    margin: 0,
                  }}
                >
                  &quot;{r.quote}&quot;
                </p>
              </div>

              {/* Author info */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  borderTop: "1px solid var(--border-subtle)",
                  paddingTop: "16px",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    backgroundColor: "var(--accent-muted)",
                    color: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "14px",
                    border: "1px solid var(--accent)",
                  }}
                >
                  {r.avatar}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                      {r.name}
                    </span>
                    <CheckCircle2 size={14} color="var(--success)" />
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {r.role} • <span style={{ color: "var(--accent)" }}>{r.cafe}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
