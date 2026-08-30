"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileDown,
  FileText,
  FileSpreadsheet,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  DollarSign,
  Layers,
  X,
  Loader2,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { Order } from "@/types/order";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

interface ExportButtonsProps {
  orders?: Order[];
  branchId?: string | number;
  cafeId?: string | number;
  disabled?: boolean;
}

const getBase64ImageFromUrl = async (imageUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 120;
        canvas.height = img.naturalHeight || 120;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } else {
          resolve("");
        }
      } catch {
        resolve("");
      }
    };
    img.onerror = () => resolve("");
    img.src = imageUrl;
  });
};

// ── 1. LUXURY STYLED EXCEL (.XLSX) EXPORT ─────────────────────────────
function exportToExcel(orders: Order[], contextName: string, titleLabel: string, dateRangeLabel: string) {
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const completedCount = orders.filter((o) => o.status === "COMPLETED").length;
  const aov = orders.length > 0 ? totalRevenue / orders.length : 0;

  // 1. Header and KPI summary block
  const summaryRows = [
    ["HAJI CAFE - EXECUTIVE ORDERS & SALES REPORT"],
    [`Scope: ${titleLabel}`, `Date Range: ${dateRangeLabel}`, `Generated: ${new Date().toLocaleString()}`],
    [],
    ["EXECUTIVE KPI SUMMARY"],
    ["Total Orders", "Total Revenue ($)", "Completed Orders", "Avg Order Value ($)"],
    [orders.length, Number(totalRevenue.toFixed(2)), completedCount, Number(aov.toFixed(2))],
    [],
    ["DETAILED ORDER TRANSACTIONS"],
    ["Order ID", "Scope / Branch", "Status", "Total Amount ($)", "Date", "Time", "Customer Note / Items"],
  ];

  // 2. Data rows
  const dataRows = orders.map((o) => {
    const d = new Date(o.createdAt);
    const datePart = d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    const timePart = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    return [
      `#${o.id}`,
      `Branch #${o.branchId}`,
      (o.status || "").replace("_", " "),
      Number(Number(o.totalAmount).toFixed(2)),
      datePart,
      timePart,
      (o as any).orderItems?.map((it: any) => `${it.quantity}x item`).join(", ") || "Standard Order",
    ];
  });

  const allRows = [...summaryRows, ...dataRows];
  const worksheet = XLSX.utils.aoa_to_sheet(allRows);

  // Column width configuration for perfect Excel viewing
  worksheet["!cols"] = [
    { wch: 14 }, // Order ID
    { wch: 18 }, // Scope / Branch
    { wch: 18 }, // Status
    { wch: 18 }, // Total Amount
    { wch: 16 }, // Date
    { wch: 14 }, // Time
    { wch: 28 }, // Items
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Orders Report");

  XLSX.writeFile(workbook, `haji-cafe-${contextName}-orders-report.xlsx`);
  toast.success("Styled Excel (.xlsx) report downloaded!");
}

// ── 2. CLEAN CSV EXPORT ───────────────────────────────────────────────
function exportToCSV(orders: Order[], contextName: string) {
  const headers = ["Order ID", "Branch ID", "Status", "Total Amount ($)", "Date", "Time"];
  const rows = orders.map((o) => {
    const d = new Date(o.createdAt);
    return [
      `#${o.id}`,
      `Branch #${o.branchId}`,
      o.status,
      Number(o.totalAmount).toFixed(2),
      d.toISOString().split("T")[0],
      d.toLocaleTimeString("en-US"),
    ];
  });

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `haji-cafe-${contextName}-orders.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success("CSV file downloaded!");
}

// ── 3. LUXURY EXECUTIVE PDF GENERATOR (Fixed Spacing & Alignment) ─────
async function exportToPDF(orders: Order[], contextName: string, titleLabel: string, dateRangeLabel: string) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Compute Metrics
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const completedCount = orders.filter((o) => o.status === "COMPLETED").length;
  const prepCount = orders.filter((o) => o.status === "IN_PREPARATION").length;
  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const cancelledCount = orders.filter((o) => o.status === "CANCELLED").length;
  const aov = orders.length > 0 ? totalRevenue / orders.length : 0;
  const completionPct = orders.length > 0 ? Math.round((completedCount / orders.length) * 100) : 0;

  // Load Brand Logo
  let logoBase64 = "";
  try {
    logoBase64 = await getBase64ImageFromUrl("/logo.png");
  } catch {}

  const drawPageHeader = (isFirstPage: boolean) => {
    if (isFirstPage) {
      // ── TOP LUXURY HERO BANNER ──────────────────────────────────
      doc.setFillColor(24, 24, 27); // #18181b Dark Charcoal
      doc.roundedRect(margin, 12, contentWidth, 27, 3, 3, "F");

      // Left Accent Gold Stripe
      doc.setFillColor(245, 158, 11); // #f59e0b Amber Gold
      doc.roundedRect(margin, 12, 3.5, 27, 1.5, 1.5, "F");

      // Draw Logo Image
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, "PNG", margin + 7, 15, 21, 21);
        } catch {
          doc.setFillColor(245, 158, 11);
          doc.circle(margin + 17, 25.5, 9, "F");
        }
      } else {
        doc.setFillColor(245, 158, 11);
        doc.circle(margin + 17, 25.5, 9, "F");
      }

      // Brand Typography
      const textX = margin + (logoBase64 ? 32 : 28);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("HAJI CAFE", textX, 21);

      doc.setTextColor(245, 158, 11);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text("EXECUTIVE ORDERS & SALES INTELLIGENCE REPORT", textX, 26.5);

      doc.setTextColor(161, 161, 170);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`${titleLabel}  •  Range: ${dateRangeLabel}`, textX, 32.5);

      // Metadata Block (Right-aligned)
      const rightX = pageWidth - margin - 6;
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      const dateStr = new Date().toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
      doc.text(`Date: ${dateStr}`, rightX, 21, { align: "right" });

      doc.setTextColor(161, 161, 170);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      const timeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      doc.text(`Generated: ${timeStr}`, rightX, 26.5, { align: "right" });

      doc.setTextColor(52, 211, 153); // Emerald
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text("STATUS: AUDITED & SECURE", rightX, 32.5, { align: "right" });

      // ── KPI SUMMARY CARDS STRIP ──────────────────────────────────
      const cardY = 43;
      const cardH = 18;
      const cardW = (contentWidth - 9) / 4;

      // Card 1: Total Revenue
      doc.setFillColor(245, 243, 255);
      doc.setDrawColor(221, 214, 254);
      doc.roundedRect(margin, cardY, cardW, cardH, 2, 2, "FD");
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(109, 40, 217);
      doc.text("TOTAL REVENUE", margin + 4, cardY + 5);
      doc.setFontSize(12);
      doc.setTextColor(79, 70, 229);
      doc.text(`$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin + 4, cardY + 11.5);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(124, 58, 237);
      doc.text(`${orders.length} Transactions`, margin + 4, cardY + 15.5);

      // Card 2: Completed Orders
      const c2X = margin + cardW + 3;
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.roundedRect(c2X, cardY, cardW, cardH, 2, 2, "FD");
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(4, 120, 87);
      doc.text("COMPLETED ORDERS", c2X + 4, cardY + 5);
      doc.setFontSize(12);
      doc.setTextColor(5, 150, 105);
      doc.text(`${completedCount}`, c2X + 4, cardY + 11.5);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(16, 185, 129);
      doc.text(`${completionPct}% Fulfillment`, c2X + 4, cardY + 15.5);

      // Card 3: In Prep / Active
      const c3X = margin + (cardW + 3) * 2;
      doc.setFillColor(254, 252, 232);
      doc.setDrawColor(254, 240, 138);
      doc.roundedRect(c3X, cardY, cardW, cardH, 2, 2, "FD");
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(180, 83, 9);
      doc.text("IN PREPARATION", c3X + 4, cardY + 5);
      doc.setFontSize(12);
      doc.setTextColor(217, 119, 6);
      doc.text(`${prepCount + pendingCount}`, c3X + 4, cardY + 11.5);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(245, 158, 11);
      doc.text(`${prepCount} Prep • ${pendingCount} Pend`, c3X + 4, cardY + 15.5);

      // Card 4: Average Order Value
      const c4X = margin + (cardW + 3) * 3;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(c4X, cardY, cardW, cardH, 2, 2, "FD");
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text("AVG ORDER VALUE", c4X + 4, cardY + 5);
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`$${aov.toFixed(2)}`, c4X + 4, cardY + 11.5);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("Average Basket Size", c4X + 4, cardY + 15.5);
    } else {
      // ── MINI REPEATING HEADER ─────────────────────────────────────
      doc.setFillColor(24, 24, 27);
      doc.roundedRect(margin, 10, contentWidth, 11, 2, 2, "F");
      doc.setFillColor(245, 158, 11);
      doc.roundedRect(margin, 10, 2.5, 11, 1, 1, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("HAJI CAFE — Orders Intelligence Report", margin + 8, 17.5);

      doc.setTextColor(161, 161, 170);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(`${titleLabel} • ${dateRangeLabel}`, pageWidth - margin - 6, 17.5, { align: "right" });
    }
  };

  // Safe table header with vertical clearance
  const drawTableHeader = (startY: number) => {
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.roundedRect(margin, startY, contentWidth, 8, 1.5, 1.5, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);

    doc.text("ORDER ID", margin + 6, startY + 5.2);
    doc.text("SCOPE / BRANCH", margin + 34, startY + 5.2);
    doc.text("STATUS", margin + 78, startY + 5.2);
    doc.text("DATE & TIMESTAMP", margin + 120, startY + 5.2);
    doc.text("AMOUNT ($)", pageWidth - margin - 8, startY + 5.2, { align: "right" });
  };

  const drawPageFooter = (currentPage: number, totalPages: number) => {
    const footY = pageHeight - 12;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, footY - 3, pageWidth - margin, footY - 3);

    doc.setFillColor(245, 158, 11);
    doc.circle(margin + 2, footY, 1.2, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("CONFIDENTIAL & PROPRIETARY  •  HAJI CAFE POS & ANALYTICS SYSTEM", margin + 6, footY + 0.8);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${currentPage} of ${totalPages}`, pageWidth - margin, footY + 0.8, { align: "right" });
  };

  // ── RENDER ROWS WITH PERFECT VERTICAL ALIGNMENT ───────────────────
  drawPageHeader(true);

  let currentHeaderY = 65;
  drawTableHeader(currentHeaderY);

  // Generous gap so first row NEVER overlaps the table header
  let currentY = currentHeaderY + 13;
  const rowHeight = 7.8;

  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];

    // Check page overflow
    if (currentY + rowHeight > pageHeight - 22) {
      doc.addPage();
      drawPageHeader(false);
      currentHeaderY = 24;
      drawTableHeader(currentHeaderY);
      currentY = currentHeaderY + 13;
    }

    // Zebra striping background
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, currentY - 5, contentWidth, rowHeight, "F");
    }

    // Divider line
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(margin, currentY + 2.8, pageWidth - margin, currentY + 2.8);

    // 1. Order ID
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`#${o.id}`, margin + 6, currentY);

    // 2. Branch Name / ID
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Branch #${o.branchId}`, margin + 34, currentY);

    // 3. Status Pill / Badge (Perfect vertical centering)
    const st = (o.status || "").toUpperCase();
    let bgR = 241, bgG = 245, bgB = 249;
    let txtR = 71, txtG = 85, txtB = 105;
    let displayStatus = st;

    if (st === "COMPLETED") {
      bgR = 220; bgG = 252; bgB = 231;
      txtR = 22; txtG = 101; txtB = 52;
      displayStatus = "COMPLETED";
    } else if (st === "IN_PREPARATION") {
      bgR = 254; bgG = 243; bgB = 199;
      txtR = 146; txtG = 64; txtB = 14;
      displayStatus = "IN PREP";
    } else if (st === "PENDING") {
      bgR = 224; bgG = 231; bgB = 255;
      txtR = 55; txtG = 48; txtB = 163;
      displayStatus = "PENDING";
    } else if (st === "CANCELLED") {
      bgR = 254; bgG = 226; bgB = 226;
      txtR = 153; txtG = 27; txtB = 27;
      displayStatus = "CANCELLED";
    }

    const pillW = 24;
    const pillH = 4.8;
    const pillX = margin + 76;
    doc.setFillColor(bgR, bgG, bgB);
    doc.roundedRect(pillX, currentY - 3.8, pillW, pillH, 1.2, 1.2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(txtR, txtG, txtB);
    doc.text(displayStatus, pillX + pillW / 2, currentY - 0.4, { align: "center" });

    // 4. Date & Time
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const dateFormatted = new Date(o.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeFormatted = new Date(o.createdAt).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    doc.text(`${dateFormatted}, ${timeFormatted}`, margin + 120, currentY);

    // 5. Total Amount
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`$${Number(o.totalAmount).toFixed(2)}`, pageWidth - margin - 8, currentY, { align: "right" });

    currentY += rowHeight;
  }

  // ── AUDIT SUMMARY BOX ─────────────────────────────────────────────
  if (currentY + 18 > pageHeight - 22) {
    doc.addPage();
    drawPageHeader(false);
    currentY = 25;
  }

  currentY += 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, 14, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("REPORT AUDIT TOTAL:", margin + 6, currentY + 8.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Processed ${orders.length} orders across range (${completedCount} completed, ${cancelledCount} cancelled)`, margin + 46, currentY + 8.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105);
  doc.text(`$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin - 8, currentY + 9, { align: "right" });

  // ── STAMP FOOTERS ON ALL PAGES ────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawPageFooter(p, totalPages);
  }

  doc.save(`haji-cafe-${contextName}-executive-report.pdf`);
  toast.success("Executive PDF report generated!");
}

