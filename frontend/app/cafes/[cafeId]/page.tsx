"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/LoadingSkeleton";
import { HistoricalPredictionChart } from "@/components/analytics/HistoricalPredictionChart";

interface Cafe {
  id: number;
  name: string;
  createdAt: string;
}

export default function CafeDetailPage() {
  const { cafeId } = useParams<{ cafeId: string }>();
  const router = useRouter();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const c = await api.get<Cafe>(`/cafes/${cafeId}`);
      setCafe(c);
    } catch (e: any) {
      toast.error(e.message || "Failed to load café details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cafeId) load();
  }, [cafeId]);

  if (loading) {
    return (
      <div style={{ display: "grid", gap: 24 }}>
        {/* Header skeleton */}
        <div className="page-header">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton width={60} height={12} />
            <Skeleton width={200} height={26} />
            <Skeleton width={100} height={13} />
          </div>
        </div>
        {/* Chart skeleton */}
        <Skeleton height={320} borderRadius={12} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <button
            onClick={() => router.back()}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
              fontSize: 13,
              padding: 0,
            }}
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <div className="page-title">{cafe?.name}</div>
          <div className="page-subtitle">Café ID: #{cafeId}</div>
        </div>
      </div>

      {/* AI Historical Intelligence & Predictive Sales Forecasting Graph */}
      <div>
        <HistoricalPredictionChart cafeId={parseInt(cafeId)} cafeName={cafe?.name} />
      </div>
    </div>
  );
}
