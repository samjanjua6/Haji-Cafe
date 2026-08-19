export interface Cafe {
  id: number;
  name: string;
  ownerId: number | null;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
  branches?: Branch[];
}

export interface Branch {
  id: number;
  cafeId: number;
  name: string;
  address?: string;
  city?: string;
  createdAt: string;
}
