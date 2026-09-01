"use client";
import React from "react";
import { Printer, X, Coffee, MapPin } from "lucide-react";
import { Order } from "@/types/order";
import StatusBadge from "@/components/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/format";

const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["IN_PREPARATION", "CANCELLED"],
  IN_PREPARATION: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

interface OrderReceiptModalProps {
  order: Order | null;
  cafeName?: string;
  onClose: () => void;
  onStatusChange?: (order: Order, newStatus: string) => void;
}

export default function OrderReceiptModal({
  order,
  cafeName,
  onClose,
  onStatusChange,
}: OrderReceiptModalProps) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const branchName = (order as any).branch?.name || "Main Branch";
  const branchLocation = (order as any).branch?.location;
  const orderLines = order.orderLines || [];

  const totalItemsCount = orderLines.reduce((sum, line) => sum + (line.quantity || 1), 0);
  const nextTransitions = STATUS_TRANSITIONS[order.status] || [];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onClick={onClose}
    >
      {/* ── Modal Container ── */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-xl)",
          width: "100%",
          maxWidth: 480,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header (Screen Only) ── */}
        <div
          className="no-print"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 16 }}>
            <Printer size={18} color="var(--accent)" />
            Order Receipt #{order.id}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              display: "flex",
              padding: 4,
              borderRadius: 6,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Printable Receipt Content ── */}
        <div
          id="printable-receipt"
          style={{
            padding: 24,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            background: "var(--bg-surface)",
            margin: 16,
            borderRadius: "var(--radius-md)",
            border: "1px dashed var(--border)",
          }}
        >
          {/* Brand & Store Header */}
          <div style={{ textAlign: "center", paddingBottom: 12, borderBottom: "1px dashed var(--border)" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
              <Coffee size={20} color="var(--accent)" />
              {cafeName || "Haji Cafe"}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginTop: 2 }}>
              {branchName}
            </div>
            {branchLocation && (
              <div style={{ fontSize: 12, color: "var(--text-faint)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 2 }}>
                <MapPin size={11} /> {branchLocation}
              </div>
            )}
          </div>

          {/* Receipt Meta */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
            <div>
              <div style={{ color: "var(--text-muted)" }}>
                Receipt / Order: <strong style={{ color: "var(--text-primary)", fontFamily: "monospace" }}>#{order.id}</strong>
              </div>
              <div style={{ color: "var(--text-faint)", marginTop: 2 }}>
                {formatDateTime(order.createdAt)}
              </div>
            </div>
            <div>
              <StatusBadge status={order.status} />
            </div>
          </div>

          {/* Line Items Table */}
          <div style={{ marginTop: 4 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "6px 0", fontWeight: 700, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase" }}>Item</th>
                  <th style={{ padding: "6px 4px", textAlign: "center", fontWeight: 700, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase" }}>Qty</th>
                  <th style={{ padding: "6px 4px", textAlign: "right", fontWeight: 700, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase" }}>Price</th>
                  <th style={{ padding: "6px 0", textAlign: "right", fontWeight: 700, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {orderLines.length > 0 ? (
                  orderLines.map((line, idx) => (
                    <tr key={line.id || idx} style={{ borderBottom: "1px dashed var(--border-subtle)" }}>
                      <td style={{ padding: "8px 0", fontWeight: 600, color: "var(--text-primary)" }}>
                        {line.branchMenuItem?.masterItem?.name || line.itemName || `Item #${line.branchMenuItemId}`}
                        {line.notes && (
                          <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", fontWeight: 400 }}>
                            Note: {line.notes}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "8px 4px", textAlign: "center", fontFamily: "monospace", color: "var(--text-primary)" }}>
                        {line.quantity}
                      </td>
                      <td style={{ padding: "8px 4px", textAlign: "right", fontFamily: "monospace", color: "var(--text-muted)" }}>
                        {formatCurrency(line.unitPrice)}
                      </td>
                      <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "var(--text-primary)" }}>
                        {formatCurrency(line.lineTotal || (line.unitPrice * line.quantity))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ padding: "12px 0", textAlign: "center", color: "var(--text-muted)", fontStyle: "italic" }}>
                      1x Standard Order Batch
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals & Financials */}
          <div style={{ borderTop: "1px dashed var(--border)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
              <span>Total Items:</span>
              <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{totalItemsCount || 1}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
              <span>Subtotal:</span>
              <span style={{ fontFamily: "monospace" }}>{formatCurrency(order.totalAmount)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "2px solid var(--border)",
                paddingTop: 8,
                marginTop: 4,
              }}
            >
              <span style={{ fontWeight: 800, fontSize: 15, color: "var(--text-primary)" }}>GRAND TOTAL:</span>
              <span style={{ fontWeight: 800, fontSize: 20, color: "var(--accent)", fontFamily: "monospace" }}>
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
          </div>

          {/* Footer Note */}
          <div style={{ textAlign: "center", paddingTop: 8, borderTop: "1px dashed var(--border)", fontSize: 11, color: "var(--text-faint)" }}>
            <p style={{ margin: 0 }}>Thank you for your visit!</p>
            <p style={{ margin: "2px 0 0 0" }}>Haji Cafe Management System</p>
          </div>
        </div>

        {/* ── Status Change Options (Screen Only) ── */}
        {onStatusChange && nextTransitions.length > 0 && (
          <div
            className="no-print"
            style={{
              padding: "10px 20px",
              background: "var(--bg-surface)",
              borderTop: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Update Status:</span>
            <div style={{ display: "flex", gap: 8 }}>
              {nextTransitions.map((status) => (
                <button
                  key={status}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 12, padding: "4px 8px" }}
                  onClick={() => onStatusChange(order, status)}
                >
                  → {status.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Modal Actions (Screen Only) ── */}
        <div
          className="no-print"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            padding: "14px 20px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-card)",
          }}
        >
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={handlePrint} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Printer size={15} /> Print Receipt
          </button>
        </div>
      </div>

      {/* ── Print Specific Global CSS ── */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible !important;
          }
          #printable-receipt {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 380px !important;
            margin: 0 auto !important;
            padding: 16px !important;
            background: #ffffff !important;
            color: #000000 !important;
            border: 1px dashed #cccccc !important;
            box-shadow: none !important;
          }
          #printable-receipt * {
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
