const STATUS_CONFIG: Record<string, { bg: string; border: string; color: string; dotColor: string; label: string }> = {
  PENDING: {
    bg: "rgba(245, 158, 11, 0.1)",
    border: "rgba(245, 158, 11, 0.3)",
    color: "#f59e0b",
    dotColor: "#f59e0b",
    label: "Pending",
  },
  IN_PREPARATION: {
    bg: "rgba(59, 130, 246, 0.1)",
    border: "rgba(59, 130, 246, 0.3)",
    color: "#60a5fa",
    dotColor: "#3b82f6",
    label: "In Preparation",
  },
  COMPLETED: {
    bg: "rgba(34, 197, 94, 0.1)",
    border: "rgba(34, 197, 94, 0.3)",
    color: "#4ade80",
    dotColor: "#22c55e",
    label: "Completed",
  },
  CANCELLED: {
    bg: "rgba(239, 68, 68, 0.1)",
    border: "rgba(239, 68, 68, 0.3)",
    color: "#f87171",
    dotColor: "#ef4444",
    label: "Cancelled",
  },
};

export default function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || {
    bg: "rgba(148, 163, 184, 0.1)",
    border: "rgba(148, 163, 184, 0.3)",
    color: "#94a3b8",
    dotColor: "#94a3b8",
    label: status,
  };

  return (
    <span
      className="badge"
      style={{
        background: cfg.bg,
        borderColor: cfg.border,
        color: cfg.color,
      }}
    >
      <span
        className="badge-dot"
        style={{ background: cfg.dotColor }}
      />
      {cfg.label}
    </span>
  );
}
