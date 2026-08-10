import { formatStatus } from "@/lib/format";

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: "var(--info-bg)", color: "var(--info)" },
  IN_PREPARATION: { bg: "var(--warning-bg)", color: "var(--warning)" },
  COMPLETED: { bg: "var(--success-bg)", color: "var(--success)" },
  CANCELLED: { bg: "var(--danger-bg)", color: "var(--danger)" },
};

export default function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || { bg: "var(--border)", color: "var(--text-primary)" };
  return (
    <span style={{
      background: style.bg, color: style.color,
      padding: "4px 12px", borderRadius: 999,
      fontSize: 12, fontWeight: 600, display: "inline-block",
    }}>
      {formatStatus(status)}
    </span>
  );
}
