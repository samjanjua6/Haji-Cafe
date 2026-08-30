"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Flame,
  CheckCircle2,
  Clock,
  Volume2,
  VolumeX,
  Radio,
  RefreshCw,
  AlertTriangle,
  ShoppingBag,
  Coffee,
  XCircle
} from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Order, OrderStatus } from "@/types/order";

// Synthesize a clean hotel-desk bell chime using Web Audio API (Zero asset loading dependencies)
function playKitchenBell() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    
    // First high chime (880Hz - A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Second resonant overtone (1760Hz - A6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1760, now + 0.08);
    gain2.gain.setValueAtTime(0.18, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.8);
  } catch (err) {
    console.error("Audio chime error:", err);
  }
}

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

  // Urgency thresholds: Green < 5m, Amber 5-10m, Red > 10m
  let badgeStyle = {
    bg: "rgba(34, 197, 94, 0.15)",
    text: "#22c55e",
    border: "rgba(34, 197, 94, 0.3)",
  };

  if (mins >= 10) {
    badgeStyle = {
      bg: "rgba(239, 68, 68, 0.2)",
      text: "#ef4444",
      border: "rgba(239, 68, 68, 0.4)",
    };
  } else if (mins >= 5) {
    badgeStyle = {
      bg: "rgba(245, 158, 11, 0.2)",
      text: "#f59e0b",
      border: "rgba(245, 158, 11, 0.35)",
    };
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 700,
        fontFamily: "monospace",
        backgroundColor: badgeStyle.bg,
        color: badgeStyle.text,
        border: `1px solid ${badgeStyle.border}`,
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

  // 1. Fetch current active orders on mount
  const fetchOrders = async () => {
    try {
      setLoading(true);
      // Fetch active + recent orders
      const res = await api.get<{ data: Order[] }>(
        `/branches/${branchId}/orders?limit=50&sortBy=createdAt&sortDir=desc`
      );
      setOrders(res.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load kitchen orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [branchId]);

  // 2. Real-time WebSocket connection to /ws/orders/{branchId}
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
        console.log(`[KDS] Connected to live order stream for branch #${branchId}`);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.event === "ORDER_CREATED") {
            const newOrder = payload.data as Order;
            if (soundEnabled) {
              playKitchenBell();
            }
            toast.success(`🔔 New Order #${newOrder.id} received!`, {
              duration: 4000,
              icon: "☕",
            });

            setOrders((prev) => {
              // Avoid duplicates
              const exists = prev.some((o) => o.id === newOrder.id);
              if (exists) return prev;
              return [newOrder, ...prev];
            });
          } else if (payload.event === "ORDER_STATUS_UPDATED") {
            const updated = payload.data as Order;
            setOrders((prev) =>
              prev.map((order) => (order.id === updated.id ? { ...order, status: updated.status } : order))
            );
          }
        } catch (e) {
          console.error("[KDS] Error parsing WebSocket frame:", e);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        // Exponential reconnect
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      };

      socket.onerror = (err) => {
        console.warn("[KDS] WebSocket error:", err);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, [branchId, soundEnabled]);

  // 3. Status Transition Mutation
  const handleTransition = async (orderId: number, nextStatus: OrderStatus) => {
    try {
      await api.patch(`/branches/${branchId}/orders/${orderId}/status`, {
        status: nextStatus,
      });

      // Optimistic local update
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );

      toast.success(`Order #${orderId} moved to ${nextStatus.replace("_", " ")}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
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
    <div style={{ minHeight: "100vh", padding: "16px 20px" }}>
      {/* Top Action Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
          padding: "12px 18px",
          borderRadius: 12,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => router.push(`/branches/${branchId}/orders${cafeId ? `?cafeId=${cafeId}` : ""}`)}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "6px 12px",
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={14} /> Back to Orders
          </button>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Kitchen Display System (KDS)
              </h1>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "2px 8px",
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 600,
                  background: isConnected ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  color: isConnected ? "#22c55e" : "#ef4444",
                  border: isConnected ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
                }}
              >
                <Radio size={11} className={isConnected ? "animate-pulse" : ""} />
                {isConnected ? "LIVE WEBSOCKET" : "RECONNECTING"}
              </span>
            </div>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Branch #{branchId} • Real-time kitchen tickets queue
            </span>
          </div>
        </div>

        {/* Controls: Audio toggle & Refresh */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              borderRadius: 8,
              fontSize: 13,
              cursor: "pointer",
              background: soundEnabled ? "rgba(249, 115, 22, 0.15)" : "var(--bg-surface)",
              color: soundEnabled ? "var(--accent)" : "var(--text-muted)",
              border: soundEnabled ? "1px solid var(--accent)" : "1px solid var(--border)",
            }}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {soundEnabled ? "Chime On" : "Chime Muted"}
          </button>

          <button
            onClick={fetchOrders}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              borderRadius: 8,
              fontSize: 13,
              cursor: "pointer",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Swimlane Filter Tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, overflowX: "auto", paddingBottom: 4 }}>
        <button
          onClick={() => setActiveTab("ALL")}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            border: activeTab === "ALL" ? "2px solid var(--accent)" : "1px solid var(--border)",
            background: activeTab === "ALL" ? "var(--accent)" : "var(--bg-card)",
            color: activeTab === "ALL" ? "#fff" : "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <ShoppingBag size={15} /> All Active ({pendingCount + inPrepCount})
        </button>

        <button
          onClick={() => setActiveTab("PENDING")}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            border: activeTab === "PENDING" ? "2px solid #f59e0b" : "1px solid var(--border)",
            background: activeTab === "PENDING" ? "#f59e0b" : "var(--bg-card)",
            color: activeTab === "PENDING" ? "#fff" : "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Clock size={15} /> Pending Queue ({pendingCount})
        </button>

        <button
          onClick={() => setActiveTab("IN_PREPARATION")}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            border: activeTab === "IN_PREPARATION" ? "2px solid #3b82f6" : "1px solid var(--border)",
            background: activeTab === "IN_PREPARATION" ? "#3b82f6" : "var(--bg-card)",
            color: activeTab === "IN_PREPARATION" ? "#fff" : "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Flame size={15} /> In Preparation ({inPrepCount})
        </button>

        <button
          onClick={() => setActiveTab("COMPLETED")}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            border: activeTab === "COMPLETED" ? "2px solid #22c55e" : "1px solid var(--border)",
            background: activeTab === "COMPLETED" ? "#22c55e" : "var(--bg-card)",
            color: activeTab === "COMPLETED" ? "#fff" : "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CheckCircle2 size={15} /> Completed ({completedCount})
        </button>
      </div>

      {/* Ticket Grid */}
      {filteredOrders.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            borderRadius: 14,
            background: "var(--bg-card)",
            border: "1px dashed var(--border)",
            color: "var(--text-muted)",
          }}
        >
          <Coffee size={40} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>
            Kitchen Queue is Clear
          </h3>
          <p style={{ fontSize: 13, marginTop: 4 }}>
            New orders placed from the cashier, kiosk, or WhatsApp will chime and appear here in real time.
          </p>
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

            let cardBorder = "1px solid var(--border)";
            if (isPending) cardBorder = "2px solid #f59e0b";
            if (isInPrep) cardBorder = "2px solid #3b82f6";
            if (isCompleted) cardBorder = "1px solid rgba(34, 197, 94, 0.4)";

            return (
              <div
                key={order.id}
                style={{
                  background: "var(--bg-card)",
                  borderRadius: 12,
                  border: cardBorder,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                  transition: "transform 0.15s ease",
                }}
              >
                {/* Ticket Header */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: "1px solid var(--border)",
                      paddingBottom: 10,
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>
                        Ticket #{order.id}
                      </span>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>

                    <ElapsedBadge createdAt={order.createdAt} />
                  </div>

                  {/* Status Badge */}
                  <div style={{ marginBottom: 12 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: isPending
                          ? "rgba(245, 158, 11, 0.15)"
                          : isInPrep
                          ? "rgba(59, 130, 246, 0.15)"
                          : "rgba(34, 197, 94, 0.15)",
                        color: isPending ? "#f59e0b" : isInPrep ? "#3b82f6" : "#22c55e",
                      }}
                    >
                      {isPending && <Clock size={12} />}
                      {isInPrep && <Flame size={12} />}
                      {isCompleted && <CheckCircle2 size={12} />}
                      {order.status.replace("_", " ")}
                    </span>
                  </div>

                  {/* Item List with Interactive Kitchen Checklist */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    {(() => {
                      const rawItems = (order as any).orderItems || (order as any).orderLines || [];
                      if (rawItems.length === 0) {
                        return (
                          <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", padding: "6px 0" }}>
                            Standard Café Order ({order.totalAmount ? `$${Number(order.totalAmount).toFixed(2)}` : "Pending Ticket"})
                          </div>
                        );
                      }

                      return rawItems.map((item: any, idx: number) => {
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
                              alignItems: "flex-start",
                              gap: 10,
                              padding: "9px 12px",
                              borderRadius: 8,
                              background: isChecked ? "var(--bg-surface)" : "rgba(255, 255, 255, 0.03)",
                              border: isChecked ? "1px solid var(--border)" : "1px solid rgba(255, 255, 255, 0.08)",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              style={{ marginTop: 3, cursor: "pointer", accentColor: "var(--accent)" }}
                            />
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  fontSize: 15,
                                  fontWeight: 700,
                                  color: isChecked ? "var(--text-muted)" : "var(--text-primary)",
                                  textDecoration: isChecked ? "line-through" : "none",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <span
                                  style={{
                                    background: isChecked ? "var(--border)" : "var(--accent)",
                                    color: "#fff",
                                    padding: "2px 7px",
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 800,
                                  }}
                                >
                                  {quantity}x
                                </span>
                                <span>{itemName}</span>
                              </div>
                              {item.notes && (
                                <div style={{ fontSize: 12, color: "#f59e0b", fontStyle: "italic", marginTop: 4, paddingLeft: 4 }}>
                                  📝 Special Instructions: {item.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {isPending && (
                    <button
                      onClick={() => handleTransition(order.id, "IN_PREPARATION")}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: 8,
                        background: "#3b82f6",
                        color: "#fff",
                        border: "none",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <Flame size={16} /> Start Cooking
                    </button>
                  )}

                  {isInPrep && (
                    <button
                      onClick={() => handleTransition(order.id, "COMPLETED")}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: 8,
                        background: "#22c55e",
                        color: "#fff",
                        border: "none",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <CheckCircle2 size={16} /> Ready / Complete
                    </button>
                  )}

                  {!isCompleted && (
                    <button
                      onClick={() => handleTransition(order.id, "CANCELLED")}
                      title="Cancel Order"
                      style={{
                        padding: "10px",
                        borderRadius: 8,
                        background: "rgba(239, 68, 68, 0.15)",
                        color: "#ef4444",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: "pointer",
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
