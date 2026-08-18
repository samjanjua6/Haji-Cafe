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
  lowStockThreshold: number;
  effectivePrice: number;
  masterItem: {
    id: number;
    name: string;
    basePrice: number;
    description: string | null;
  };
}