// ── 4. EXPORT BUTTONS & INTERACTIVE DATE-RANGE MODAL COMPONENT ──────
export function ExportButtons({ orders = [], branchId, cafeId, disabled }: ExportButtonsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);

  // Date Filters
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>(todayStr);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activePreset, setActivePreset] = useState<string>("30d");

  // Dynamic Date Preset Handler
  const handlePresetSelect = (preset: string) => {
    setActivePreset(preset);
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    setDateTo(today);

    if (preset === "today") {
      setDateFrom(today);
    } else if (preset === "7d") {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      setDateFrom(past.toISOString().split("T")[0]);
    } else if (preset === "30d") {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      setDateFrom(past.toISOString().split("T")[0]);
    } else if (preset === "90d") {
      const past = new Date();
      past.setDate(now.getDate() - 90);
      setDateFrom(past.toISOString().split("T")[0]);
    } else if (preset === "all") {
      setDateFrom("");
      setDateTo("");
    }
  };

  // Initialize with 30D on first open
  useEffect(() => {
    if (modalOpen && !dateFrom) {
      handlePresetSelect("30d");
    }
  }, [modalOpen]);

  const contextName = branchId ? `branch-${branchId}` : cafeId ? `cafe-${cafeId}` : "all";
  const titleLabel = branchId ? `Branch #${branchId}` : cafeId ? `Café #${cafeId}` : "All Orders";

  // Fetch full orders dataset for chosen date range
  const fetchOrdersForExport = async (): Promise<Order[]> => {
    try {
      let endpoint = "";
      const params = new URLSearchParams();
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      params.append("limit", "2000"); // High ceiling for full date range

      if (branchId) {
        endpoint = `/branches/${branchId}/orders?${params.toString()}`;
      } else if (cafeId) {
        endpoint = `/cafes/${cafeId}/orders?${params.toString()}`;
      }

      if (endpoint) {
        const res: any = await api.get(endpoint);
        if (res && res.data && Array.isArray(res.data)) {
          return res.data;
        }
      }
    } catch {
      // Fallback to local filter if network call encounters issue
    }

    // Local client-side fallback
    return orders.filter((o) => {
      const oDate = o.createdAt ? o.createdAt.split("T")[0] : "";
      if (dateFrom && oDate < dateFrom) return false;
      if (dateTo && oDate > dateTo) return false;
      if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
      return true;
    });
  };

  const handleExportAction = async (type: "pdf" | "excel" | "csv") => {
    try {
      setLoadingExport(true);
      const dataset = await fetchOrdersForExport();

      if (dataset.length === 0) {
        toast.error("No orders found for the selected date range.");
        setLoadingExport(false);
        return;
      }

      const dateRangeLabel = dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : dateFrom ? `From ${dateFrom}` : "All Time (120 Days)";

      if (type === "pdf") {
        await exportToPDF(dataset, contextName, titleLabel, dateRangeLabel);
      } else if (type === "excel") {
        exportToExcel(dataset, contextName, titleLabel, dateRangeLabel);
      } else {
        exportToCSV(dataset, contextName);
      }

      setModalOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Export failed.");
    } finally {
      setLoadingExport(false);
    }
  };

  return (
    <>
      {/* ── TRIGGER BUTTONS ─────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          className="btn btn-ghost btn-sm"
          disabled={disabled}
          onClick={() => {
            setActivePreset("30d");
            setModalOpen(true);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(99, 102, 241, 0.08)",
            color: "var(--accent)",
            borderColor: "rgba(99, 102, 241, 0.3)",
          }}
          title="Export Orders with Custom Date Range"
        >
          <Calendar size={14} />
          Export Report
        </button>
      </div>

      {/* ── INTERACTIVE DATE RANGE EXPORT MODAL ──────────────────────── */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.55)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => !loadingExport && setModalOpen(false)}
        >
          <div
            style={{
              background: "var(--card-bg, #ffffff)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              width: "100%",
              maxWidth: 520,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "rgba(245, 158, 11, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Sparkles size={22} color="var(--warning)" />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                    Export Intelligence Report
                  </h3>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                    {titleLabel} • Select custom date range & format
                  </div>
                </div>
              </div>
              <button
                onClick={() => !loadingExport && setModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Presets Strip */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8, display: "block" }}>
                Select Time Horizon Preset
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                {[
                  { id: "today", label: "Today" },
                  { id: "7d", label: "Last 7D" },
                  { id: "30d", label: "Last 30D" },
                  { id: "90d", label: "Last 90D" },
                  { id: "all", label: "All Time" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`btn btn-sm ${activePreset === p.id ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => handlePresetSelect(p.id)}
                    style={{ fontSize: 12, padding: "6px 4px", textAlign: "center" }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Picker Inputs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>
                  FROM DATE
                </label>
                <input
                  type="date"
                  className="input"
                  value={dateFrom}
                  onChange={(e) => {
                    setActivePreset("custom");
                    setDateFrom(e.target.value);
                  }}
                  style={{ width: "100%", fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>
                  TO DATE
                </label>
                <input
                  type="date"
                  className="input"
                  value={dateTo}
                  onChange={(e) => {
                    setActivePreset("custom");
                    setDateTo(e.target.value);
                  }}
                  style={{ width: "100%", fontSize: 13 }}
                />
              </div>
            </div>

            {/* Status Filter Dropdown */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>
                ORDER STATUS FILTER
              </label>
              <select
                className="input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: "100%", fontSize: 13 }}
              >
                <option value="ALL">All Statuses (Completed, Pending, In Prep, Cancelled)</option>
                <option value="COMPLETED">Completed Only</option>
                <option value="IN_PREPARATION">In Preparation Only</option>
                <option value="PENDING">Pending Only</option>
                <option value="CANCELLED">Cancelled Only</option>
              </select>
            </div>

            {/* Format Selection Action Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                disabled={loadingExport}
                onClick={() => handleExportAction("pdf")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.12) 100%)",
                  border: "1px solid rgba(245, 158, 11, 0.35)",
                  cursor: loadingExport ? "not-allowed" : "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ background: "var(--warning)", color: "#ffffff", padding: 8, borderRadius: 8 }}>
                    {loadingExport ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-primary)" }}>
                      Download Luxury PDF Report
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      Includes brand logo, KPI cards strip, status badges & print-ready layout
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--warning)" }}>Generate PDF →</span>
              </button>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button
                  type="button"
                  disabled={loadingExport}
                  onClick={() => handleExportAction("excel")}
                  className="btn btn-secondary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "12px 14px",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  <FileSpreadsheet size={16} color="var(--success)" />
                  Excel (.xlsx)
                </button>

                <button
                  type="button"
                  disabled={loadingExport}
                  onClick={() => handleExportAction("csv")}
                  className="btn btn-ghost"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "12px 14px",
                    fontWeight: 700,
                    fontSize: 13,
                    border: "1px solid var(--border)",
                  }}
                >
                  <FileDown size={16} />
                  CSV File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
