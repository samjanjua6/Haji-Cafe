"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarPlus, Users, User as UserIcon } from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import CafeSubnav from "@/components/cafes/CafeSubnav";

interface Staff { id: number; email: string; role: string; }
interface Cafe { id: number; name: string; }

export default function StaffAndSchedulingPage() {
  const { cafeId } = useParams<{ cafeId: string }>();
  const router = useRouter();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  // Meeting states
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
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div className="card">
          <Skeleton width={150} height={20} style={{ marginBottom: 16 }} />
          {[1,2,3].map(i => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <Skeleton width="50%" height={20} />
              <Skeleton width="40%" height={20} />
            </div>
          ))}
        </div>
        <div className="card">
          <Skeleton width={180} height={20} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={40} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={80} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={40} />
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <CafeSubnav cafeId={cafeId} cafeName={cafe?.name} />
      <div className="page-header">
        <div>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 13 }}>
            <ArrowLeft size={14} /> Back to {cafe?.name}
          </button>
          <div className="page-title">Staff & Meetings</div>
          <div className="page-subtitle">{cafe?.name} - ID: #{cafeId}</div>
        </div>
      </div>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", 
        gap: 24, 
        marginTop: 24,
        alignItems: "start"
      }}>
        {/* Left Column: Staff Roster */}
        <div className="card table-wrap">
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
                  <th style={{ padding: "14px 20px", width: 40 }}>
                    <input 
                      type="checkbox" 
                      checked={staffList.length > 0 && selectedStaff.length === staffList.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStaff(staffList.map(s => s.id));
                        } else {
                          setSelectedStaff([]);
                        }
                      }}
                      style={{ cursor: "pointer" }}
                    />
                  </th>
                  <th style={{ padding: "14px 0", color: "var(--text-muted)", fontWeight: 600 }}>Staff Member</th>
                  <th style={{ padding: "14px 20px", color: "var(--text-muted)", fontWeight: 600 }}>Role</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map(s => (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--border-light)", transition: "background 0.2s", background: selectedStaff.includes(s.id) ? "var(--bg-surface)" : "transparent" }}>
                    <td style={{ padding: "14px 20px" }}>
                      <input 
                        type="checkbox" 
                        checked={selectedStaff.includes(s.id)} 
                        onChange={() => toggleStaff(s.id)}
                        style={{ cursor: "pointer" }}
                      />
                    </td>
                    <td style={{ padding: "14px 0", display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ background: "var(--bg-base)", padding: 8, borderRadius: "50%" }}>
                          <UserIcon size={16} color="var(--text-muted)" />
                      </div>
                      <span style={{ fontWeight: 500, color: selectedStaff.includes(s.id) ? "var(--accent)" : "inherit" }}>{s.email}</span>
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

        {/* Right Column: Schedule Meeting Form */}
        {currentUser?.role === "CAFE_OWNER" && (
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
              <CalendarPlus size={18} color="var(--success)" />
              <h3 style={{ fontSize: 16, margin: 0 }}>Schedule a Meeting</h3>
            </div>
            <form onSubmit={handleScheduleMeeting} style={{ display: "flex", flexDirection: "column", gap: 20, padding: 20 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>Meeting Subject</label>
                <input value={meetingSummary} onChange={e => setMeetingSummary(e.target.value)} required placeholder="e.g. Weekly Branch Manager Sync" style={{ width: "100%" }} />
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>Description (optional)</label>
                <textarea value={meetingDesc} onChange={e => setMeetingDesc(e.target.value)} style={{ width: "100%", padding: 10, background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-main)", resize: "vertical", minHeight: 80 }} placeholder="Agenda or notes for the meeting..." />
              </div>
              
              <div style={{ display: "flex", gap: 16, width: "100%", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 150px" }}>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>Start Time</label>
                  <input type="datetime-local" value={meetingStart} onChange={e => setMeetingStart(e.target.value)} required style={{ width: "100%" }} />
                </div>
                <div style={{ flex: "1 1 150px" }}>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>End Time</label>
                  <input type="datetime-local" value={meetingEnd} onChange={e => setMeetingEnd(e.target.value)} required style={{ width: "100%" }} />
                </div>
              </div>

              <div style={{ marginTop: "auto", paddingTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "0 4px" }}>
                  <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
                    <Users size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
                    Attendees Selected
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: selectedStaff.length > 0 ? "var(--accent)" : "var(--text-muted)" }}>
                    {selectedStaff.length} / {staffList.length}
                  </span>
                </div>
                <button className="btn btn-primary" type="submit" disabled={saving || selectedStaff.length === 0} style={{ width: "100%", justifyContent: "center", background: "var(--success)", color: "var(--text-primary)", padding: "12px 16px", fontSize: 15 }}>
                  <CalendarPlus size={18} /> {saving ? "Scheduling..." : "Create Calendar Invites"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
