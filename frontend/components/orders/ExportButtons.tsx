"use client";

import React, { useState } from "react";
import { FileDown, FileText, Loader2 } from "lucide-react";
import { Order } from "@/types/order";
import toast from "react-hot-toast";

interface ExportButtonsProps {
  orders: Order[];
  branchId?: string | number;
  cafeId?: string | number;
  disabled?: boolean;
}

function exportToCSV(orders: Order[], contextName: string) {
  const headers = ["Order ID", "Status", "Total Amount", "Date", "Branch ID"];
  const rows = orders.map((o) => [
    "#" + o.id,
    o.status,
    "$" + Number(o.totalAmount).toFixed(2),
    new Date(o.createdAt).toLocaleString(),
    "Branch #" + o.branchId,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => '"' + cell + '"').join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `haji-cafe-${contextName}-orders.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success("CSV export downloaded!");
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

async function exportToPDF(orders: Order[], contextName: string, titleLabel: string) {
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
      // ── TOP LUXURY HERO BANNER (First Page) ──────────────────────
      // Rich Charcoal Navy Header Box
      doc.setFillColor(24, 24, 27); // #18181b
      doc.roundedRect(margin, 12, contentWidth, 27, 3, 3, "F");

      // Left Accent Gold Stripe
      doc.setFillColor(245, 158, 11); // #f59e0b Amber Gold
      doc.roundedRect(margin, 12, 3.5, 27, 1.5, 1.5, "F");

      // Draw Logo Image
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, "PNG", margin + 7, 15, 21, 21);
        } catch {
          // Fallback Badge
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

      doc.setTextColor(245, 158, 11); // Amber Gold
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text("EXECUTIVE ORDERS & SALES INTELLIGENCE REPORT", textX, 26.5);

      doc.setTextColor(161, 161, 170); // Zinc-400
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`${titleLabel}  •  Official Certified Audit Record`, textX, 32.5);

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
      const cardW = (contentWidth - 9) / 4; // 4 cards with 3mm gaps

      // Card 1: Total Revenue (Indigo/Violet theme)
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
      doc.text(`${orders.length} Total Transactions`, margin + 4, cardY + 15.5);

      // Card 2: Completed Orders (Emerald theme)
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
      doc.text(`${completionPct}% Fulfillment Rate`, c2X + 4, cardY + 15.5);

      // Card 3: In Prep / Active (Amber theme)
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
      doc.text(`${prepCount} Prep • ${pendingCount} Pending`, c3X + 4, cardY + 15.5);

      // Card 4: Average Order Value (Slate theme)
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
      // ── MINI REPEATING HEADER (Subsequent Pages) ───────────────────
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
      doc.text(titleLabel, pageWidth - margin - 6, 17.5, { align: "right" });
    }
  };

  const drawTableHeader = (startY: number) => {
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.roundedRect(margin, startY, contentWidth, 8, 1.5, 1.5, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);

    doc.text("ORDER ID", margin + 6, startY + 5.5);
    doc.text("SCOPE / BRANCH", margin + 34, startY + 5.5);
    doc.text("STATUS", margin + 78, startY + 5.5);
    doc.text("DATE & TIMESTAMP", margin + 120, startY + 5.5);
    doc.text("AMOUNT ($)", pageWidth - margin - 8, startY + 5.5, { align: "right" });
  };

  const drawPageFooter = (currentPage: number, totalPages: number) => {
    const footY = pageHeight - 12;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, footY - 3, pageWidth - margin, footY - 3);

    // Bottom accent dot
    doc.setFillColor(245, 158, 11);
    doc.circle(margin + 2, footY, 1.2, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text("CONFIDENTIAL & PROPRIETARY  •  HAJI CAFE POS & ANALYTICS SYSTEM", margin + 6, footY + 0.8);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${currentPage} of ${totalPages}`, pageWidth - margin, footY + 0.8, { align: "right" });
  };

  // ── RENDER PAGES & ROWS ───────────────────────────────────────────
  drawPageHeader(true);

  let currentY = 66;
  drawTableHeader(currentY);
  currentY += 10.5;

  const rowHeight = 7.2;
  let pageNumber = 1;

  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];

    // Check page overflow
    if (currentY + rowHeight > pageHeight - 22) {
      doc.addPage();
      pageNumber++;
      drawPageHeader(false);
      currentY = 25;
      drawTableHeader(currentY);
      currentY += 10.5;
    }

    // Zebra striping background
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252); // Slate-50
      doc.rect(margin, currentY - 4.5, contentWidth, rowHeight, "F");
    }

    // Subtle bottom divider line
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(margin, currentY + 2.5, pageWidth - margin, currentY + 2.5);

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

    // 3. Status Pill / Badge
    const st = (o.status || "").toUpperCase();
    let bgR = 241, bgG = 245, bgB = 249;
    let txtR = 71, txtG = 85, txtB = 105;
    let displayStatus = st;

    if (st === "COMPLETED") {
      bgR = 220; bgG = 252; bgB = 231; // Emerald-100
      txtR = 22; txtG = 101; txtB = 52;  // Emerald-800
      displayStatus = "COMPLETED";
    } else if (st === "IN_PREPARATION") {
      bgR = 254; bgG = 243; bgB = 199; // Amber-100
      txtR = 146; txtG = 64; txtB = 14;  // Amber-800
      displayStatus = "IN PREP";
    } else if (st === "PENDING") {
      bgR = 224; bgG = 231; bgB = 255; // Indigo-100
      txtR = 55; txtG = 48; txtB = 163;  // Indigo-800
      displayStatus = "PENDING";
    } else if (st === "CANCELLED") {
      bgR = 254; bgG = 226; bgB = 226; // Red-100
      txtR = 153; txtG = 27; txtB = 27;  // Red-800
      displayStatus = "CANCELLED";
    }

    // Draw Status Pill
    const pillW = 24;
    const pillH = 4.8;
    const pillX = margin + 76;
    doc.setFillColor(bgR, bgG, bgB);
    doc.roundedRect(pillX, currentY - 3.6, pillW, pillH, 1.2, 1.2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(txtR, txtG, txtB);
    doc.text(displayStatus, pillX + pillW / 2, currentY - 0.2, { align: "center" });

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

  // ── FINAL FINANCIAL AUDIT BOX (If space permits or on final page) ──
  if (currentY + 18 > pageHeight - 22) {
    doc.addPage();
    pageNumber++;
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
  doc.text(`Processed ${orders.length} orders across system (${completedCount} completed, ${cancelledCount} cancelled)`, margin + 46, currentY + 8.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105); // Emerald Green
  doc.text(`$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin - 8, currentY + 9, { align: "right" });

  // ── DRAW FOOTERS ON ALL PAGES ─────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawPageFooter(p, totalPages);
  }

  doc.save(`haji-cafe-${contextName}-executive-report.pdf`);
  toast.success("Executive PDF report generated!");
}

export function ExportButtons({ orders, branchId, cafeId, disabled }: ExportButtonsProps) {
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const isDisabled = disabled || orders.length === 0;
  const contextName = branchId ? `branch-${branchId}` : cafeId ? `cafe-${cafeId}` : "all";
  const titleLabel = branchId ? `Branch #${branchId}` : cafeId ? `Café #${cafeId}` : "All Orders";

  const handlePdfClick = async () => {
    try {
      setGeneratingPdf(true);
      await exportToPDF(orders, contextName, titleLabel);
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button
        className="btn btn-ghost btn-sm"
        disabled={isDisabled}
        onClick={() => exportToCSV(orders, contextName)}
        title={orders.length === 0 ? "No orders to export" : "Export as CSV spreadsheet"}
        style={{ display: "flex", alignItems: "center", gap: 6 }}
      >
        <FileDown size={14} />
        CSV
      </button>

      <button
        className="btn btn-ghost btn-sm"
        disabled={isDisabled || generatingPdf}
        onClick={handlePdfClick}
        title={orders.length === 0 ? "No orders to export" : "Generate high-quality PDF executive report"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(245, 158, 11, 0.08)",
          color: "var(--warning)",
          borderColor: "rgba(245, 158, 11, 0.3)",
        }}
      >
        {generatingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
        PDF Report
      </button>
    </div>
  );
}
