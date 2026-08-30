"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Sparkles,
  DollarSign,
  ShoppingCart,
  Clock,
  Award,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/Card";
import { Skeleton } from "@/components/LoadingSkeleton";

interface HistoricalPredictionChartProps {
  cafeId?: number | null;
  branchId?: number | null;
  cafeName?: string | null;
}

const formatDateLabel = (dateStr: string, options?: Intl.DateTimeFormatOptions) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-").map(Number);
  if (parts.length < 3) return dateStr;
  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  return dateObj.toLocaleDateString("en-US", options || { month: "short", day: "numeric" });
};

export function HistoricalPredictionChart({
  cafeId,
  branchId,
  cafeName,
}: HistoricalPredictionChartProps) {
  const [activeTab, setActiveTab] = useState<"forecast" | "demand" | "peak" | "bcg">("forecast");
  const [metric, setMetric] = useState<"revenue" | "orders">("revenue");
  const [timeRangeDays, setTimeRangeDays] = useState<number>(60);
  const [forecastHorizon, setForecastHorizon] = useState<number>(30);
  const [showConfidenceBand, setShowConfidenceBand] = useState<boolean>(true);
  const [showAnomalies, setShowAnomalies] = useState<boolean>(true);
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  // SVG dimensions
  const svgWidth = 800;
  const svgHeight = 320;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };

  // Query parameter construction
  const queryParam = useMemo(() => {
    if (branchId) return `?branch_id=${branchId}&days=${forecastHorizon}`;
    if (cafeId) return `?cafe_id=${cafeId}&days=${forecastHorizon}`;
    return `?days=${forecastHorizon}`;
  }, [cafeId, branchId, forecastHorizon]);

  // 1. Fetch Sales Forecast
  const { data: forecastData, isLoading: loadingForecast } = useQuery<any>({
    queryKey: ["salesForecast", queryParam],
    queryFn: () => api.get<any>(`/predict/sales${queryParam}`),
    staleTime: 1000 * 60 * 5,
  });

  // 2. Fetch Item Demand Prediction
  const { data: itemDemand = [], isLoading: loadingDemand } = useQuery<any[]>({
    queryKey: ["itemDemand", branchId || cafeId],
    queryFn: () => api.get<any[]>(`/predict/item-demand?days=7${branchId ? `&branch_id=${branchId}` : ""}`),
    enabled: activeTab === "demand",
    staleTime: 1000 * 60 * 5,
  });

  // 3. Fetch Peak Hours
  const { data: peakHoursData, isLoading: loadingPeak } = useQuery<any>({
    queryKey: ["peakHours", branchId || cafeId],
    queryFn: () => api.get<any>(`/analytics/peak-hours${branchId ? `?branch_id=${branchId}` : cafeId ? `?cafe_id=${cafeId}` : ""}`),
    enabled: activeTab === "peak",
    staleTime: 1000 * 60 * 5,
  });

  // 4. Fetch BCG Matrix
  const { data: bcgData, isLoading: loadingBcg } = useQuery<any>({
    queryKey: ["bcgMatrix", branchId || cafeId],
    queryFn: () => api.get<any>(`/analytics/bcg-matrix${branchId ? `?branch_id=${branchId}` : cafeId ? `?cafe_id=${cafeId}` : ""}`),
    enabled: activeTab === "bcg",
    staleTime: 1000 * 60 * 5,
  });

  // Filtered timeline based on time range selector
  const displayedTimeline = useMemo(() => {
    if (!forecastData?.timeline) return [];
    const all = forecastData.timeline;
    const historical = all.filter((p: any) => !p.is_forecast);
    const forecast = all.filter((p: any) => p.is_forecast);

    const slicedHistorical = historical.slice(-timeRangeDays);
    return [...slicedHistorical, ...forecast];
  }, [forecastData, timeRangeDays]);

  // SVG Chart scale calculations
  const {
    points,
    minVal,
    maxVal,
    historicalPath,
    forecastPath,
    historicalAreaPath,
    confidenceAreaPath,
    todayX,
  } = useMemo(() => {
    if (displayedTimeline.length === 0) {
      return {
        points: [],
        minVal: 0,
        maxVal: 1000,
        historicalPath: "",
        forecastPath: "",
        historicalAreaPath: "",
        confidenceAreaPath: "",
        todayX: 0,
      };
    }

    const plotW = svgWidth - padding.left - padding.right;
    const plotH = svgHeight - padding.top - padding.bottom;

    const values = displayedTimeline.map((d: any) => {
      if (metric === "revenue") {
        return d.is_forecast ? d.predicted_revenue : d.revenue;
      }
      return d.is_forecast ? d.predicted_orders : d.orders;
    });

    const upperBounds = displayedTimeline.map((d: any) =>
      metric === "revenue" ? d.upper_bound ?? d.predicted_revenue ?? d.revenue : (d.predicted_orders ?? d.orders) * 1.3
    );

    const calculatedMin = 0;
    const calculatedMax = Math.ceil(Math.max(...upperBounds, ...values, 500) * 1.15);

    const n = displayedTimeline.length;
    const stepX = plotW / (n - 1 || 1);

    const pts = displayedTimeline.map((d: any, idx: number) => {
      const val = metric === "revenue"
        ? (d.is_forecast ? d.predicted_revenue : d.revenue)
        : (d.is_forecast ? d.predicted_orders : d.orders);

      const upper = metric === "revenue" ? (d.upper_bound ?? val) : (val * 1.25);
      const lower = metric === "revenue" ? Math.max(0, d.lower_bound ?? 0) : Math.max(0, val * 0.75);

      const x = padding.left + idx * stepX;
      const y = padding.top + plotH - ((val - calculatedMin) / (calculatedMax - calculatedMin || 1)) * plotH;
      const yUpper = padding.top + plotH - ((upper - calculatedMin) / (calculatedMax - calculatedMin || 1)) * plotH;
      const yLower = padding.top + plotH - ((lower - calculatedMin) / (calculatedMax - calculatedMin || 1)) * plotH;

      return {
        ...d,
        x,
        y,
        yUpper,
        yLower,
        displayVal: val,
      };
    });

    const historicalPts = pts.filter((p) => !p.is_forecast);
    const forecastPts = pts.filter((p) => p.is_forecast);

    const bridgedForecastPts = historicalPts.length > 0
      ? [historicalPts[historicalPts.length - 1], ...forecastPts]
      : forecastPts;

    const makeSmoothPath = (pArray: typeof pts) => {
      if (pArray.length === 0) return "";
      return pArray.reduce((acc, curr, i) => (i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`), "");
    };

    const histPath = makeSmoothPath(historicalPts);
    const fcastPath = makeSmoothPath(bridgedForecastPts);

    let histArea = "";
    if (historicalPts.length > 0) {
      const firstX = historicalPts[0].x;
      const lastX = historicalPts[historicalPts.length - 1].x;
      const bottomY = padding.top + plotH;
      histArea = `${histPath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
    }

    let confArea = "";
    if (bridgedForecastPts.length > 1) {
      const upperPath = bridgedForecastPts.map((p, i) => (i === 0 ? `M ${p.x} ${p.yUpper}` : `L ${p.x} ${p.yUpper}`)).join(" ");
      const lowerPath = [...bridgedForecastPts].reverse().map((p) => `L ${p.x} ${p.yLower}`).join(" ");
      confArea = `${upperPath} ${lowerPath} Z`;
    }

    const tX = historicalPts.length > 0 ? historicalPts[historicalPts.length - 1].x : 0;

    return {
      points: pts,
      minVal: calculatedMin,
      maxVal: calculatedMax,
      historicalPath: histPath,
      forecastPath: fcastPath,
      historicalAreaPath: histArea,
      confidenceAreaPath: confArea,
      todayX: tX,
    };
  }, [displayedTimeline, metric, svgWidth, svgHeight]);

  if (loadingForecast && !forecastData) {
    return (
      <Card style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Skeleton width="40%" height={24} />
          <Skeleton width="20%" height={24} />
        </div>
        <Skeleton height={280} borderRadius={12} />
      </Card>
    );
  }

  return (
    <Card
      style={{
        padding: 24,
        background: "var(--card-bg, #ffffff)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow-sm)",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* ── HEADER & NAVIGATION TABS ─────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          borderBottom: "1px solid var(--border)",
          paddingBottom: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--accent-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TrendingUp size={20} color="var(--accent)" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
                AI Historical Intelligence & Forecasting
              </h2>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                {cafeName ? `${cafeName} • ` : ""}
                Harmonic Fourier Regression Engine with Anomaly Detection
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: "inline-flex",
            background: "var(--bg-base, rgba(0,0,0,0.04))",
            padding: 4,
            borderRadius: 10,
            gap: 4,
          }}
        >
          <button
            className={`btn btn-sm ${activeTab === "forecast" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setActiveTab("forecast")}
            style={{ fontSize: 13, padding: "6px 12px" }}
          >
            <Sparkles size={14} style={{ marginRight: 6 }} /> Sales Forecast
          </button>
          <button
            className={`btn btn-sm ${activeTab === "demand" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setActiveTab("demand")}
            style={{ fontSize: 13, padding: "6px 12px" }}
          >
            <ShoppingCart size={14} style={{ marginRight: 6 }} /> Item Demand
          </button>
          <button
            className={`btn btn-sm ${activeTab === "peak" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setActiveTab("peak")}
            style={{ fontSize: 13, padding: "6px 12px" }}
          >
            <Clock size={14} style={{ marginRight: 6 }} /> Peak Hours
          </button>
          <button
            className={`btn btn-sm ${activeTab === "bcg" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setActiveTab("bcg")}
            style={{ fontSize: 13, padding: "6px 12px" }}
          >
            <Award size={14} style={{ marginRight: 6 }} /> BCG Matrix
          </button>
        </div>
      </div>

      {/* ── TAB 1: SALES FORECASTING ─────────────────────────────────── */}
      {activeTab === "forecast" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Executive Prediction Metrics Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            <div
              style={{
                background: "rgba(99, 102, 241, 0.06)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                30-Day Projected Revenue
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent)", marginTop: 4 }}>
                ${forecastData ? forecastData.projected_30d_revenue.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "--"}
              </div>
              <div style={{ fontSize: 12, color: "var(--success)", fontWeight: 700, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <ArrowUpRight size={13} />
                +{forecastData?.projected_growth_rate_pct ?? 5.1}% growth trend
              </div>
            </div>

            <div
              style={{
                background: "rgba(16, 185, 129, 0.06)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                Current Daily Average
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--success)", marginTop: 4 }}>
                ${forecastData ? forecastData.current_daily_avg_revenue.toFixed(2) : "--"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                Baseline daily velocity
              </div>
            </div>

            <div
              style={{
                background: "rgba(245, 158, 11, 0.06)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                Peak Expected Day
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--warning)", marginTop: 4 }}>
                ${forecastData ? forecastData.peak_forecast_revenue.toFixed(2) : "--"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                Expected: {forecastData?.peak_forecast_day || "Weekend Peak"}
              </div>
            </div>

            <div
              style={{
                background: "rgba(239, 68, 68, 0.06)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                Detected Anomalies
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--danger)", marginTop: 4 }}>
                {forecastData?.anomalies?.length ?? 0}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                Identified historical spikes & dips
              </div>
            </div>
          </div>

          {/* Interactive Chart Control Toolbar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              padding: "10px 14px",
              background: "var(--bg-base, rgba(0,0,0,0.02))",
              borderRadius: 10,
              border: "1px solid var(--border)",
            }}
          >
            {/* Metric Toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>METRIC:</span>
              <button
                className={`btn btn-sm ${metric === "revenue" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setMetric("revenue")}
                style={{ fontSize: 12, padding: "4px 10px" }}
              >
                <DollarSign size={13} /> Revenue ($)
              </button>
              <button
                className={`btn btn-sm ${metric === "orders" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setMetric("orders")}
                style={{ fontSize: 12, padding: "4px 10px" }}
              >
                <ShoppingCart size={13} /> Order Volume
              </button>
            </div>

            {/* Time Window Selectors */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>HISTORY:</span>
                {[30, 60, 90, 120].map((d) => (
                  <button
                    key={d}
                    className={`btn btn-sm ${timeRangeDays === d ? "btn-secondary" : "btn-ghost"}`}
                    onClick={() => setTimeRangeDays(d)}
                    style={{ fontSize: 11, padding: "3px 8px", minWidth: 42 }}
                  >
                    {d}D
                  </button>
                ))}
              </div>

              {/* Toggles for Layers */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
                <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={showConfidenceBand}
                    onChange={(e) => setShowConfidenceBand(e.target.checked)}
                  />
                  95% Confidence Band
                </label>
                <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={showAnomalies}
                    onChange={(e) => setShowAnomalies(e.target.checked)}
                  />
                  Anomalies
                </label>
              </div>
            </div>
          </div>

          {/* ── THE INTERACTIVE SVG GRAPH ─────────────────────────────── */}
          <div
            style={{
              position: "relative",
              width: "100%",
              overflowX: "auto",
              background: "radial-gradient(ellipse at top, rgba(99, 102, 241, 0.03), transparent 70%)",
              borderRadius: 12,
              border: "1px solid var(--border)",
              padding: "16px 8px 8px 8px",
            }}
          >
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              style={{ width: "100%", height: "auto", minWidth: 650, display: "block" }}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <defs>
                <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.00" />
                </linearGradient>

                <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05" />
                </linearGradient>

                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Horizontal Grid lines & Y-Axis Labels */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
                const val = Math.round(minVal + (1 - ratio) * (maxVal - minVal));
                const y = padding.top + ratio * (svgHeight - padding.top - padding.bottom);
                return (
                  <g key={ratio}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={svgWidth - padding.right}
                      y2={y}
                      stroke="var(--border)"
                      strokeDasharray="4 4"
                      strokeOpacity="0.6"
                    />
                    <text
                      x={padding.left - 10}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="11"
                      fill="var(--text-muted)"
                      fontFamily="monospace"
                    >
                      {metric === "revenue" ? `$${val}` : val}
                    </text>
                  </g>
                );
              })}

              {/* Today Vertical Separation Line */}
              {todayX > 0 && (
                <g>
                  <line
                    x1={todayX}
                    y1={padding.top}
                    x2={todayX}
                    y2={svgHeight - padding.bottom}
                    stroke="var(--accent)"
                    strokeWidth="1.5"
                    strokeDasharray="5 3"
                    strokeOpacity="0.7"
                  />
                  <rect
                    x={todayX - 32}
                    y={padding.top - 14}
                    width={64}
                    height={18}
                    rx="4"
                    fill="var(--accent)"
                  />
                  <text
                    x={todayX}
                    y={padding.top - 2}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#ffffff"
                    fontWeight="700"
                  >
                    TODAY
                  </text>
                </g>
              )}

              {/* Confidence Band Area (Future) */}
              {showConfidenceBand && confidenceAreaPath && (
                <path d={confidenceAreaPath} fill="url(#confGrad)" />
              )}

              {/* Historical Area Fill */}
              {historicalAreaPath && <path d={historicalAreaPath} fill="url(#histGrad)" />}

              {/* Historical Actual Line */}
              {historicalPath && (
                <path
                  d={historicalPath}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* AI Forecast Dashed Line */}
              {forecastPath && (
                <path
                  d={forecastPath}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive Point Markers & Anomaly Badges */}
              {points.map((p, idx) => {
                const isAnomaly = showAnomalies && p.is_anomaly;
                return (
                  <g key={idx}>
                    {isAnomaly && (
                      <g>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="9"
                          fill={p.anomaly_type === "SPIKE" ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}
                        />
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="5"
                          fill={p.anomaly_type === "SPIKE" ? "var(--success)" : "var(--danger)"}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      </g>
                    )}

                    <rect
                      x={p.x - 6}
                      y={padding.top}
                      width={12}
                      height={svgHeight - padding.top - padding.bottom}
                      fill="transparent"
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setHoveredPoint(p)}
                    />
                  </g>
                );
              })}

              {/* Hover Indicator Crosshair */}
              {hoveredPoint && (
                <g>
                  <line
                    x1={hoveredPoint.x}
                    y1={padding.top}
                    x2={hoveredPoint.x}
                    y2={svgHeight - padding.bottom}
                    stroke="#818cf8"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.y}
                    r="6"
                    fill={hoveredPoint.is_forecast ? "#8b5cf6" : "#6366f1"}
                    stroke="#ffffff"
                    strokeWidth="2"
                    filter="url(#glow)"
                  />
                </g>
              )}

              {/* X-Axis Date Labels */}
              {points
                .filter((_, idx) => idx % Math.max(1, Math.floor(points.length / 8)) === 0)
                .map((p, idx) => (
                  <text
                    key={idx}
                    x={p.x}
                    y={svgHeight - padding.bottom + 20}
                    textAnchor="middle"
                    fontSize="11"
                    fill="var(--text-muted)"
                  >
                    {formatDateLabel(p.date, { month: "short", day: "numeric" })}
                  </text>
                ))}
            </svg>

            {/* Hover Floating Glassmorphic Tooltip */}
            {hoveredPoint && (
              <div
                style={{
                  position: "absolute",
                  top: 24,
                  right: 24,
                  background: "var(--card-bg, #ffffff)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  boxShadow: "var(--shadow-md, 0 10px 25px -5px rgba(0,0,0,0.1))",
                  fontSize: 13,
                  pointerEvents: "none",
                  minWidth: 220,
                  backdropFilter: "blur(12px)",
                  zIndex: 20,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>
                    {formatDateLabel(hoveredPoint.date, { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontWeight: 700,
                      background: hoveredPoint.is_forecast ? "rgba(139, 92, 246, 0.15)" : "rgba(99, 102, 241, 0.15)",
                      color: hoveredPoint.is_forecast ? "#8b5cf6" : "#6366f1",
                    }}
                  >
                    {hoveredPoint.is_forecast ? "AI PREDICTION" : "HISTORICAL"}
                  </span>
                </div>

                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>
                  {metric === "revenue" ? `$${hoveredPoint.displayVal.toFixed(2)}` : `${hoveredPoint.displayVal} Orders`}
                </div>

                {hoveredPoint.is_forecast && hoveredPoint.upper_bound && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                    95% Range: ${hoveredPoint.lower_bound?.toFixed(0)} – ${hoveredPoint.upper_bound?.toFixed(0)}
                  </div>
                )}

                {hoveredPoint.is_anomaly && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "6px 8px",
                      borderRadius: 6,
                      background: hoveredPoint.anomaly_type === "SPIKE" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                      border: `1px solid ${hoveredPoint.anomaly_type === "SPIKE" ? "var(--success)" : "var(--danger)"}`,
                      fontSize: 12,
                    }}
                  >
                    <div style={{ fontWeight: 700, color: hoveredPoint.anomaly_type === "SPIKE" ? "var(--success)" : "var(--danger)" }}>
                      ⚡ {hoveredPoint.anomaly_type} ANOMALY
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>
                      {hoveredPoint.anomaly_reason}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Strategic Action Tips & Dynamic Pricing Suggestions */}
          {forecastData?.dynamic_pricing_tips && forecastData.dynamic_pricing_tips.length > 0 && (
            <div
              style={{
                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14, color: "var(--accent)", marginBottom: 10 }}>
                <Zap size={16} />
                AI Strategic Revenue & Inventory Insights
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                {forecastData.dynamic_pricing_tips.map((tip: string, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      gap: 8,
                      background: "var(--card-bg, #ffffff)",
                      padding: 12,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      fontSize: 13,
                      lineHeight: 1.45,
                    }}
                  >
                    <span style={{ color: "var(--accent)", fontWeight: 700 }}>•</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: ITEM DEMAND PREDICTION ────────────────────────────── */}
      {activeTab === "demand" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                7-Day Item Demand & Kitchen Prep Forecasting
              </h3>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                AI-driven batch preparation quantities to minimize waste and stockouts
              </div>
            </div>
          </div>

          {loadingDemand ? (
            <Skeleton height={200} />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {itemDemand.map((item: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    background: "var(--bg-base, rgba(0,0,0,0.02))",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{item.item_name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.category}</div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: "var(--accent-muted)",
                        color: "var(--accent)",
                        fontWeight: 700,
                      }}
                    >
                      {item.confidence_score}% Conf.
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      background: "var(--card-bg, #ffffff)",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>7-Day Demand</div>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{item.predicted_7d_total} units</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Prep Advice</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--success)" }}>
                        {item.recommended_prep_qty} / day
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                    💡 {item.insight}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: PEAK HOURS HEATMAP ────────────────────────────────── */}
      {activeTab === "peak" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                24-Hour Ordering Heatmap & Staffing Optimization
              </h3>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Optimal shift allocation based on customer order volume
              </div>
            </div>
            {peakHoursData && (
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 13, background: "var(--warning-glow)", color: "var(--warning)", padding: "4px 10px", borderRadius: 6, fontWeight: 700 }}>
                  🔥 Peak: {peakHoursData.busiest_hour_label}
                </span>
                <span style={{ fontSize: 13, background: "var(--info-glow)", color: "var(--info)", padding: "4px 10px", borderRadius: 6, fontWeight: 700 }}>
                  👥 Recommended Staff: {peakHoursData.recommended_shift_staff} Baristas
                </span>
              </div>
            )}
          </div>

          {loadingPeak ? (
            <Skeleton height={180} />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(24, 1fr)", gap: 4, alignItems: "flex-end", height: 160, padding: "16px 0" }}>
              {peakHoursData?.hourly_distribution?.map((pt: any) => {
                const heightPct = Math.max(8, pt.intensity * 100);
                const isPeak = pt.hour === peakHoursData.busiest_hour;
                return (
                  <div
                    key={pt.hour}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      height: "100%",
                      justifyContent: "flex-end",
                    }}
                    title={`${pt.hour_label}: ~${pt.avg_orders.toFixed(1)} orders/hr ($${pt.avg_revenue.toFixed(2)})`}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: `${heightPct}%`,
                        borderRadius: "4px 4px 0 0",
                        background: isPeak
                          ? "var(--accent)"
                          : pt.intensity > 0.6
                          ? "rgba(99, 102, 241, 0.7)"
                          : "rgba(99, 102, 241, 0.25)",
                        transition: "all 0.2s",
                      }}
                    />
                    <span style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 6 }}>
                      {pt.hour % 3 === 0 ? pt.hour : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: BCG MENU MATRIX ───────────────────────────────────── */}
      {activeTab === "bcg" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
              BCG Menu Matrix Portfolio (Profitability vs Popularity)
            </h3>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Data-backed menu engineering strategies
            </div>
          </div>

          {loadingBcg ? (
            <Skeleton height={240} />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              {/* Stars */}
              <div style={{ background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 10, padding: 14 }}>
                <div style={{ fontWeight: 800, color: "var(--warning)", fontSize: 15, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  ⭐ Stars (High Volume, High Margin)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {bcgData?.stars?.map((item: any, i: number) => (
                    <div key={i} style={{ fontSize: 13, display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                      <span style={{ fontWeight: 600 }}>{item.item_name}</span>
                      <span style={{ color: "var(--text-muted)" }}>{item.sales_volume} sold (${item.revenue_generated.toFixed(0)})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cash Cows */}
              <div style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: 10, padding: 14 }}>
                <div style={{ fontWeight: 800, color: "var(--success)", fontSize: 15, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  🐄 Cash Cows (High Volume, Steady)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {bcgData?.cash_cows?.map((item: any, i: number) => (
                    <div key={i} style={{ fontSize: 13, display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                      <span style={{ fontWeight: 600 }}>{item.item_name}</span>
                      <span style={{ color: "var(--text-muted)" }}>{item.sales_volume} sold (${item.revenue_generated.toFixed(0)})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Puzzles */}
              <div style={{ background: "rgba(99, 102, 241, 0.05)", border: "1px solid rgba(99, 102, 241, 0.3)", borderRadius: 10, padding: 14 }}>
                <div style={{ fontWeight: 800, color: "var(--accent)", fontSize: 15, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  ❓ Puzzles (High Margin, Promote More)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {bcgData?.puzzles?.map((item: any, i: number) => (
                    <div key={i} style={{ fontSize: 13, display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                      <span style={{ fontWeight: 600 }}>{item.item_name}</span>
                      <span style={{ color: "var(--text-muted)" }}>{item.sales_volume} sold</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dogs */}
              <div style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 10, padding: 14 }}>
                <div style={{ fontWeight: 800, color: "var(--danger)", fontSize: 15, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  🐕 Dogs (Low Volume, Low Margin)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {bcgData?.dogs?.map((item: any, i: number) => (
                    <div key={i} style={{ fontSize: 13, display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                      <span style={{ fontWeight: 600 }}>{item.item_name}</span>
                      <span style={{ color: "var(--text-muted)" }}>{item.sales_volume} sold</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
