import { Order, OrderLine } from "@/types/order";
import { formatCurrency, formatDateTime } from "./format";

export interface NormalizedOrderItem {
  id: number | string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string | null;
  branchMenuItemId?: number;
}

/**
 * Universal normalizer for order line items across the application.
 * Transparently supports both Prisma `orderItems` and legacy `orderLines`,
 * resolving field differences like `priceAtPurchase` vs `unitPrice`.
 */
export function normalizeOrderItems(order: any): NormalizedOrderItem[] {
  if (!order) return [];

  const rawList: any[] =
    order.orderItems ||
    order.orderLines ||
    order.items ||
    [];

  if (!Array.isArray(rawList)) return [];

  return rawList.map((item, idx) => {
    // 1. Resolve Item Name
    const name =
      item.branchMenuItem?.masterItem?.name ||
      item.masterItem?.name ||
      item.itemName ||
      item.name ||
      `Item #${item.branchMenuItemId || item.id || idx + 1}`;

    // 2. Resolve Unit Price
    const rawPrice =
      item.priceAtPurchase ??
      item.unitPrice ??
      item.priceOverride ??
      item.effectivePrice ??
      item.branchMenuItem?.priceOverride ??
      item.branchMenuItem?.masterItem?.basePrice ??
      0;
    const unitPrice = typeof rawPrice === "number" ? rawPrice : parseFloat(String(rawPrice)) || 0;

    // 3. Resolve Quantity
    const quantity = Math.max(1, parseInt(String(item.quantity || 1), 10) || 1);

    // 4. Resolve Line Total
    const rawTotal = item.lineTotal;
    const lineTotal =
      rawTotal !== undefined && rawTotal !== null
        ? typeof rawTotal === "number"
          ? rawTotal
          : parseFloat(String(rawTotal)) || unitPrice * quantity
        : unitPrice * quantity;

    return {
      id: item.id || `line-${idx}`,
      name,
      quantity,
      unitPrice,
      lineTotal,
      notes: item.notes || null,
      branchMenuItemId: item.branchMenuItemId,
    };
  });
}

/**
 * Summarizes an order's items into a readable string.
 * Example: "2x Spanish Latte, 1x Smoked Turkey (+1 more)"
 */
export function getOrderItemsSummary(order: any, maxItems: number = 2): string {
  const normalized = normalizeOrderItems(order);
  if (normalized.length === 0) return "1 order batch";

  const head = normalized.slice(0, maxItems).map((i) => `${i.quantity}x ${i.name}`);
  const remaining = normalized.length - maxItems;

  if (remaining > 0) {
    return `${head.join(", ")} (+${remaining} more)`;
  }
  return head.join(", ");
}

/**
 * Formats a clean, text-based receipt suitable for copying to clipboard,
 * WhatsApp messaging, or SMS customer notifications.
 */
export function formatTextReceipt(order: any, cafeName: string = "Haji Cafe"): string {
  if (!order) return "";

  const items = normalizeOrderItems(order);
  const branchName = order.branch?.name || "Main Branch";
  const branchLocation = order.branch?.location || "";
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  const divider = "----------------------------------------";
  const doubleDivider = "========================================";

  const lines: string[] = [
    doubleDivider,
    `           ${cafeName.toUpperCase()}`,
    `            ${branchName}`,
    branchLocation ? `       ${branchLocation}` : "",
    doubleDivider,
    `Receipt / Order: #${order.id}`,
    `Date: ${formatDateTime(order.createdAt)}`,
    `Status: ${order.status?.replace(/_/g, " ")}`,
    divider,
    "ITEMS:",
  ];

  if (items.length > 0) {
    items.forEach((item) => {
      const itemDesc = `${item.quantity}x ${item.name}`;
      const priceStr = formatCurrency(item.lineTotal);
      const padding = Math.max(2, 40 - itemDesc.length - priceStr.length);
      lines.push(`${itemDesc}${" ".repeat(padding)}${priceStr}`);
      if (item.notes) {
        lines.push(`   * Note: ${item.notes}`);
      }
    });
  } else {
    lines.push(`1x Standard Order Batch                ${formatCurrency(order.totalAmount)}`);
  }

  lines.push(divider);
  lines.push(`Total Items:${" ".repeat(Math.max(2, 40 - 12 - String(totalItems).length))}${totalItems}`);
  lines.push(`GRAND TOTAL:${" ".repeat(Math.max(2, 40 - 12 - formatCurrency(order.totalAmount).length))}${formatCurrency(order.totalAmount)}`);
  lines.push(doubleDivider);
  lines.push("   Thank you for visiting Haji Cafe!");
  lines.push("     Haji Cafe Management System");

  return lines.filter(Boolean).join("\n");
}
