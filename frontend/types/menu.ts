export interface MasterMenuItem {
  id: number;
  cafeId: number;
  categoryId: number | null;
  name: string;
  description: string | null;
  basePrice: number;
  isDeleted: boolean;
  category?: Category | null;
}

export interface Category {
  id: number;
  cafeId: number;
  name: string;
}

export interface BranchMenuItem {
  id: number;
  branchId: number;
  masterItemId: number;
  priceOverride: number | null;
  availableQuantity: number | null;
  isInStock: boolean;
  isActive: boolean;
  effectivePrice: number;
  masterItem: {
    id: number;
    name: string;
    basePrice: number;
    description: string | null;
  };
}

export interface MasterMenuItemCreate {
  name: string;
  description?: string;
  base_price: number;
  category_id?: number;
}

export interface MasterMenuItemUpdate {
  name?: string;
  description?: string;
  base_price?: number;
  category_id?: number;
}

export interface BranchMenuItemCreate {
  master_item_id: number;
  price_override?: number;
  available_quantity?: number;
  is_in_stock?: boolean;
  is_active?: boolean;
}

export interface BranchMenuItemPatch {
  price_override?: number;
  available_quantity?: number;
  is_in_stock?: boolean;
  is_active?: boolean;
}
