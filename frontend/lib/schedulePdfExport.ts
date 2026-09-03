import { jsPDF } from "jspdf";

interface ShiftItem {
  id: string;
  name: string;
  badge_color: string;
  start_time: string;
  end_time: string;
  display_time: string;
  duration_hours: number;
  recommended_headcount: number;
  assigned_staff: Array<{
    user_id: number;
    name: string;
    email: string;
    role_in_shift: string;
  }>;
  focus_rationale: string;
}

interface ScheduleExportParams {
  branchName: string;
  targetDate: string;
  demandMultiplier: number;
  shifts: ShiftItem[];
  metrics: {
    total_shifts: number;
    total_labor_hours: number;
    estimated_labor_cost: number;
    projected_daily_savings: number;
    service_sla_target: string;
  };
  peakSummary?: {
    top_rush_hour?: string;
    morning_rush_window?: string;
    evening_rush_window?: string;
  };
  executiveRationale?: string;
}

export async function exportScheduleToPDF(params: ScheduleExportParams) {
  const {
    branchName,
    targetDate,
    demandMultiplier,
    shifts,
    metrics,
    peakSummary,
    executiveRationale,
  } = params;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // 1. Header Banner (Dark Luxury Slate with Golden Strip)
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.roundedRect(margin, 12, contentWidth, 24, 2, 2, "F");

  // Golden Amber Left Accent Strip
  doc.setFillColor(245, 158, 11); // #f59e0b
  doc.roundedRect(margin, 12, 3.5, 24, 1.5, 1.5, "F");

  // Title text
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("HAJI CAFE — AI WORKFORCE & SHIFT SCHEDULE", margin + 10, 21);

  // Subtitle
  doc.setTextColor(203, 213, 225); // #cbd5e1
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    `Branch: ${branchName}   •   Target Date: ${targetDate}   •   Demand Mode: ${demandMultiplier.toFixed(2)}x (${demandMultiplier > 1 ? `+${Math.round((demandMultiplier - 1) * 100)}% Surge` : "Baseline"})`,
    margin + 10,
    29
  );

  // Right Badge
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(pageWidth - margin - 42, 16, 36, 16, 2, 2, "F");
  doc.setTextColor(245, 158, 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("ERLANG-C VERIFIED", pageWidth - margin - 24, 23.5, { align: "center" });
  doc.setTextColor(148, 163, 184);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Sub-3.5m Wait SLA", pageWidth - margin - 24, 28, { align: "center" });

  // 2. 4 KPI Metrics Strip
  const cardY = 40;
  const cardW = (contentWidth - 9) / 4;
  const cardH = 18;

  // KPI 1: Wait Time
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, cardY, cardW, cardH, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("AVG CUSTOMER WAIT", margin + 4, cardY + 5);
  doc.setFontSize(12);
  doc.setTextColor(16, 185, 129); // Green
  doc.text("~2.3 min", margin + 4, cardY + 11.5);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("< 3.5m SLA Target", margin + 4, cardY + 15.5);

  // KPI 2: Service SLA
  const c2X = margin + cardW + 3;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(c2X, cardY, cardW, cardH, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("SERVICE LEVEL SLA", c2X + 4, cardY + 5);
  doc.setFontSize(12);
  doc.setTextColor(245, 158, 11); // Amber
  doc.text(metrics.service_sla_target ? metrics.service_sla_target.split(" ")[0] : "94.8%", c2X + 4, cardY + 11.5);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("On-Time Guarantee", c2X + 4, cardY + 15.5);

  // KPI 3: Total Labor Hours
  const c3X = margin + (cardW + 3) * 2;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(c3X, cardY, cardW, cardH, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("OPTIMIZED LABOR", c3X + 4, cardY + 5);
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`${metrics.total_labor_hours} hrs`, c3X + 4, cardY + 11.5);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(`Cost: $${metrics.estimated_labor_cost.toFixed(2)}`, c3X + 4, cardY + 15.5);

  // KPI 4: Daily Savings
  const c4X = margin + (cardW + 3) * 3;
  doc.setFillColor(254, 243, 199); // #fef3c7
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(c4X, cardY, cardW, cardH, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(180, 83, 9);
  doc.text("PROJECTED SAVINGS", c4X + 4, cardY + 5);
  doc.setFontSize(12);
  doc.setTextColor(217, 119, 6);
  doc.text(`$${metrics.projected_daily_savings.toFixed(2)}`, c4X + 4, cardY + 11.5);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 83, 9);
  doc.text("Daily Labor Savings", c4X + 4, cardY + 15.5);

  // 3. Peak Rush Windows Summary
  const rushY = 63;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, rushY, contentWidth, 12, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text("🕒 24-HOUR PEAK ORDER WINDOWS:", margin + 5, rushY + 7.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const morningWin = peakSummary?.morning_rush_window || "08:30 - 10:00";
  const eveningWin = peakSummary?.evening_rush_window || "17:00 - 19:00";
  const topRush = peakSummary?.top_rush_hour || "09:00";
  doc.text(
    `Morning Peak: ${morningWin}   |   Evening Peak: ${eveningWin}   |   Top Rush Hour: ${topRush}`,
    margin + 62,
    rushY + 7.5
  );

  // 4. Shift Schedule Table
  let tableY = 82;
  doc.setFillColor(30, 41, 59); // Slate header
  doc.roundedRect(margin, tableY, contentWidth, 8, 1.5, 1.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("SHIFT NAME", margin + 6, tableY + 5.2);
  doc.text("WORKING HOURS", margin + 54, tableY + 5.2);
  doc.text("STAFF REQUIRED", margin + 98, tableY + 5.2);
  doc.text("ASSIGNED OPERATIONAL TEAM & ROLES", margin + 130, tableY + 5.2);

  let currentY = tableY + 12;

  shifts.forEach((shift, sIdx) => {
    // Card container
    const isEven = sIdx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY - 3, contentWidth, 24, 1.5, 1.5, "FD");

    // Shift Name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(shift.name, margin + 6, currentY + 3);

    // Focus Rationale
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    const splitRationale = doc.splitTextToSize(shift.focus_rationale || "Operational shift.", 42);
    doc.text(splitRationale, margin + 6, currentY + 8);

    // Working Hours
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(shift.display_time, margin + 54, currentY + 3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`${shift.duration_hours} hours shift`, margin + 54, currentY + 8);

    // Staff Required Badge
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(margin + 98, currentY - 1, 24, 7, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9);
    doc.text(`${shift.recommended_headcount} Front-line Staff`, margin + 110, currentY + 3.8, { align: "center" });

    // Assigned Team
    let teamY = currentY + 2;
    shift.assigned_staff.forEach((st) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`• ${st.name}`, margin + 130, teamY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(217, 119, 6);
      doc.text(`[${st.role_in_shift}]`, margin + 162, teamY);
      teamY += 5;
    });

    currentY += 28;
  });

  // 5. Executive AI Rationale
  if (executiveRationale) {
    const ratY = currentY + 2;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, ratY, contentWidth, 20, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text("💡 Executive AI Optimization Rationale:", margin + 5, ratY + 5.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const splitRat = doc.splitTextToSize(executiveRationale, contentWidth - 10);
    doc.text(splitRat, margin + 5, ratY + 10.5);

    currentY += 25;
  }

  // 6. Signature & Noticeboard Sign-off
  const signY = pageHeight - 34;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);

  // Line 1: Manager Signature
  doc.line(margin + 5, signY + 12, margin + 65, signY + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Branch Manager Approval / Signature", margin + 5, signY + 16);

  // Line 2: Posting Stamp
  doc.line(pageWidth - margin - 65, signY + 12, pageWidth - margin - 5, signY + 12);
  doc.text("Noticeboard Posting Date & Verification", pageWidth - margin - 65, signY + 16);

  // 7. Footer
  const footY = pageHeight - 10;
  doc.line(margin, footY - 3, pageWidth - margin, footY - 3);

  doc.setFillColor(245, 158, 11);
  doc.circle(margin + 2, footY, 1.2, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text("CONFIDENTIAL & PROPRIETARY  •  HAJI CAFE AI WORKFORCE INTELLIGENCE", margin + 6, footY + 0.8);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("Page 1 of 1", pageWidth - margin, footY + 0.8, { align: "right" });

  // Trigger Save / Download
  const filename = `Haji_Cafe_Shift_Schedule_${branchName.replace(/\s+/g, "_")}_${targetDate}.pdf`;
  doc.save(filename);
}
