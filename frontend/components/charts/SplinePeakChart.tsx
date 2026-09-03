"use client";

import React, { useState } from "react";

export interface OperatingHourItem {
  hour: number;
  label: string;
  total_orders: number;
  avg_orders_per_hr: number;
  hourly_revenue: number;
  estimated_hourly_revenue?: number;
  hourly_labor_cost?: number;
  net_labor_profit?: number;
  profit_margin_percent?: number;
  margin_rating?: string;
  peak_intensity_score: number;
  effective_arrival_rate: number;
  recommended_staff: number;
  rush_category: "PEAK_RUSH" | "MODERATE" | "OFF_PEAK";
}

interface SplinePeakChartProps {
  hours: OperatingHourItem[];
  maxOrders: number;
}

// Generate smooth cubic bezier curve through points (Catmull-Rom to Cubic Bezier)
function generateSplinePath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 5.5;
    const cp1y = p1.y + (p2.y - p0.y) / 5.5;
    const cp2x = p2.x - (p3.x - p1.x) / 5.5;
    const cp2y = p2.y - (p3.y - p1.y) / 5.5;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

export default function SplinePeakChart({ hours, maxOrders }: SplinePeakChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!hours || hours.length === 0) {
    return <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>No order data available</div>;
  }

  const svgWidth = 900;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingTop = 30;
  const paddingBottom = 40;
  const graphHeight = svgHeight - paddingTop - paddingBottom;
  const graphWidth = svgWidth - paddingX * 2;

  const effectiveMax = Math.max(maxOrders, 1);

  // Compute (x, y) coordinates for each hour point
  const points = hours.map((h, i) => {
    const x = paddingX + (i / (hours.length - 1)) * graphWidth;
    const normalizedY = (h.total_orders / effectiveMax);
    const y = paddingTop + graphHeight - normalizedY * (graphHeight - 15);
    return { x, y, hour: h };
  });

  const curvePath = generateSplinePath(points);
  const baselineY = paddingTop + graphHeight;
  const areaPath = `${curvePath} L ${points[points.length - 1].x},${baselineY} L ${points[0].x},${baselineY} Z`;

  const hoveredPoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ width: "100%", height: "auto", minWidth: 600, display: "block" }}
      >
        <defs>
          {/* Glowing Area Fill Gradient */}
          <linearGradient id="splineAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>

          {/* Stroke Gradient */}
          <linearGradient id="splineStrokeGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="25%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="85%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>

          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Horizontal Grid lines */}
        {[0.25, 0.5, 0.75, 1.0].map((fraction, idx) => {
          const gridY = paddingTop + graphHeight - fraction * (graphHeight - 15);
          const orderValue = Math.round(fraction * effectiveMax);
          return (
            <g key={idx}>
              <line
                x1={paddingX}
                y1={gridY}
                x2={svgWidth - paddingX}
                y2={gridY}
                stroke="var(--border)"
                strokeDasharray="4 4"
                strokeOpacity="0.6"
              />
              <text
                x={paddingX - 8}
                y={gridY + 4}
                fill="var(--text-faint)"
                fontSize="10"
                textAnchor="end"
                fontWeight="500"
              >
                {orderValue}
              </text>
            </g>
          );
        })}

        {/* Baseline */}
        <line
          x1={paddingX}
          y1={baselineY}
          x2={svgWidth - paddingX}
          y2={baselineY}
          stroke="var(--border)"
          strokeWidth="1.5"
        />

        {/* Gradient Under-Fill Area */}
        <path d={areaPath} fill="url(#splineAreaGradient)" />

        {/* Spline Glowing Stroke Line */}
        <path
          d={curvePath}
          fill="none"
          stroke="url(#splineStrokeGradient)"
          strokeWidth="3.5"
          filter="url(#glow)"
        />

        {/* Interactive Dots on each point */}
        {points.map((pt, i) => {
          const h = pt.hour;
          const heightPercent = effectiveMax > 0 ? (h.total_orders / effectiveMax) * 100 : 0;
          const isPeak = h.rush_category === "PEAK_RUSH" || heightPercent >= 70 || h.total_orders >= 160;
          const isMod = !isPeak && (h.rush_category === "MODERATE" || heightPercent >= 45 || h.total_orders >= 95);
          const isHovered = hoveredIdx === i;

          let dotColor = "var(--border)";
          let dotRadius = 3.5;
          let staffLabel = `${h.recommended_staff || 1}p`;

          if (isPeak) {
            dotColor = "#f59e0b";
            dotRadius = isHovered ? 7 : 5;
            staffLabel = `${h.recommended_staff || 1}p`;
          } else if (isMod) {
            dotColor = "#3b82f6";
            dotRadius = isHovered ? 6 : 4;
            staffLabel = `${h.recommended_staff || 1}p`;
          }

          return (
            <g
              key={i}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Vertical Guide Line on Hover */}
              {isHovered && (
                <line
                  x1={pt.x}
                  y1={paddingTop}
                  x2={pt.x}
                  y2={baselineY}
                  stroke="var(--accent)"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              )}

              {/* Staff Headcount pill above point */}
              <text
                x={pt.x}
                y={pt.y - (isPeak ? 12 : 9)}
                fill={isPeak ? "#f59e0b" : isMod ? "#3b82f6" : "var(--text-muted)"}
                fontSize={isPeak ? "11" : "10"}
                fontWeight="800"
                textAnchor="middle"
              >
                {staffLabel}
              </text>

              {/* Outer halo */}
              {(isPeak || isHovered) && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={dotRadius + 4}
                  fill={dotColor}
                  opacity={isHovered ? 0.35 : 0.2}
                />
              )}

              {/* Core circle */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={dotRadius}
                fill={dotColor}
                stroke="var(--bg-card)"
                strokeWidth="2"
              />

              {/* X-Axis Hour Label */}
              <text
                x={pt.x}
                y={baselineY + 16}
                fill={isHovered ? "var(--accent)" : "var(--text-primary)"}
                fontSize="10"
                fontWeight={isHovered ? "800" : "600"}
                textAnchor="middle"
              >
                {h.label}
              </text>

              {/* Order Count Label */}
              <text
                x={pt.x}
                y={baselineY + 28}
                fill={isPeak ? "#f59e0b" : "var(--text-muted)"}
                fontSize="9"
                fontWeight={isPeak ? "700" : "500"}
                textAnchor="middle"
              >
                {h.total_orders}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip card */}
      {hoveredPoint && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--bg-card)",
            border: "1px solid var(--accent)",
            boxShadow: "var(--shadow-md)",
            borderRadius: "var(--radius-md)",
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                {hoveredPoint.hour.label} Rush
              </span>
              <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 6 }}>
                • {hoveredPoint.hour.total_orders} Orders (${(hoveredPoint.hour.estimated_hourly_revenue || hoveredPoint.hour.hourly_revenue).toFixed(2)})
              </span>
            </div>

            {/* Profit Margin Badge */}
            {hoveredPoint.hour.profit_margin_percent !== undefined && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "var(--radius-sm)",
                  background:
                    hoveredPoint.hour.profit_margin_percent >= 80
                      ? "rgba(16, 185, 129, 0.15)"
                      : hoveredPoint.hour.profit_margin_percent >= 60
                      ? "rgba(245, 158, 11, 0.15)"
                      : "rgba(100, 116, 139, 0.15)",
                  color:
                    hoveredPoint.hour.profit_margin_percent >= 80
                      ? "#10b981"
                      : hoveredPoint.hour.profit_margin_percent >= 60
                      ? "#f59e0b"
                      : "#94a3b8",
                  border: `1px solid ${
                    hoveredPoint.hour.profit_margin_percent >= 80
                      ? "rgba(16, 185, 129, 0.3)"
                      : hoveredPoint.hour.profit_margin_percent >= 60
                      ? "rgba(245, 158, 11, 0.3)"
                      : "rgba(100, 116, 139, 0.3)"
                  }`,
                }}
              >
                Margin: {hoveredPoint.hour.profit_margin_percent}% 🟢
              </span>
            )}

            <span
              className="badge"
              style={{
                background: hoveredPoint.hour.rush_category === "PEAK_RUSH" ? "var(--warning-glow)" : "var(--info-glow)",
                color: hoveredPoint.hour.rush_category === "PEAK_RUSH" ? "var(--warning)" : "var(--info)",
              }}
            >
              {hoveredPoint.hour.recommended_staff} Staff (${(hoveredPoint.hour.hourly_labor_cost || hoveredPoint.hour.recommended_staff * 15).toFixed(0)} labor)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
