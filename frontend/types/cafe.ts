export interface Cafe {
  id: number;
  name: string;
  createdAt: string;
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
