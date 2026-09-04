"use client";
import React, { useState, useEffect } from "react";
import { Printer, X, Coffee, MapPin, Copy, Check, User } from "lucide-react";
import { Order } from "@/types/order";
import StatusBadge from "@/components/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { normalizeOrderItems, formatTextReceipt, NormalizedOrderItem } from "@/lib/orders";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

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
  const [activeOrder, setActiveOrder] = useState<Order | null>(order);
  const [fetching, setFetching] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Sync state with order prop and fetch detail if items are not preloaded
  useEffect(() => {
    setActiveOrder(order);
    if (!order) return;

    const existingItems =
      (order as any).orderItems ||
      (order as any).orderLines ||
      (order as any).items ||
      [];

    // If order has no line items loaded and valid branchId, fetch single order detail
    if (existingItems.length === 0 && order.id && order.branchId) {
      setFetching(true);
      api
        .get<Order>(`/branches/${order.branchId}/orders/${order.id}`)
        .then((res: any) => {
          if (res) {
            setActiveOrder(res);
          }
        })
        .catch((err) => {
          console.warn("Could not fetch detailed order lines:", err);
        })
        .finally(() => {
          setFetching(false);
        });
    }
  }, [order]);

  if (!order) return null;

  const currentOrder = activeOrder || order;
  const branchName = (currentOrder as any).branch?.name || "Main Branch";
  const branchLocation = (currentOrder as any).branch?.location;
  const placedBy = (currentOrder as any).placedBy?.name || (currentOrder as any).placedBy?.email;
  const orderLines: NormalizedOrderItem[] = normalizeOrderItems(currentOrder);

  const totalItemsCount = orderLines.reduce((sum, line) => sum + line.quantity, 0);
  const nextTransitions = STATUS_TRANSITIONS[currentOrder.status] || [];

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const txt = formatTextReceipt(currentOrder, cafeName);
    navigator.clipboard.writeText(txt);
    setCopied(true);
    toast.success("Receipt copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusClick = (newStatus: string) => {
    setActiveOrder({ ...currentOrder, status: newStatus as any });
    if (onStatusChange) {
      onStatusChange(currentOrder, newStatus);
    }
  };

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
            Order Receipt #{currentOrder.id}
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
            title="Close modal"
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontSize: 12 }}>
            <div>
              <div style={{ color: "var(--text-muted)" }}>
                Receipt / Order: <strong style={{ color: "var(--text-primary)", fontFamily: "monospace" }}>#{currentOrder.id}</strong>
              </div>
              <div style={{ color: "var(--text-faint)", marginTop: 2 }}>
                {formatDateTime(currentOrder.createdAt)}
              </div>
              {placedBy && (
                <div style={{ color: "var(--text-faint)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                  <User size={10} /> {placedBy}
                </div>
              )}
            </div>
            <div>
              <StatusBadge status={currentOrder.status} />
            </div>
          </div>

          {/* Service & Customer Meta */}
          <div style={{ background: "var(--bg-card)", padding: "8px 12px", borderRadius: "var(--radius-sm)", fontSize: 12, border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ color: "var(--text-muted)" }}>Service:</span>
              <strong style={{ color: "var(--text-primary)" }}>
                {order.orderType === "DELIVERY" ? "🛵 Delivery" : `🍽️ Dine-in (${order.tableNumber || "Table"})`}
              </strong>
            </div>
            {order.customerName && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ color: "var(--text-muted)" }}>Customer:</span>
                <span style={{ color: "var(--text-primary)" }}>
                  {order.customerName} {order.customerPhone ? `(${order.customerPhone})` : ""}
                </span>
              </div>
            )}
            {order.orderType === "DELIVERY" && order.deliveryAddress && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Address:</span>
                <span style={{ color: "var(--text-primary)", textAlign: "right", maxWidth: 260 }}>
                  {order.deliveryAddress}
                </span>
              </div>
            )}
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
                {fetching ? (
                  [1, 2, 3].map((k) => (
                    <tr key={k} style={{ borderBottom: "1px dashed var(--border-subtle)" }}>
                      <td colSpan={4} style={{ padding: "10px 0" }}>
                        <div style={{ height: 14, background: "var(--bg-card)", borderRadius: 4, opacity: 0.6 }} />
                      </td>
                    </tr>
                  ))
                ) : orderLines.length > 0 ? (
                  orderLines.map((line, idx) => (
                    <tr key={line.id || idx} style={{ borderBottom: "1px dashed var(--border-subtle)" }}>
                      <td style={{ padding: "8px 0", fontWeight: 600, color: "var(--text-primary)" }}>
                        <div>{line.name}</div>
                        {line.notes && (
                          <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", fontWeight: 400, marginTop: 2 }}>
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
                        {formatCurrency(line.lineTotal)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ padding: "14px 0", textAlign: "center", color: "var(--text-muted)", fontStyle: "italic" }}>
                      No items recorded for this order
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
              <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{totalItemsCount}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
              <span>Subtotal:</span>
              <span style={{ fontFamily: "monospace" }}>{formatCurrency(currentOrder.totalAmount)}</span>
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
                {formatCurrency(currentOrder.totalAmount)}
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
                  onClick={() => handleStatusClick(status)}
                >
                  &rarr; {status.replace(/_/g, " ")}
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
            justifyContent: "space-between",
            gap: 10,
            padding: "14px 20px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-card)",
          }}
        >
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleCopy}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}
            title="Copy receipt as formatted text for WhatsApp / SMS"
          >
            {copied ? <Check size={14} style={{ color: "var(--success)" }} /> : <Copy size={14} />}
            <span>{copied ? "Copied Slip!" : "Copy Text Slip"}</span>
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button className="btn btn-primary" onClick={handlePrint} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Printer size={15} /> Print Receipt
            </button>
          </div>
        </div>
      </div>

      {/* ── Print Specific Global CSS (Supports 80mm & 58mm Thermal Printers) ── */}
      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible !important;
          }
          #printable-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 8mm 6mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            border: none !important;
            box-shadow: none !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace !important;
          }
          #printable-receipt * {
            color: #000000 !important;
            background: transparent !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
