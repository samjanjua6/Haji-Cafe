"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Flame,
  CheckCircle2,
  Clock,
  Volume2,
  VolumeX,
  RefreshCw,
  ShoppingBag,
  Coffee,
  XCircle,
  RotateCcw
} from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Order, OrderStatus } from "@/types/order";
import StatusBadge from "@/components/StatusBadge";

// Synthesize a clean hotel-desk bell chime using Web Audio API
function playKitchenBell() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1760, now + 0.08);
    gain2.gain.setValueAtTime(0.15, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.8);
  } catch (err) {
    console.error("Audio error:", err);
  }
}

// Elapsed timer badge matching project tokens
function ElapsedBadge({ createdAt }: { createdAt: string }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const calculate = () => {
      const created = new Date(createdAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - created) / 1000));
      setElapsedSeconds(diff);
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const formatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  let bg = "var(--success-glow)";
  let text = "var(--success)";

  if (mins >= 10) {
    bg = "var(--danger-glow)";
    text = "var(--danger)";
  } else if (mins >= 5) {
    bg = "var(--warning-glow)";
    text = "var(--warning)";
  }

  return (
    <span
      className="badge"
      style={{
        background: bg,
        color: text,
        fontFamily: "monospace",
        fontWeight: 700,
        fontSize: 12,
      }}
    >
      <Clock size={12} />
      {formatted}
    </span>
  );
}

