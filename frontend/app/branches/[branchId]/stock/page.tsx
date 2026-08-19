"use client";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, GitBranch, History, Settings2 } from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { BranchMenuItem } from "@/types/menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import { useCurrentUser } from "@/hooks/useCurrentUser";

import { Card } from "@/components/Card";
import { Table, TableHead, TableBody, TableRow, TableCell } from "@/components/Table";

export default function BranchStockPage() {
  const router = useRouter();
  const params = useParams<{ branchId: string }>();
  const queryClient = useQueryClient();
  const branchId = params.branchId;
  const { data: user } = useCurrentUser();
  
  const [stockModal, setStockModal] = useState<BranchMenuItem | null>(null);
  const [thresholdModal, setThresholdModal] = useState<BranchMenuItem | null>(null);
  const [historyModal, setHistoryModal] = useState<BranchMenuItem | null>(null);

  // Forms
  const [stockForm, setStockForm] = useState({ availableQuantity: "", isInStock: true, reason: "Adjustment", note: "" });
  const [thresholdForm, setThresholdForm] = useState({ lowStockThreshold: "5" });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["branchMenu", branchId],
    queryFn: () => api.get<BranchMenuItem[]>(`/branches/${branchId}/menu`)
  });

  const { data: historyLogs = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["stockHistory", branchId, historyModal?.id],
    queryFn: () => api.get<any[]>(`/branches/${branchId}/menu/${historyModal?.id}/stock-history`),
    enabled: !!historyModal
  });

  const stockMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number, payload: any }) => 
      api.put(`/branches/${branchId}/menu/${id}/stock`, payload),
    onSuccess: () => {
      toast.success("Stock updated!"); 
      setStockModal(null);
      queryClient.invalidateQueries({ queryKey: ["branchMenu", branchId] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const thresholdMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number, payload: any }) => 
      api.put(`/branches/${branchId}/menu/${id}/threshold`, payload),
    onSuccess: () => {
      toast.success("Threshold updated!"); 
      setThresholdModal(null);
      queryClient.invalidateQueries({ queryKey: ["branchMenu", branchId] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const handleStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModal) return;
    stockMutation.mutate({
      id: stockModal.id,
      payload: {
        availableQuantity: stockForm.availableQuantity === "" ? null : parseInt(stockForm.availableQuantity),
        isInStock: stockForm.isInStock,
        reason: stockForm.reason,
        note: stockForm.note
      }
    });
  };

  const handleThresholdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!thresholdModal) return;
    thresholdMutation.mutate({
      id: thresholdModal.id,
      payload: { lowStockThreshold: parseInt(thresholdForm.lowStockThreshold) }
    });
  };

  const openStockModal = (item: BranchMenuItem) => {
    setStockForm({
      availableQuantity: item.availableQuantity !== null ? String(item.availableQuantity) : "",
      isInStock: item.isInStock,
      reason: "Inventory Check",
      note: ""
    });
    setStockModal(item);
  };

  const openThresholdModal = (item: BranchMenuItem) => {
    setThresholdForm({ lowStockThreshold: String(item.lowStockThreshold) });
    setThresholdModal(item);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 13 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <div className="page-title">Stock Management</div>
          <div className="page-subtitle">Track and adjust inventory for branch #{branchId}</div>
        </div>
      </div>

      <Card padding="none">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center" }}><span className="loading" /></div>
        ) : items.length === 0 ? (
          <EmptyState icon={GitBranch} title="No items found" subtitle="No menu items are assigned to this branch." />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell isHeader>Item</TableCell>
                <TableCell isHeader>Status</TableCell>
                <TableCell isHeader>Qty Remaining</TableCell>
                <TableCell isHeader>Threshold</TableCell>
                <TableCell isHeader style={{ textAlign: "right" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(item => {
                let statusText = "In Stock";
                let color = "var(--success)";
                if (item.isInStock === false) { statusText = "Sold Out (Override)"; color = "var(--danger)"; }
                else if (item.availableQuantity === 0) { statusText = "Sold Out"; color = "var(--danger)"; }
                else if (item.availableQuantity !== null && item.availableQuantity <= item.lowStockThreshold) { statusText = "Low Stock"; color = "var(--warning)"; }

                return (
                  <TableRow key={item.id}>
                    <TableCell style={{ fontWeight: 600 }}>{item.masterItem.name}</TableCell>
                    <TableCell style={{ color, fontSize: 13, fontWeight: 600 }}>{statusText}</TableCell>
                    <TableCell style={{ fontFamily: "monospace" }}>{item.availableQuantity ?? "∞"}</TableCell>
                    <TableCell style={{ color: "var(--text-muted)" }}>{item.lowStockThreshold}</TableCell>
                    <TableCell style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openStockModal(item)} title="Adjust Stock">
                          <Settings2 size={14} /> Adjust
                        </button>
                        {(user?.role === "CAFE_OWNER" || user?.role === "SUPER_ADMIN") && (
                          <button className="btn btn-ghost btn-sm" onClick={() => openThresholdModal(item)} title="Set Threshold">
                            <GitBranch size={14} /> Threshold
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => setHistoryModal(item)} title="View History">
                          <History size={14} /> Log
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Adjust Stock Modal */}
      <Modal open={!!stockModal} onClose={() => setStockModal(null)} title={`Adjust Stock: ${stockModal?.masterItem.name}`}>
        <form onSubmit={handleStockSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="form-group">
            <label>Available Quantity (Leave blank for infinite)</label>
            <input type="number" min="0" className="input" value={stockForm.availableQuantity} onChange={e => setStockForm({...stockForm, availableQuantity: e.target.value})} placeholder="∞" />
          </div>
          <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={stockForm.isInStock} onChange={e => setStockForm({...stockForm, isInStock: e.target.checked})} />
            <label style={{ margin: 0 }}>Available for Sale (Manual Override)</label>
          </div>
          <div className="form-group">
            <label>Reason</label>
            <select className="input" value={stockForm.reason} onChange={e => setStockForm({...stockForm, reason: e.target.value})} required>
              <option value="Inventory Check">Inventory Check</option>
              <option value="Restock Delivery">Restock Delivery</option>
              <option value="Wastage/Spoilage">Wastage / Spoilage</option>
              <option value="Manual Override">Manual Override</option>
            </select>
          </div>
          <div className="form-group">
            <label>Note (Optional)</label>
            <input type="text" className="input" value={stockForm.note} onChange={e => setStockForm({...stockForm, note: e.target.value})} placeholder="E.g., Morning count" />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setStockModal(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={stockMutation.isPending}>Save</button>
          </div>
        </form>
      </Modal>

      {/* Threshold Modal */}
      <Modal open={!!thresholdModal} onClose={() => setThresholdModal(null)} title={`Set Alert Threshold: ${thresholdModal?.masterItem.name}`}>
        <form onSubmit={handleThresholdSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Trigger a "Low Stock" alert when the available quantity drops to or below this number.
          </p>
          <div className="form-group">
            <label>Low Stock Threshold</label>
            <input type="number" min="0" className="input" required value={thresholdForm.lowStockThreshold} onChange={e => setThresholdForm({...thresholdForm, lowStockThreshold: e.target.value})} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setThresholdModal(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={thresholdMutation.isPending}>Save</button>
          </div>
        </form>
      </Modal>

      {/* History Log Modal */}
      <Modal open={!!historyModal} onClose={() => setHistoryModal(null)} title={`History: ${historyModal?.masterItem.name}`}>
        <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {loadingHistory ? (
            <div style={{ padding: 40, textAlign: "center" }}><span className="loading" /></div>
          ) : historyLogs.length === 0 ? (
            <EmptyState icon={History} title="No logs found" subtitle="Stock changes will appear here." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {historyLogs.map((log: any) => (
                <div key={log.id} style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 6, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{log.changeType}</span>
                    <span style={{ color: "var(--text-muted)" }}>{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>
                    {log.reason} {log.note ? `— ${log.note}` : ""}
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                    <span>User: {log.user?.email || "System"}</span>
                    <span>Change: <strong style={{ color: log.amountChanged < 0 ? "var(--danger)" : log.amountChanged > 0 ? "var(--success)" : "inherit"}}>{log.amountChanged > 0 ? `+${log.amountChanged}` : log.amountChanged}</strong></span>
                    <span>Stock: {log.previousQuantity ?? '∞'} → <strong>{log.newQuantity ?? '∞'}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
