export interface Order {
  id: number;
  branchId: number;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  orderLines?: OrderLine[];
  placedBy?: { id: number; email: string };
}

export type OrderStatus = 'PENDING' | 'IN_PREPARATION' | 'COMPLETED' | 'CANCELLED';

export interface OrderLine {
  id: number;
  orderId: number;
  branchMenuItemId: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  itemName?: string;
  branchMenuItem?: {
    id: number;
    masterItem: {
      name: string;
    };
  };
}

export interface OrderCreate {
  lines: { branch_menu_item_id: number; quantity: number }[];
}

export interface OrderStatusUpdate {
  status: OrderStatus;
}