export default function KitchenDisplayPage() {
  const router = useRouter();
  const params = useParams<{ branchId: string }>();
  const searchParams = useSearchParams();
  const branchId = params.branchId;
  const cafeId = searchParams.get("cafeId");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "IN_PREPARATION" | "COMPLETED">("ALL");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const wsRef = useRef<WebSocket | null>(null);

  // 1. Fetch orders on mount
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<{ data: Order[] }>(
        `/branches/${branchId}/orders?limit=50&sortBy=createdAt&sortDir=desc`
      );
      setOrders(res.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load kitchen orders");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 2. Real-time WebSocket connection
  useEffect(() => {
    if (!branchId) return;

    const baseApi = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const wsProtocol = baseApi.startsWith("https") ? "wss" : "ws";
    const cleanHost = baseApi.replace(/^https?:\/\//, "");
    const wsUrl = `${wsProtocol}://${cleanHost}/ws/orders/${branchId}`;

    let socket: WebSocket;
    let reconnectTimeout: any;

    const connectWebSocket = () => {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.event === "ORDER_CREATED") {
            const newOrder = payload.data as Order;
            if (soundEnabled) playKitchenBell();

            toast.success(`🔔 New Ticket #${newOrder.id} received!`, {
              duration: 4000,
              icon: "☕",
            });

            setOrders((prev) => {
              if (prev.some((o) => o.id === newOrder.id)) return prev;
              return [newOrder, ...prev];
            });
          } else if (payload.event === "ORDER_STATUS_UPDATED") {
            const updated = payload.data as Order;
            setOrders((prev) =>
              prev.map((order) =>
                order.id === updated.id
                  ? { ...order, status: updated.status, ...(updated.orderItems ? { orderItems: updated.orderItems } : {}) }
                  : order
              )
            );
          }
        } catch (e) {
          console.error("[KDS] WebSocket frame error:", e);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      };

      socket.onerror = () => {};
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
      clearTimeout(reconnectTimeout);
    };
  }, [branchId, soundEnabled]);

  // 3. Status update
  const handleTransition = async (orderId: number, nextStatus: OrderStatus) => {
    try {
      await api.patch(`/branches/${branchId}/orders/${orderId}/status`, {
        status: nextStatus,
      });

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );

      toast.success(`Ticket #${orderId} moved to ${nextStatus.replace("_", " ")}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update ticket");
    }
  };

  const toggleItemCheck = (orderId: number, lineId: number) => {
    const key = `${orderId}-${lineId}`;
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter orders by active tab
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (activeTab === "ALL") return o.status === "PENDING" || o.status === "IN_PREPARATION";
      if (activeTab === "PENDING") return o.status === "PENDING";
      if (activeTab === "IN_PREPARATION") return o.status === "IN_PREPARATION";
      if (activeTab === "COMPLETED") return o.status === "COMPLETED";
      return true;
    });
  }, [orders, activeTab]);

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const inPrepCount = orders.filter((o) => o.status === "IN_PREPARATION").length;
  const completedCount = orders.filter((o) => o.status === "COMPLETED").length;

  return (
    <div>
      {/* 1. Page Header (Strictly matching project .page-header) */}
      <div className="page-header">
        <div>
          <button
            onClick={() => router.push(`/branches/${branchId}/orders${cafeId ? `?cafeId=${cafeId}` : ""}`)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
              fontSize: 13,
            }}
          >
            <ArrowLeft size={14} /> Back to Orders
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="page-title">Kitchen Display System (KDS)</div>
            <span
              className="badge"
              style={{
                background: isConnected ? "var(--success-glow)" : "var(--danger-glow)",
                color: isConnected ? "var(--success)" : "var(--danger)",
              }}
            >
              <span
                className="badge-dot"
                style={{ background: isConnected ? "var(--success)" : "var(--danger)" }}
              />
              {isConnected ? "Live Sync" : "Connecting"}
            </span>
          </div>
          <div className="page-subtitle">
            Branch #{branchId} • Real-time kitchen tickets queue
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              color: soundEnabled ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            {soundEnabled ? "Chime On" : "Muted"}
          </button>

          <button className="btn btn-ghost btn-sm" onClick={fetchOrders} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* 2. Filter Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto" }}>
        <button
          onClick={() => setActiveTab("ALL")}
          className={`btn btn-sm ${activeTab === "ALL" ? "btn-primary" : "btn-ghost"}`}
        >
          <ShoppingBag size={14} /> All Active ({pendingCount + inPrepCount})
        </button>

        <button
          onClick={() => setActiveTab("PENDING")}
          className={`btn btn-sm ${activeTab === "PENDING" ? "btn-primary" : "btn-ghost"}`}
        >
          <Clock size={14} /> Pending Queue ({pendingCount})
        </button>

        <button
          onClick={() => setActiveTab("IN_PREPARATION")}
          className={`btn btn-sm ${activeTab === "IN_PREPARATION" ? "btn-primary" : "btn-ghost"}`}
        >
          <Flame size={14} /> In Preparation ({inPrepCount})
        </button>

        <button
          onClick={() => setActiveTab("COMPLETED")}
          className={`btn btn-sm ${activeTab === "COMPLETED" ? "btn-primary" : "btn-ghost"}`}
        >
          <CheckCircle2 size={14} /> Completed ({completedCount})
        </button>
      </div>

      {/* 3. Ticket Cards Grid */}
      {filteredOrders.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">
            <Coffee size={28} />
          </div>
          <div className="empty-state-title">Kitchen Queue is Clear</div>
          <div className="empty-state-subtitle">
            New orders placed at the counter or kiosk will appear here in real time.
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {filteredOrders.map((order) => {
            const isPending = order.status === "PENDING";
            const isInPrep = order.status === "IN_PREPARATION";
            const isCompleted = order.status === "COMPLETED";

            const rawItems = (order as any).orderItems || (order as any).orderLines || [];

            const borderStyle = "1px solid var(--border)";

            return (
              <div
                key={order.id}
                style={{
                  background: "var(--bg-card)",
                  borderRadius: "var(--radius-lg)",
                  border: borderStyle,
                  boxShadow: "var(--shadow-sm)",
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "transform 0.15s ease",
                }}
              >
                <div>
                  {/* Card Header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      paddingBottom: 12,
                      marginBottom: 12,
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>
                          Ticket #{order.id}
                        </span>
                        <StatusBadge status={order.status} />
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>

                    {!isCompleted && <ElapsedBadge createdAt={order.createdAt} />}
                  </div>

                  {/* Items List (Full Width, Unsquished) */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    {rawItems.length === 0 ? (
                      <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", padding: "6px 0" }}>
                        Café Order (${Number(order.totalAmount || 0).toFixed(2)})
                      </div>
                    ) : (
                      rawItems.map((item: any, idx: number) => {
                        const key = `${order.id}-${item.id || idx}`;
                        const isChecked = checkedItems[key] || false;
                        const itemName =
                          item.branchMenuItem?.masterItem?.name ||
                          item.masterItem?.name ||
                          item.itemName ||
                          `Item #${item.branchMenuItemId || idx + 1}`;
                        const quantity = item.quantity || 1;

                        return (
                          <div
                            key={key}
                            onClick={() => toggleItemCheck(order.id, item.id || idx)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 12,
                              padding: "9px 12px",
                              borderRadius: "var(--radius-md)",
                              background: isChecked ? "var(--bg-base)" : "var(--bg-surface)",
                              border: "1px solid var(--border-subtle)",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1, minWidth: 0 }}>
                              <span
                                style={{
                                  background: isChecked ? "var(--border)" : "var(--accent)",
                                  color: isChecked ? "var(--text-muted)" : "#0f172a",
                                  padding: "2px 7px",
                                  borderRadius: "var(--radius-sm)",
                                  fontSize: 12,
                                  fontWeight: 800,
                                  flexShrink: 0,
                                }}
                              >
                                {quantity}x
                              </span>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: isChecked ? "var(--text-muted)" : "var(--text-primary)",
                                    textDecoration: isChecked ? "line-through" : "none",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {itemName}
                                </div>
                                {item.notes && (
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: "var(--warning)",
                                      marginTop: 2,
                                      fontStyle: "italic",
                                    }}
                                  >
                                    Note: {item.notes}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Checkbox for active orders, check icon for completed */}
                            {!isCompleted ? (
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                style={{
                                  width: 18,
                                  height: 18,
                                  minWidth: 18,
                                  flexShrink: 0,
                                  cursor: "pointer",
                                  accentColor: "var(--accent)",
                                }}
                              />
                            ) : (
                              <CheckCircle2 size={16} color="var(--success)" style={{ flexShrink: 0 }} />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  {isPending && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleTransition(order.id, "IN_PREPARATION")}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        fontWeight: 600,
                      }}
                    >
                      <Flame size={15} /> Start Cooking
                    </button>
                  )}

                  {isInPrep && (
                    <button
                      className="btn btn-sm"
                      onClick={() => handleTransition(order.id, "COMPLETED")}
                      style={{
                        flex: 1,
                        background: "var(--success)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        fontWeight: 600,
                      }}
                    >
                      <CheckCircle2 size={15} /> Ready / Complete
                    </button>
                  )}

                  {isCompleted && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleTransition(order.id, "IN_PREPARATION")}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <RotateCcw size={14} /> Recall to Kitchen
                    </button>
                  )}

                  {!isCompleted && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleTransition(order.id, "CANCELLED")}
                      title="Cancel Order"
                      style={{
                        color: "var(--danger)",
                        padding: "8px 12px",
                      }}
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
