const STATUS_CONFIG: Record<string, { glow: string; color: string; label: string }> = {
  PENDING: {
    glow: "var(--warning-glow)",
    color: "var(--warning)",
    label: "Pending",
  },
  IN_PREPARATION: {
    glow: "var(--info-glow)",
    color: "var(--info)",
    label: "In Preparation",
  },
  COMPLETED: {
    glow: "var(--success-glow)",
    color: "var(--success)",
    label: "Completed",
  },
  CANCELLED: {
    glow: "var(--danger-glow)",
    color: "var(--danger)",
    label: "Cancelled",
  },
};

export default function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || {
    glow: "rgba(148, 163, 184, 0.1)",
    color: "var(--text-muted)",
    label: status,
  };

  return (
    <span
      className="badge"
      style={{
        background: cfg.glow,
        color: cfg.color,
      }}
    >
      <span
        className="badge-dot"
        style={{ background: cfg.color }}
      />
      {cfg.label}
    </span>
  );
}
