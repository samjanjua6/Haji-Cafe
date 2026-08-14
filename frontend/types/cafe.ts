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

export interface CafeCreate {
  name: string;
}

export interface CafeUpdate {
  name?: string;
}

export interface BranchCreate {
  name: string;
  address?: string;
  city?: string;
}

export interface BranchUpdate {
  name?: string;
  address?: string;
  city?: string;
}

export interface Staff {
  id: number;
  email: string;
  role: { name: string };
  scopes: { branchId: number; branchName: string }[];
}

export interface MeetingCreate {
  title: string;
  start_time: string;
  end_time: string;
  attendee_emails: string[];
  description?: string;
}
