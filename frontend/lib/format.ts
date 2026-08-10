// lib/format.ts — Centralized formatting utilities

/**
 * Format a date string as "Aug 6, 2026" — returns "—" for null/invalid dates
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Format a date string as "Aug 6, 2026 · 10:42 AM" — returns "—" for null/invalid
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${date} · ${time}`;
}

/**
 * Map backend enum status values to human-readable labels
 */
const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_PREPARATION: "Preparing",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  SUPER_ADMIN: "Super Admin",
  CAFE_OWNER: "Café Owner",
  BRANCH_MANAGER: "Branch Manager",
  STAFF: "Staff",
};

export function formatStatus(status: string): string {
  return STATUS_LABELS[status] || status.replace(/_/g, " ");
}

/**
 * Format a number as currency — "$4.50"
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  const num = Number(amount);
  if (isNaN(num)) return "—";
  return `$${num.toFixed(2)}`;
}

/**
 * Format a role string for display — "CAFE_OWNER" → "Café Owner"
 */
export function formatRole(role: string): string {
  return STATUS_LABELS[role] || role.replace(/_/g, " ");
}
