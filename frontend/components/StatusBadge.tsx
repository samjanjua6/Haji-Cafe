const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  PENDING: { bg: "#fef3c7", color: "#92400e", label: "Pending" },
  IN_PREPARATION: { bg: "#dbeafe", color: "#1e40af", label: "In Preparation" },
  COMPLETED: { bg: "#dcfce7", color: "#166534", label: "Completed" },
  CANCELLED: { bg: "#fee2e2", color: "#991b1b", label: "Cancelled" },
};

export default function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || { bg: "#334155", color: "#f1f5f9", label: status };
  return (
    <span style={{
      background: style.bg, color: style.color,
      padding: "3px 10px", borderRadius: 999,
      fontSize: 12, fontWeight: 600,
    }}>
      {style.label}
    </span>
  );
}
