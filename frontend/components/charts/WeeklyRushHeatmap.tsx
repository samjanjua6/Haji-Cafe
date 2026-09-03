"use client";

import React, { useState } from "react";
import { Flame, Info, TrendingUp, DollarSign, Users, AlertTriangle } from "lucide-react";

export interface HeatmapCell {
  day_idx: number;
  day: string;
  hour: number;
  label: string;
  orders: number;
  revenue: number;
  intensity_score: number;
}

export interface HeatmapDay {
  day: string;
  day_idx: number;
  total_orders: number;
  total_revenue: number;
  hours: HeatmapCell[];
}

interface WeeklyRushHeatmapProps {
  heatmapData: HeatmapDay[];
  topPeaks?: HeatmapCell[];
  isLoading?: boolean;
}

export default function WeeklyRushHeatmap({
  heatmapData = [],
  topPeaks = [],
  isLoading = false,
}: WeeklyRushHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Standard operating hours: 07:00 to 22:00 (16 columns)
  const operatingHours = Array.from({ length: 16 }, (_, i) => i + 7);

  // Helper: Get color based on intensity score (0 to 100)
  const getCellBg = (intensity: number, orders: number) => {
    if (orders === 0 || intensity < 5) return "rgba(30, 41, 59, 0.45)"; // Deep slate
    if (intensity < 30) return "rgba(59, 130, 246, 0.35)"; // Soft Blue
    if (intensity < 60) return "rgba(59, 130, 246, 0.85)"; // Vivid Blue
    if (intensity < 80) return "rgba(245, 158, 11, 0.88)"; // Warm Amber (Peak)
    return "rgba(239, 68, 68, 0.95)"; // Crimson Red (Super Peak)
  };

  const getCellTextColor = (intensity: number, orders: number) => {
    if (orders === 0) return "var(--text-faint)";
    if (intensity < 30) return "#93c5fd";
    if (intensity < 60) return "#ffffff";
    if (intensity < 80) return "#1e1b4b";
    return "#ffffff";
  };

  if (isLoading) {
    return (
      <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
        Loading 7×24 weekly rush heatmap...
      </div>
    );
  }

  return (
    <div style={{ width: "100%", position: "relative" }}>
      {/* 1. Top Insights Banner */}
      {topPeaks && topPeaks.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            borderRadius: "var(--radius-md)",
            padding: "8px 14px",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
            <Flame size={16} />
            <span>Top Weekly Congestion Bottlenecks:</span>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {topPeaks.slice(0, 3).map((pk, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: "var(--radius-sm)",
                  background: idx === 0 ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)",
                  color: idx === 0 ? "#ef4444" : "#f59e0b",
                  border: `1px solid ${idx === 0 ? "rgba(239, 68, 68, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                }}
              >
                #{idx + 1} {pk.day} {pk.label} ({pk.orders} orders • ${pk.revenue})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 2. 7x24 Matrix Grid */}
      <div style={{ overflowX: "auto", paddingBottom: 8 }}>
        <div style={{ minWidth: 680 }}>
          {/* Hour Labels (Header row) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "55px repeat(16, 1fr)",
              gap: 4,
              marginBottom: 6,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textAlign: "left", paddingLeft: 4 }}>
              DAY
            </div>
            {operatingHours.map((h) => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>
                {h:02d}:00
              </div>
            ))}
          </div>

          {/* Day Rows */}
          {heatmapData.map((dayData) => {
            const isWeekend = dayData.day === "Sat" || dayData.day === "Sun";
            return (
              <div
                key={dayData.day}
                style={{
                  display: "grid",
                  gridTemplateColumns: "55px repeat(16, 1fr)",
                  gap: 4,
                  marginBottom: 4,
                  alignItems: "center",
                }}
              >
                {/* Day Label */}
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: isWeekend ? "var(--accent)" : "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {dayData.day}
                  {isWeekend && <span style={{ fontSize: 9, color: "var(--accent)" }}>★</span>}
                </div>

                {/* 16 Hourly Cells */}
                {operatingHours.map((h) => {
                  const cell = dayData.hours.find((c) => c.hour === h) || {
                    day_idx: dayData.day_idx,
                    day: dayData.day,
                    hour: h,
                    label: `${h < 10 ? "0" + h : h}:00`,
                    orders: 0,
                    revenue: 0,
                    intensity_score: 0,
                  };

                  const isPeak = cell.intensity_score >= 60;
                  const isHovered =
                    hoveredCell?.day === cell.day && hoveredCell?.hour === cell.hour;

                  return (
                    <div
                      key={h}
                      onMouseEnter={(e) => {
                        setHoveredCell(cell);
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
                      }}
                      onMouseLeave={() => setHoveredCell(null)}
                      style={{
                        height: 32,
                        borderRadius: 4,
                        background: getCellBg(cell.intensity_score, cell.orders),
                        color: getCellTextColor(cell.intensity_score, cell.orders),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 800,
                        cursor: "pointer",
                        border: isHovered
                          ? "2px solid #ffffff"
                          : isPeak
                          ? "1px solid rgba(245, 158, 11, 0.4)"
                          : "1px solid rgba(255, 255, 255, 0.05)",
                        transform: isHovered ? "scale(1.12)" : "scale(1)",
                        transition: "transform 0.15s ease, border 0.15s ease",
                        zIndex: isHovered ? 10 : 1,
                      }}
                    >
                      {cell.orders > 0 ? cell.orders : "·"}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Interactive Floating Tooltip */}
      {hoveredCell && (
        <div
          style={{
            position: "fixed",
            left: tooltipPos.x,
            top: tooltipPos.y - 120,
            transform: "translateX(-50%)",
            background: "#0f172a",
            color: "#ffffff",
            border: "1px solid rgba(245, 158, 11, 0.4)",
            borderRadius: "var(--radius-md)",
            padding: "10px 14px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
            pointerEvents: "none",
            minWidth: 190,
            fontSize: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontWeight: 800, color: "var(--accent)" }}>
              {hoveredCell.day} at {hoveredCell.label}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 4,
                background:
                  hoveredCell.intensity_score >= 80
                    ? "rgba(239, 68, 68, 0.3)"
                    : hoveredCell.intensity_score >= 50
                    ? "rgba(245, 158, 11, 0.3)"
                    : "rgba(59, 130, 246, 0.3)",
                color:
                  hoveredCell.intensity_score >= 80
                    ? "#ef4444"
                    : hoveredCell.intensity_score >= 50
                    ? "#f59e0b"
                    : "#3b82f6",
              }}
            >
              {hoveredCell.intensity_score >= 80
                ? "🔥 Super Rush"
                : hoveredCell.intensity_score >= 50
                ? "⚡ Peak Rush"
                : hoveredCell.orders > 0
                ? "☕ Steady"
                : "⚪ Off-Peak"}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1" }}>
              <span>Total Orders:</span>
              <strong style={{ color: "#ffffff" }}>{hoveredCell.orders} orders</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1" }}>
              <span>Estimated Revenue:</span>
              <strong style={{ color: "#10b981" }}>${hoveredCell.revenue.toFixed(2)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1" }}>
              <span>Erlang-C Staff Needed:</span>
              <strong style={{ color: "#f59e0b" }}>
                {hoveredCell.intensity_score >= 70 ? "2 Servers (Full)" : hoveredCell.orders > 5 ? "2 Servers" : "1 Server"}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* 4. Heatmap Legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 14,
          paddingTop: 10,
          borderTop: "1px solid var(--border-subtle)",
          fontSize: 11,
          color: "var(--text-muted)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Info size={13} />
          <span>Intensity is computed relative to all-time historical hourly order volume.</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span>Low</span>
          <span style={{ width: 14, height: 14, borderRadius: 2, background: "rgba(30, 41, 59, 0.45)" }} />
          <span style={{ width: 14, height: 14, borderRadius: 2, background: "rgba(59, 130, 246, 0.35)" }} />
          <span style={{ width: 14, height: 14, borderRadius: 2, background: "rgba(59, 130, 246, 0.85)" }} />
          <span style={{ width: 14, height: 14, borderRadius: 2, background: "rgba(245, 158, 11, 0.88)" }} />
          <span style={{ width: 14, height: 14, borderRadius: 2, background: "rgba(239, 68, 68, 0.95)" }} />
          <span>Super Rush</span>
        </div>
      </div>
    </div>
  );
}
