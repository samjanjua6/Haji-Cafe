"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarPlus, Users, User as UserIcon } from "lucide-react";
import { api } from "@/lib/api";
import Modal from "@/components/Modal";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";

interface Staff { id: number; email: string; role: string; }
interface Cafe { id: number; name: string; }

export default function StaffAndSchedulingPage() {
  const { cafeId } = useParams<{ cafeId: string }>();
  const router = useRouter();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  // Meeting modal
  const [scheduleMeeting, setScheduleMeeting] = useState(false);
  const [meetingSummary, setMeetingSummary] = useState("");
  const [meetingDesc, setMeetingDesc] = useState("");
  const [meetingStart, setMeetingStart] = useState("");
  const [meetingEnd, setMeetingEnd] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const load = async () => {
    try {
      const [c, s, user] = await Promise.all([
        api.get<Cafe>(`/cafes/${cafeId}`),
        api.get<Staff[]>(`/cafes/${cafeId}/staff`),
        api.get<any>("/auth/me"),
      ]);
      setCafe(c);
      setStaffList(s);
      setCurrentUser(user);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [cafeId]);

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStaff.length === 0) return toast.error("Select at least one staff member.");
    
    setSaving(true);
    try {
      await api.post(`/cafes/${cafeId}/meetings`, {
        summary: meetingSummary,
        description: meetingDesc || null,
        start_time: new Date(meetingStart).toISOString(),
        end_time: new Date(meetingEnd).toISOString(),
        attendee_user_ids: selectedStaff,
      });
      toast.success("Meeting scheduled & invites sent!");
      setScheduleMeeting(false);
      setMeetingSummary(""); setMeetingDesc(""); setMeetingStart(""); setMeetingEnd(""); setSelectedStaff([]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStaff = (id: number) => {
    if (selectedStaff.includes(id)) {
      setSelectedStaff(selectedStaff.filter(s => s !== id));
    } else {
      setSelectedStaff([...selectedStaff, id]);
    }
  };

  if (loading) return (
    <div style={{ display: "grid", gap: 24 }}>
      <div className="page-header">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton width={60} height={12} />
          <Skeleton width={200} height={26} />
          <Skeleton width={100} height={13} />
        </div>
        <Skeleton width={160} height={38} borderRadius={10} />
      </div>
      <div className="card">
        {[1,2,3].map(i => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--border-subtle)" }}>
            <Skeleton width="50%" height={20} />
            <Skeleton width="40%" height={20} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 13 }}>
            <ArrowLeft size={14} /> Back to {cafe?.name}
          </button>
          <div className="page-title">Staff & Meetings</div>
          <div className="page-subtitle">{cafe?.name} - ID: #{cafeId}</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {currentUser?.role === "CAFE_OWNER" && (
            <button className="btn btn-primary" onClick={() => setScheduleMeeting(true)} style={{ background: "#22c55e", color: "white", borderColor: "#22c55e" }}>
              <CalendarPlus size={15} /> Schedule Meeting
            </button>
          )}
        </div>
      </div>

      <div className="card table-wrap" style={{ marginTop: 24 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
            <Users size={18} color="var(--accent)" />
            <h3 style={{ fontSize: 16, margin: 0 }}>Staff Roster ({staffList.length})</h3>
        </div>
        
        {staffList.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No staff members found"
            subtitle="Staff assigned to this café or its branches will appear here."
          />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border-light)" }}>
                <th style={{ padding: "14px 20px", color: "var(--text-muted)", fontWeight: 600 }}>Staff Member</th>
                <th style={{ padding: "14px 20px", color: "var(--text-muted)", fontWeight: 600 }}>Role</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <td style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ background: "var(--bg-base)", padding: 8, borderRadius: "50%" }}>
                        <UserIcon size={16} color="var(--text-muted)" />
                    </div>
                    <span style={{ fontWeight: 500 }}>{s.email}</span>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{
                        background: "var(--bg-base)",
                        color: "var(--text-main)",
                        padding: "4px 8px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600
                    }}>
                        {s.role.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Schedule Meeting Modal */}
      <Modal open={scheduleMeeting} onClose={() => setScheduleMeeting(false)} title="Schedule Staff Meeting">
        <form onSubmit={handleScheduleMeeting} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><label>Meeting Subject</label><input value={meetingSummary} onChange={e => setMeetingSummary(e.target.value)} required placeholder="e.g. Weekly Branch Manager Sync" /></div>
          <div><label>Description (optional)</label><textarea value={meetingDesc} onChange={e => setMeetingDesc(e.target.value)} style={{ width: "100%", padding: 10, background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-main)", resize: "vertical" }} /></div>
          <div style={{ display: "flex", gap: 16, width: "100%", boxSizing: "border-box", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 200px" }}><label>Start Time</label><input type="datetime-local" value={meetingStart} onChange={e => setMeetingStart(e.target.value)} required style={{ width: "100%", boxSizing: "border-box" }} /></div>
            <div style={{ flex: "1 1 200px" }}><label>End Time</label><input type="datetime-local" value={meetingEnd} onChange={e => setMeetingEnd(e.target.value)} required style={{ width: "100%", boxSizing: "border-box" }} /></div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}><Users size={14}/> Invite Staff Members</label>
              {staffList.length > 0 && (
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "var(--accent)" }}>
                  <input 
                    type="checkbox" 
                    checked={selectedStaff.length === staffList.length} 
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStaff(staffList.map(s => s.id));
                      } else {
                        setSelectedStaff([]);
                      }
                    }} 
                  />
                  Select All
                </label>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 150, overflowY: "auto", overflowX: "hidden", padding: 10, background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 6 }}>
              {staffList.length === 0 ? <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No staff found for this café. Use Super Admin to assign staff.</div> : null}
              {staffList.map(s => (
                <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, width: "100%", justifyContent: "flex-start" }}>
                  <input type="checkbox" checked={selectedStaff.includes(s.id)} onChange={() => toggleStaff(s.id)} style={{ width: "auto", margin: 0, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontWeight: 600, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.email}</span>
                  <span style={{ fontSize: 11, background: "var(--bg-surface)", padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap", flexShrink: 0 }}>{s.role.replace("_", " ")}</span>
                </label>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving || selectedStaff.length === 0} style={{ justifyContent: "center", background: "#22c55e", color: "white", marginTop: 8 }}>
            <CalendarPlus size={16} /> {saving ? "Scheduling..." : "Create Calendar Invites"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
