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
  Radio,
  RefreshCw,
  ShoppingBag,
  Coffee,
  XCircle,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  Columns,
  LayoutGrid,
  BarChart3,
  Layers,
  Utensils,
  ChevronDown,
  ChevronUp,
  X,
  Mic,
  MicOff,
  Zap,
  AlertOctagon,
  Timer
} from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Order, OrderStatus } from "@/types/order";

// 1. Web Audio API Chime (Zero asset dependencies)
function playKitchenBell() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // First bell tone (880Hz - A5)
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

    // Resonant overtone (1760Hz - A6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1760, now + 0.08);
    gain2.gain.setValueAtTime(0.2, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.85);
  } catch (err) {
    console.error("Audio chime error:", err);
  }
}

// 2. Text-to-Speech Voice Announcer
function announceOrderVoice(text: string) {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel(); // Stop any overlapping voice
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("Speech synthesis error:", e);
  }
}

// Elapsed timer badge with live SLA urgency colors
function ElapsedBadge({ createdAt, isCompleted }: { createdAt: string; isCompleted?: boolean }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const calculate = () => {
      const created = new Date(createdAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - created) / 1000));
      setElapsedSeconds(diff);
    };

    calculate();
    if (isCompleted) return;
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [createdAt, isCompleted]);

  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const formatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  if (isCompleted) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 9px",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "monospace",
          backgroundColor: "rgba(34, 197, 94, 0.15)",
          color: "#22c55e",
          border: "1px solid rgba(34, 197, 94, 0.3)",
        }}
      >
        <CheckCircle2 size={13} /> {formatted}
      </span>
    );
  }

  // SLA Urgency: Green < 5m, Amber 5-10m, Pulsing Red > 10m
  let badgeStyle = {
    bg: "rgba(34, 197, 94, 0.15)",
    text: "#22c55e",
    border: "rgba(34, 197, 94, 0.35)",
    label: "NORMAL",
    pulse: false,
  };

  if (mins >= 10) {
    badgeStyle = {
      bg: "rgba(239, 68, 68, 0.25)",
      text: "#ef4444",
      border: "rgba(239, 68, 68, 0.6)",
      label: "RUSH!",
      pulse: true,
    };
  } else if (mins >= 5) {
    badgeStyle = {
      bg: "rgba(245, 158, 11, 0.2)",
      text: "#f59e0b",
      border: "rgba(245, 158, 11, 0.45)",
      label: "URGENT",
      pulse: false,
    };
  }

  return (
    <span
      className={badgeStyle.pulse ? "animate-pulse" : ""}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 9px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 800,
        fontFamily: "monospace",
        backgroundColor: badgeStyle.bg,
        color: badgeStyle.text,
        border: `1px solid ${badgeStyle.border}`,
        boxShadow: badgeStyle.pulse ? "0 0 10px rgba(239, 68, 68, 0.5)" : "none",
      }}
    >
      <Clock size={13} />
      <span>{formatted}</span>
      {mins >= 5 && <span style={{ fontSize: 10, letterSpacing: "0.05em" }}>{badgeStyle.label}</span>}
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

  // Settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSizeLarge, setFontSizeLarge] = useState(false);

  // View state
  const [viewMode, setViewMode] = useState<"KANBAN" | "GRID">("KANBAN");
  const [stationFilter, setStationFilter] = useState<"ALL" | "BARISTA" | "BAKERY">("ALL");
  const [showRecallTab, setShowRecallTab] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showBatchBar, setShowBatchBar] = useState(true);

  // Interaction state
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [lastBumpedOrder, setLastBumpedOrder] = useState<Order | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // 1. Fetch Orders on mount
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<{ data: Order[] }>(
        `/branches/${branchId}/orders?limit=60&sortBy=createdAt&sortDir=desc`
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

            // Extract item names for voice announcement
            const items = (newOrder as any).orderItems || (newOrder as any).orderLines || [];
            const itemSummary = items
              .map((i: any) => `${i.quantity || 1} ${i.branchMenuItem?.masterItem?.name || i.itemName || "Item"}`)
              .join(", ");

            if (voiceEnabled) {
              announceOrderVoice(`New Order ${newOrder.id}. ${itemSummary || "New items"}`);
            }

            toast.success(`🔔 New Ticket #${newOrder.id}: ${itemSummary || "Incoming order"}`, {
              duration: 5000,
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
          console.error("[KDS] Frame parse error:", e);
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
  }, [branchId, soundEnabled, voiceEnabled]);

  // 3. Status Transition
  const handleTransition = async (orderId: number, nextStatus: OrderStatus) => {
    try {
      const targetOrder = orders.find((o) => o.id === orderId);

      await api.patch(`/branches/${branchId}/orders/${orderId}/status`, {
        status: nextStatus,
      });

      // Optimistic update
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );

      if (nextStatus === "COMPLETED" && targetOrder) {
        setLastBumpedOrder(targetOrder);
        toast.success(
          (t) => (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span>Ticket #{orderId} Bumped!</span>
              <button
                onClick={() => {
                  handleTransition(orderId, "IN_PREPARATION");
                  toast.dismiss(t.id);
                }}
                style={{
                  background: "#3b82f6",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ↩ Recall
              </button>
            </div>
          ),
          { duration: 8000 }
        );
      } else {
        toast.success(`Ticket #${orderId} → ${nextStatus.replace("_", " ")}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update ticket");
    }
  };

  // 4. Recall last bumped order
  const handleRecallLast = () => {
    if (!lastBumpedOrder) return;
    handleTransition(lastBumpedOrder.id, "IN_PREPARATION");
    setLastBumpedOrder(null);
  };

  // 5. Checklist item toggle
  const toggleItemCheck = (orderId: number, lineId: number) => {
    const key = `${orderId}-${lineId}`;
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 6. Kiosk Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // 7. Bump Bar Physical Keyboard Shortcuts (Space to bump oldest, Z to recall, F fullscreen, M mute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        // Bump oldest IN_PREPARATION order, or oldest PENDING
        const inPrep = orders.filter((o) => o.status === "IN_PREPARATION");
        if (inPrep.length > 0) {
          const oldest = inPrep[inPrep.length - 1];
          handleTransition(oldest.id, "COMPLETED");
        } else {
          const pending = orders.filter((o) => o.status === "PENDING");
          if (pending.length > 0) {
            const oldest = pending[pending.length - 1];
            handleTransition(oldest.id, "IN_PREPARATION");
          }
        }
      } else if (e.key.toLowerCase() === "z") {
        if (lastBumpedOrder) handleRecallLast();
      } else if (e.key.toLowerCase() === "f") {
        toggleFullscreen();
      } else if (e.key.toLowerCase() === "m") {
        setSoundEnabled((s) => !s);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [orders, lastBumpedOrder]);

  // Calculations & Analytics
  const activeOrders = useMemo(() => {
    return orders.filter((o) => o.status === "PENDING" || o.status === "IN_PREPARATION");
  }, [orders]);

  const pendingOrders = useMemo(() => {
    return orders.filter((o) => o.status === "PENDING");
  }, [orders]);

  const inPrepOrders = useMemo(() => {
    return orders.filter((o) => o.status === "IN_PREPARATION");
  }, [orders]);

  const completedOrders = useMemo(() => {
    return orders.filter((o) => o.status === "COMPLETED");
  }, [orders]);

  // AI Smart Batching Calculation: Consolidates common items across active tickets
  const smartBatchSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    activeOrders.forEach((order) => {
      const items = (order as any).orderItems || (order as any).orderLines || [];
      items.forEach((item: any) => {
        const name = item.branchMenuItem?.masterItem?.name || item.masterItem?.name || item.itemName || "Item";
        counts[name] = (counts[name] || 0) + (item.quantity || 1);
      });
    });

    return Object.entries(counts)
      .filter(([_, qty]) => qty >= 1)
      .sort((a, b) => b[1] - a[1]);
  }, [activeOrders]);

  // Speed of Service (SOS) calculation
  const oldestWaitMinutes = useMemo(() => {
    if (activeOrders.length === 0) return 0;
    const oldestTimestamp = Math.min(...activeOrders.map((o) => new Date(o.createdAt).getTime()));
    return Math.floor((Date.now() - oldestTimestamp) / 60000);
  }, [activeOrders]);

  const delayedCount = useMemo(() => {
    return activeOrders.filter((o) => (Date.now() - new Date(o.createdAt).getTime()) / 60000 >= 10).length;
  }, [activeOrders]);

  // Filter items by Station (Barista vs Bakery)
  const filterItemByStation = (itemName: string) => {
    if (stationFilter === "ALL") return true;
    const lower = itemName.toLowerCase();
    const isDrink =
      lower.includes("latte") ||
      lower.includes("coffee") ||
      lower.includes("cappuccino") ||
      lower.includes("espresso") ||
      lower.includes("tea") ||
      lower.includes("matcha") ||
      lower.includes("americano") ||
      lower.includes("mocha") ||
      lower.includes("juice") ||
      lower.includes("water");

    if (stationFilter === "BARISTA") return isDrink;
    if (stationFilter === "BAKERY") return !isDrink;
    return true;
  };

  // Render individual Ticket Card
  const renderTicketCard = (order: Order) => {
    const isPending = order.status === "PENDING";
    const isInPrep = order.status === "IN_PREPARATION";
    const isCompleted = order.status === "COMPLETED";

    const rawItems = ((order as any).orderItems || (order as any).orderLines || []).filter((item: any) => {
      const name = item.branchMenuItem?.masterItem?.name || item.masterItem?.name || item.itemName || "";
      return filterItemByStation(name);
    });

    // Check item completion progress
    const totalItems = rawItems.length;
    const completedItemsCount = rawItems.filter((item: any, idx: number) => checkedItems[`${order.id}-${item.id || idx}`]).length;
    const progressPercent = totalItems > 0 ? Math.round((completedItemsCount / totalItems) * 100) : 0;

    let cardBorder = "1px solid rgba(255, 255, 255, 0.1)";
    let cardGlow = "none";
    if (isPending) {
      cardBorder = "2px solid #f59e0b";
      cardGlow = "0 0 16px rgba(245, 158, 11, 0.15)";
    } else if (isInPrep) {
      cardBorder = "2px solid #3b82f6";
      cardGlow = "0 0 16px rgba(59, 130, 246, 0.15)";
    } else if (isCompleted) {
      cardBorder = "1px solid rgba(34, 197, 94, 0.35)";
    }

    return (
      <div
        key={order.id}
        style={{
          background: "#131b2e",
          borderRadius: 14,
          border: cardBorder,
          boxShadow: cardGlow,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          overflow: "hidden",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}
      >
        {/* Ticket Header */}
        <div style={{ padding: "14px 16px", background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: fontSizeLarge ? 22 : 18,
                    fontWeight: 900,
                    color: "#fff",
                    fontFamily: "monospace",
                    letterSpacing: "-0.02em",
                  }}
                >
                  #{order.id}
                </span>
                <span
                  style={{
                    padding: "2px 7px",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    background: isPending ? "rgba(245, 158, 11, 0.2)" : isInPrep ? "rgba(59, 130, 246, 0.2)" : "rgba(34, 197, 94, 0.2)",
                    color: isPending ? "#f59e0b" : isInPrep ? "#3b82f6" : "#22c55e",
                  }}
                >
                  {order.status.replace("_", " ")}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • DINE IN / COUNTER
              </div>
            </div>

            <ElapsedBadge createdAt={order.createdAt} isCompleted={isCompleted} />
          </div>

          {/* Item Progress Bar */}
          {!isCompleted && totalItems > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                <span>Prep Progress</span>
                <span style={{ fontWeight: 700, color: progressPercent === 100 ? "#22c55e" : "var(--accent)" }}>
                  {completedItemsCount}/{totalItems} ({progressPercent}%)
                </span>
              </div>
              <div style={{ width: "100%", height: 5, background: "rgba(255, 255, 255, 0.1)", borderRadius: 99, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${progressPercent}%`,
                    background: progressPercent === 100 ? "#22c55e" : "var(--accent)",
                    transition: "width 0.25s ease",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Items List (Full Width, Unsquished) */}
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
          {rawItems.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", padding: "12px 0", textAlign: "center" }}>
              Standard Café Ticket (Total: ${Number(order.totalAmount || 0).toFixed(2)})
            </div>
          ) : (
            rawItems.map((item: any, idx: number) => {
              const key = `${order.id}-${item.id || idx}`;
              const isChecked = checkedItems[key] || false;
              const itemName = item.branchMenuItem?.masterItem?.name || item.masterItem?.name || item.itemName || `Item #${item.branchMenuItemId || idx + 1}`;
              const quantity = item.quantity || 1;

              return (
                <div
                  key={key}
                  onClick={() => toggleItemCheck(order.id, item.id || idx)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: isChecked ? "rgba(255, 255, 255, 0.02)" : "rgba(255, 255, 255, 0.05)",
                    border: isChecked ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid rgba(255, 255, 255, 0.12)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1, minWidth: 0 }}>
                    {/* Quantity Pill Badge */}
                    <span
                      style={{
                        background: isChecked ? "#334155" : "var(--accent)",
                        color: isChecked ? "#94a3b8" : "#0f172a",
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: fontSizeLarge ? 14 : 12,
                        fontWeight: 900,
                        fontFamily: "monospace",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {quantity}x
                    </span>

                    {/* Item Name & Instructions */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: fontSizeLarge ? 16 : 14,
                          fontWeight: 700,
                          color: isChecked ? "#64748b" : "#f1f5f9",
                          textDecoration: isChecked ? "line-through" : "none",
                          wordBreak: "break-word",
                          lineHeight: 1.3,
                        }}
                      >
                        {itemName}
                      </div>

                      {item.notes && (
                        <div
                          style={{
                            marginTop: 5,
                            padding: "4px 8px",
                            borderRadius: 6,
                            background: "rgba(245, 158, 11, 0.12)",
                            border: "1px solid rgba(245, 158, 11, 0.25)",
                            color: "#fbbf24",
                            fontSize: 12,
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <span>📝</span>
                          <span>Note: {item.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right-aligned Checkbox (Explicitly sized, never stretches) */}
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    style={{
                      width: 18,
                      height: 18,
                      minWidth: 18,
                      flexShrink: 0,
                      marginTop: 3,
                      cursor: "pointer",
                      accentColor: "var(--accent)",
                    }}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Action Buttons Footer */}
        <div style={{ padding: "12px 16px", background: "rgba(0, 0, 0, 0.2)", borderTop: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", gap: 8 }}>
          {isPending && (
            <button
              onClick={() => handleTransition(order.id, "IN_PREPARATION")}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: 8,
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                letterSpacing: "0.02em",
                boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
              }}
            >
              <Flame size={16} /> START COOKING
            </button>
          )}

          {isInPrep && (
            <button
              onClick={() => handleTransition(order.id, "COMPLETED")}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: 8,
                background: "#22c55e",
                color: "#0f172a",
                border: "none",
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                letterSpacing: "0.02em",
                boxShadow: "0 2px 8px rgba(34, 197, 94, 0.3)",
              }}
            >
              <CheckCircle2 size={16} /> BUMP TICKET (READY)
            </button>
          )}

          {isCompleted && (
            <button
              onClick={() => handleTransition(order.id, "IN_PREPARATION")}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: 8,
                background: "rgba(59, 130, 246, 0.15)",
                color: "#60a5fa",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <RotateCcw size={14} /> Recall Ticket
            </button>
          )}

          {!isCompleted && (
            <button
              onClick={() => handleTransition(order.id, "CANCELLED")}
              title="Cancel Order"
              style={{
                padding: "12px",
                borderRadius: 8,
                background: "rgba(239, 68, 68, 0.15)",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <XCircle size={16} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b0f19", color: "#f8fafc", padding: "16px 20px" }}>
      {/* 1. Main Header Command Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
          padding: "12px 18px",
          borderRadius: 12,
          background: "#131b2e",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => router.push(`/branches/${branchId}/orders${cafeId ? `?cafeId=${cafeId}` : ""}`)}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 8,
              padding: "7px 12px",
              color: "#f1f5f9",
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
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 19, fontWeight: 800, margin: 0, color: "#fff", letterSpacing: "-0.01em" }}>
                Haji Cafe Kitchen Display (KDS Ultra)
              </h1>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 10px",
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 800,
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
              Branch #{branchId} • Hotkeys: [Space] Bump Ticket • [Z] Recall • [F] Fullscreen
            </span>
          </div>
        </div>

        {/* Controls Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Shift Analytics Trigger */}
          <button
            onClick={() => setShowShiftModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: "rgba(59, 130, 246, 0.15)",
              color: "#60a5fa",
              border: "1px solid rgba(59, 130, 246, 0.3)",
            }}
          >
            <BarChart3 size={15} /> Shift SOS
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: soundEnabled ? "rgba(249, 115, 22, 0.15)" : "rgba(255, 255, 255, 0.05)",
              color: soundEnabled ? "var(--accent)" : "var(--text-muted)",
              border: soundEnabled ? "1px solid var(--accent)" : "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {soundEnabled ? "Chime On" : "Muted"}
          </button>

          {/* Voice Announce Toggle */}
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: voiceEnabled ? "rgba(168, 85, 247, 0.15)" : "rgba(255, 255, 255, 0.05)",
              color: voiceEnabled ? "#c084fc" : "var(--text-muted)",
              border: voiceEnabled ? "1px solid #c084fc" : "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            {voiceEnabled ? <Mic size={16} /> : <MicOff size={16} />}
            {voiceEnabled ? "Voice On" : "Voice Off"}
          </button>

          {/* Font Zoom Toggle */}
          <button
            onClick={() => setFontSizeLarge(!fontSizeLarge)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              background: fontSizeLarge ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.05)",
              color: "#fff",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            {fontSizeLarge ? "A+" : "A"}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: isFullscreen ? "var(--accent)" : "rgba(255, 255, 255, 0.05)",
              color: isFullscreen ? "#0f172a" : "#fff",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            {isFullscreen ? "Exit" : "Fullscreen"}
          </button>

          {/* Refresh */}
          <button
            onClick={fetchOrders}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 13,
              cursor: "pointer",
              background: "rgba(255, 255, 255, 0.05)",
              color: "#fff",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* 2. Speed of Service (SOS) KPI Metrics Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            background: "#131b2e",
            borderRadius: 10,
            padding: "10px 16px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ background: "rgba(245, 158, 11, 0.15)", padding: 8, borderRadius: 8, color: "#f59e0b" }}>
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
              Pending Queue
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#f59e0b" }}>{pendingOrders.length}</div>
          </div>
        </div>

        <div
          style={{
            background: "#131b2e",
            borderRadius: 10,
            padding: "10px 16px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ background: "rgba(59, 130, 246, 0.15)", padding: 8, borderRadius: 8, color: "#3b82f6" }}>
            <Flame size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
              Cooking Station
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#3b82f6" }}>{inPrepOrders.length}</div>
          </div>
        </div>

        <div
          style={{
            background: "#131b2e",
            borderRadius: 10,
            padding: "10px 16px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ background: "rgba(34, 197, 94, 0.15)", padding: 8, borderRadius: 8, color: "#22c55e" }}>
            <Timer size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
              Oldest Active Ticket
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: oldestWaitMinutes >= 10 ? "#ef4444" : "#22c55e" }}>
              {oldestWaitMinutes} mins
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#131b2e",
            borderRadius: 10,
            padding: "10px 16px",
            border: delayedCount > 0 ? "1px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              background: delayedCount > 0 ? "rgba(239, 68, 68, 0.25)" : "rgba(255, 255, 255, 0.05)",
              padding: 8,
              borderRadius: 8,
              color: delayedCount > 0 ? "#ef4444" : "var(--text-muted)",
            }}
          >
            <AlertOctagon size={20} className={delayedCount > 0 ? "animate-bounce" : ""} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
              Rush Delayed (&gt;10m)
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: delayedCount > 0 ? "#ef4444" : "var(--text-muted)" }}>
              {delayedCount}
            </div>
          </div>
        </div>
      </div>

      {/* 3. AI Smart Batching Bar (Expandable) */}
      {smartBatchSummary.length > 0 && (
        <div
          style={{
            background: "linear-gradient(90deg, rgba(245, 158, 11, 0.12) 0%, rgba(59, 130, 246, 0.12) 100%)",
            borderRadius: 10,
            border: "1px solid rgba(245, 158, 11, 0.3)",
            padding: "10px 16px",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
            onClick={() => setShowBatchBar(!showBatchBar)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Zap size={16} color="var(--accent)" />
              <span style={{ fontWeight: 800, fontSize: 13, color: "#fff", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                AI Smart Batching Assistant ({activeOrders.length} active tickets)
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
              <span>{showBatchBar ? "Collapse" : "Expand Summary"}</span>
              {showBatchBar ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </div>

          {showBatchBar && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
              {smartBatchSummary.map(([itemName, qty]) => (
                <div
                  key={itemName}
                  style={{
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: 6,
                    padding: "4px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                  }}
                >
                  <span style={{ background: "var(--accent)", color: "#0f172a", padding: "1px 6px", borderRadius: 4, fontWeight: 900, fontSize: 11 }}>
                    {qty}x
                  </span>
                  <span style={{ fontWeight: 600, color: "#f1f5f9" }}>{itemName}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Controls & Station Filter Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 18,
        }}
      >
        {/* Station Tabs */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
          <button
            onClick={() => {
              setStationFilter("ALL");
              setShowRecallTab(false);
            }}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              border: !showRecallTab && stationFilter === "ALL" ? "2px solid var(--accent)" : "1px solid rgba(255, 255, 255, 0.1)",
              background: !showRecallTab && stationFilter === "ALL" ? "var(--accent)" : "#131b2e",
              color: !showRecallTab && stationFilter === "ALL" ? "#0f172a" : "#fff",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Layers size={14} /> All Stations ({activeOrders.length})
          </button>

          <button
            onClick={() => {
              setStationFilter("BARISTA");
              setShowRecallTab(false);
            }}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              border: !showRecallTab && stationFilter === "BARISTA" ? "2px solid #3b82f6" : "1px solid rgba(255, 255, 255, 0.1)",
              background: !showRecallTab && stationFilter === "BARISTA" ? "#3b82f6" : "#131b2e",
              color: !showRecallTab && stationFilter === "BARISTA" ? "#fff" : "#fff",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Coffee size={14} /> ☕ Barista Station
          </button>

          <button
            onClick={() => {
              setStationFilter("BAKERY");
              setShowRecallTab(false);
            }}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              border: !showRecallTab && stationFilter === "BAKERY" ? "2px solid #f59e0b" : "1px solid rgba(255, 255, 255, 0.1)",
              background: !showRecallTab && stationFilter === "BAKERY" ? "#f59e0b" : "#131b2e",
              color: !showRecallTab && stationFilter === "BAKERY" ? "#0f172a" : "#fff",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Utensils size={14} /> 🥐 Bakery / Food
          </button>

          <button
            onClick={() => setShowRecallTab(true)}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              border: showRecallTab ? "2px solid #22c55e" : "1px solid rgba(255, 255, 255, 0.1)",
              background: showRecallTab ? "#22c55e" : "#131b2e",
              color: showRecallTab ? "#0f172a" : "#fff",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <RotateCcw size={14} /> Recall / Completed ({completedOrders.length})
          </button>
        </div>

        {/* View Mode Toggle (Kanban vs Grid) */}
        {!showRecallTab && (
          <div style={{ display: "flex", background: "#131b2e", borderRadius: 8, padding: 3, border: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <button
              onClick={() => setViewMode("KANBAN")}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "none",
                background: viewMode === "KANBAN" ? "var(--accent)" : "transparent",
                color: viewMode === "KANBAN" ? "#0f172a" : "var(--text-muted)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Columns size={13} /> Kanban Columns
            </button>
            <button
              onClick={() => setViewMode("GRID")}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "none",
                background: viewMode === "GRID" ? "var(--accent)" : "transparent",
                color: viewMode === "GRID" ? "#0f172a" : "var(--text-muted)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <LayoutGrid size={13} /> Dense Grid
            </button>
          </div>
        )}
      </div>

      {/* 5. Main Board View */}
      {showRecallTab ? (
        /* Completed Recall Tab View */
        <div>
          <div style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
              Showing last {completedOrders.length} completed tickets. Tap "Recall Ticket" to bring any ticket back into preparation.
            </span>
          </div>
          {completedOrders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", background: "#131b2e", borderRadius: 14, border: "1px dashed rgba(255, 255, 255, 0.1)" }}>
              <Coffee size={40} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
              <h3>No Completed Tickets Yet</h3>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
              {completedOrders.map(renderTicketCard)}
            </div>
          )}
        </div>
      ) : activeOrders.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
            borderRadius: 14,
            background: "#131b2e",
            border: "1px dashed rgba(255, 255, 255, 0.1)",
            color: "var(--text-muted)",
          }}
        >
          <Coffee size={48} style={{ margin: "0 auto 16px", opacity: 0.4, color: "var(--accent)" }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#fff" }}>Kitchen Queue is All Clear!</h2>
          <p style={{ fontSize: 14, marginTop: 6 }}>
            New customer orders placed by staff or customers will chime and appear here in real time.
          </p>
        </div>
      ) : viewMode === "KANBAN" ? (
        /* Dual Column Kanban Swimlanes */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
          {/* Column 1: Pending Queue */}
          <div
            style={{
              background: "rgba(245, 158, 11, 0.03)",
              border: "1px solid rgba(245, 158, 11, 0.2)",
              borderRadius: 14,
              padding: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid rgba(245, 158, 11, 0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#f59e0b" }}>
                  INCOMING QUEUE ({pendingOrders.length})
                </h3>
              </div>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Awaiting Acceptance</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {pendingOrders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 10px", color: "var(--text-muted)", fontStyle: "italic" }}>
                  No pending tickets
                </div>
              ) : (
                pendingOrders.map(renderTicketCard)
              )}
            </div>
          </div>

          {/* Column 2: Cooking Station */}
          <div
            style={{
              background: "rgba(59, 130, 246, 0.03)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              borderRadius: 14,
              padding: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid rgba(59, 130, 246, 0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#3b82f6" }} />
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#3b82f6" }}>
                  IN PREPARATION ({inPrepOrders.length})
                </h3>
              </div>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Active on Station</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {inPrepOrders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 10px", color: "var(--text-muted)", fontStyle: "italic" }}>
                  No orders currently cooking
                </div>
              ) : (
                inPrepOrders.map(renderTicketCard)
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Dense Full Grid Mode */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 16,
          }}
        >
          {activeOrders.map(renderTicketCard)}
        </div>
      )}

      {/* 6. Shift SOS Performance Modal */}
      {showShiftModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 20,
          }}
          onClick={() => setShowShiftModal(false)}
        >
          <div
            style={{
              background: "#131b2e",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: 16,
              maxWidth: 480,
              width: "100%",
              padding: 24,
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <BarChart3 size={20} color="var(--accent)" />
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Shift Speed of Service (SOS)</h3>
              </div>
              <button
                onClick={() => setShowShiftModal(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: 14, borderRadius: 10 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase" }}>Total Completed</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#22c55e", marginTop: 4 }}>{completedOrders.length}</div>
              </div>
              <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: 14, borderRadius: 10 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase" }}>Current Active</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent)", marginTop: 4 }}>{activeOrders.length}</div>
              </div>
              <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: 14, borderRadius: 10 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase" }}>SLA Compliance</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: delayedCount === 0 ? "#22c55e" : "#f59e0b", marginTop: 4 }}>
                  {activeOrders.length > 0 ? Math.round(((activeOrders.length - delayedCount) / activeOrders.length) * 100) : 100}%
                </div>
              </div>
              <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: 14, borderRadius: 10 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase" }}>Oldest Active</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: oldestWaitMinutes >= 10 ? "#ef4444" : "#f1f5f9", marginTop: 4 }}>
                  {oldestWaitMinutes}m
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowShiftModal(false)}
              className="btn btn-primary"
              style={{ width: "100%", padding: "12px", fontWeight: 700 }}
            >
              Close Shift Metrics
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
