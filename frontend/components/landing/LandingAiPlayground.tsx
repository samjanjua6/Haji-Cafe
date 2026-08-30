"use client";

import React, { useState } from "react";
import { Mic, Sparkles, Volume2, Bot, Play, CheckCircle2, MessageSquare, ArrowRight } from "lucide-react";

interface VoiceQuery {
  id: string;
  category: string;
  icon: string;
  userPrompt: string;
  aiResponse: string;
  actionTaken: string;
  badgeColor: string;
}

const PRESET_QUERIES: VoiceQuery[] = [
  {
    id: "1",
    category: "Hands-Free Voice Order",
    icon: "🎙️",
    userPrompt: "Take order for 2 Iced Spanish Lattes with Oat Milk and 1 Blueberry Muffin for Table 6",
    aiResponse:
      "Order confirmed for Table 6: 2x Iced Spanish Latte (Modifier: Oat Milk) + 1x Blueberry Muffin. Subtotal: $14.20. Order pushed to Barista KDS display immediately.",
    actionTaken: "Order #4092 Created & Barista Ticket Printed",
    badgeColor: "var(--success)",
  },
  {
    id: "2",
    category: "Real-Time Sales Query",
    icon: "📊",
    userPrompt: "What is our best-selling coffee item today and total sales across all branches?",
    aiResponse:
      "Today's top-performing item is Spanish Latte with 94 cups sold ($488.80). Total gross revenue across all 3 branches is $4,850.20 (+22% compared to last Tuesday).",
    actionTaken: "Real-Time Revenue Analytics Synced",
    badgeColor: "var(--accent)",
  },
  {
    id: "3",
    category: "Smart Low-Stock Alert",
    icon: "⚠️",
    userPrompt: "Are there any raw ingredients or syrups running below safety stock?",
    aiResponse:
      "Warning: 2 items require immediate reorder: 1) Colombian Espresso Roast (1.5 kg remaining / 5 kg threshold), 2) Caramel Syrup (1 bottle remaining).",
    actionTaken: "Automated Restock Purchase Draft Created",
    badgeColor: "var(--danger)",
  },
  {
    id: "4",
    category: "Multi-Branch Oversight",
    icon: "🏬",
    userPrompt: "How is the Mall Outlet performing compared to Downtown Branch?",
    aiResponse:
      "Mall Outlet has processed 142 orders ($1,890) with an average ticket time of 1m 50s. Downtown Branch has processed 188 orders ($2,510) with 1m 35s speed.",
    actionTaken: "Cross-Branch Live Comparison Generated",
    badgeColor: "var(--info)",
  },
];

export default function LandingAiPlayground() {
  const [selectedQuery, setSelectedQuery] = useState<VoiceQuery>(PRESET_QUERIES[0]);
  const [isPlaying, setIsPlaying] = useState(true);

  return (
    <section
      id="ai-pos"
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
        {/* Section Header */}
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
            <Sparkles size={14} /> LIVEKIT WEBRTC &amp; GEMINI POWERED
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
            Experience the Future of{" "}
            <span className="landing-gradient-text">Hands-Free Voice Cafe Operations</span>
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            Never get bogged down typing during peak morning rushes. Speak natural commands to take orders, check
            inventory levels, and query branch revenue in real-time.
          </p>
        </div>

        {/* Playground Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "32px",
            alignItems: "stretch",
          }}
        >
          {/* Left Column: Preset Voice Queries */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
              Click any sample voice command to test:
            </div>

            {PRESET_QUERIES.map((q) => {
              const isSelected = selectedQuery.id === q.id;
              return (
                <button
                  key={q.id}
                  onClick={() => setSelectedQuery(q)}
                  type="button"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "14px",
                    padding: "16px",
                    borderRadius: "14px",
                    backgroundColor: isSelected ? "var(--bg-surface)" : "transparent",
                    border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                    boxShadow: isSelected ? "0 4px 16px var(--accent-glow)" : "none",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                  }}
                >
                  <span style={{ fontSize: "24px", lineHeight: 1 }}>{q.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: isSelected ? "var(--accent)" : "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {q.category}
                      </span>
                      {isSelected && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "var(--accent)",
                            backgroundColor: "var(--accent-muted)",
                            padding: "2px 8px",
                            borderRadius: "6px",
                          }}
                        >
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        lineHeight: 1.4,
                      }}
                    >
                      &quot;{q.userPrompt}&quot;
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Live Simulated Visualizer & Transcript Response */}
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              borderRadius: "20px",
              border: "1px solid var(--border)",
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "24px",
            }}
          >
            {/* Top Sound Wave Frequency Box */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "20px",
                  paddingBottom: "12px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      backgroundColor: "var(--accent)",
                      color: "#0f172a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Mic size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                      LiveKit Voice Channel
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--success)", fontWeight: 600 }}>
                      ● Ultra Low-Latency Audio Stream (48 kHz)
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  type="button"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    color: "var(--text-muted)",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Volume2 size={14} color="var(--accent)" />
                  {isPlaying ? "Voice Active" : "Paused"}
                </button>
              </div>

              {/* Animated Sound Wave Bars */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  height: "50px",
                  backgroundColor: "var(--bg-card)",
                  borderRadius: "12px",
                  border: "1px solid var(--border-subtle)",
                  padding: "0 20px",
                  marginBottom: "20px",
                }}
              >
                {[12, 24, 38, 18, 30, 44, 20, 34, 46, 28, 16, 40, 22, 32, 14, 26].map((h, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: "4px",
                      height: isPlaying ? `${h}px` : "6px",
                      backgroundColor: isPlaying ? "var(--accent)" : "var(--border)",
                      borderRadius: "4px",
                      transition: "height 0.2s ease, background-color 0.2s ease",
                      animation: isPlaying ? `waveBar 1.2s ease-in-out infinite ${idx * 0.08}s` : "none",
                    }}
                  />
                ))}
              </div>

              {/* Spoken Voice Query Box */}
              <div
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderRadius: "12px",
                  padding: "16px",
                  border: "1px solid var(--border)",
                  marginBottom: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", fontWeight: 700 }}>
                  <MessageSquare size={13} color="var(--accent)" /> VOICE INPUT DETECTED:
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", fontStyle: "italic" }}>
                  &quot;{selectedQuery.userPrompt}&quot;
                </div>
              </div>

              {/* Assistant Response Box */}
              <div
                style={{
                  backgroundColor: "rgba(245, 158, 11, 0.06)",
                  borderRadius: "12px",
                  padding: "16px",
                  border: "1px solid var(--accent)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--accent)", marginBottom: "6px", fontWeight: 700 }}>
                  <Bot size={14} /> AI ASSISTANT SPEECH &amp; EXECUTION:
                </div>
                <div style={{ fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.5, marginBottom: "12px" }}>
                  {selectedQuery.aiResponse}
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: selectedQuery.badgeColor,
                    backgroundColor: "var(--bg-card)",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: `1px solid ${selectedQuery.badgeColor}44`,
                  }}
                >
                  <CheckCircle2 size={13} /> {selectedQuery.actionTaken}
                </div>
              </div>
            </div>

            {/* Bottom footnote */}
            <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
              <Sparkles size={14} color="var(--accent)" />
              Also accessible 24/7 via the in-app chatbot floating drawer!
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
