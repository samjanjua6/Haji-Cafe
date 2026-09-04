"use client";

import React, { useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";

export default function LandingContact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cafeName, setCafeName] = useState("");
  const [branchCount, setBranchCount] = useState("1");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const contactEmail = "support@mychatbot.codes";
  const contactPhone = "+92 340 6001884";

  const handleCopy = (text: string, type: "email" | "phone") => {
    navigator.clipboard.writeText(text);
    if (type === "email") {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
      toast.success("Email copied to clipboard!");
    } else {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
      toast.success("Phone number copied to clipboard!");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success(
        `Thank you ${name || "there"}! Our support team at support@mychatbot.codes has received your message.`
      );
      setName("");
      setEmail("");
      setCafeName("");
      setMessage("");
    }, 1200);
  };

  return (
    <section
      id="contact"
      style={{
        padding: "60px 20px 80px 20px",
        position: "relative",
      }}
    >
      <div
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", maxWidth: "800px", margin: "0 auto 56px auto" }}>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 800,
              color: "var(--text-primary)",
              lineHeight: 1.2,
              marginBottom: "16px",
            }}
          >
            Get in Touch with Our <span className="landing-gradient-text">Cafe Support Specialists</span>
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            Have questions about onboarding, custom hardware integration, multi-branch franchises, or voice AI setup?
            We are available 24/7 to assist you.
          </p>
        </div>

        {/* Contact Grid: Contact Info Cards on Left, Interactive Form on Right */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: "32px",
            alignItems: "start",
          }}
        >
          {/* Left Column: Direct Info Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Email Card */}
            <div
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "20px",
                padding: "24px",
                display: "flex",
                alignItems: "flex-start",
                gap: "18px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "14px",
                  backgroundColor: "var(--accent-muted)",
                  color: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Mail size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Official Support Email
                </div>
                <a
                  href={`mailto:${contactEmail}`}
                  style={{
                    fontSize: "18px",
                    fontWeight: 800,
                    color: "var(--accent)",
                    textDecoration: "none",
                    display: "inline-block",
                    margin: "4px 0 6px 0",
                    wordBreak: "break-all",
                  }}
                >
                  {contactEmail}
                </a>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                  <button
                    onClick={() => handleCopy(contactEmail, "email")}
                    type="button"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      color: "var(--text-muted)",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {copiedEmail ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                    {copiedEmail ? "Copied!" : "Copy Email"}
                  </button>
                  <span style={{ fontSize: "12px", color: "var(--text-faint)" }}>
                    Response within 2 hours
                  </span>
                </div>
              </div>
            </div>

            {/* Phone Card */}
            <div
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "20px",
                padding: "24px",
                display: "flex",
                alignItems: "flex-start",
                gap: "18px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "14px",
                  backgroundColor: "var(--success-glow)",
                  color: "var(--success)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Phone size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Direct Phone &amp; WhatsApp Helpline
                </div>
                <div style={{ margin: "6px 0" }}>
                  <a
                    href={`tel:${contactPhone.replace(/[^0-9+]/g, "")}`}
                    style={{
                      fontSize: "18px",
                      fontWeight: 800,
                      color: "var(--text-primary)",
                      textDecoration: "none",
                    }}
                  >
                    {contactPhone}
                  </a>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
                  <button
                    onClick={() => handleCopy(contactPhone, "phone")}
                    type="button"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      color: "var(--text-muted)",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {copiedPhone ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                    {copiedPhone ? "Copied!" : "Copy Phone"}
                  </button>
                  <span style={{ fontSize: "12px", color: "var(--success)", fontWeight: 600 }}>
                    Available on WhatsApp &amp; Call
                  </span>
                </div>
              </div>
            </div>

            {/* Operating Hours & Location Card */}
            <div
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "20px",
                padding: "24px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <Clock size={20} color="var(--accent)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>Support Hours</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: 2 }}>24/7 AI Assistant</div>
                  <div style={{ fontSize: "11px", color: "var(--text-faint)" }}>Mon–Sat Human Desk</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <MapPin size={20} color="var(--accent)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>Global Hub</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: 2 }}>Haji Cafe Enterprise</div>
                  <div style={{ fontSize: "11px", color: "var(--text-faint)" }}>Worldwide Cloud Sync</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Inquiry Form */}
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "24px",
              padding: "36px",
              boxShadow: "0 15px 40px rgba(0,0,0,0.3)",
            }}
          >
            <h3 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "6px" }}>
              Send Us a Direct Inquiry
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px" }}>
              Fill out the details below and our team will prepare a custom cafe demo for your team.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, marginBottom: "6px" }}>Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Sarah Miller"
                    required
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      padding: "11px 14px",
                      fontSize: "14px",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, marginBottom: "6px" }}>Work Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah@roastery.com"
                    required
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      padding: "11px 14px",
                      fontSize: "14px",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, marginBottom: "6px" }}>Cafe / Brand Name</label>
                  <input
                    type="text"
                    value={cafeName}
                    onChange={(e) => setCafeName(e.target.value)}
                    placeholder="Artisan Coffee Roasters"
                    required
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      padding: "11px 14px",
                      fontSize: "14px",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, marginBottom: "6px" }}>Branches</label>
                  <select
                    value={branchCount}
                    onChange={(e) => setBranchCount(e.target.value)}
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      padding: "11px 14px",
                      fontSize: "14px",
                      color: "var(--text-primary)",
                    }}
                  >
                    <option value="1">1 Branch</option>
                    <option value="2-3">2 - 3 Outlets</option>
                    <option value="4-10">4 - 10 Locations</option>
                    <option value="10+">10+ Franchise</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, marginBottom: "6px" }}>Message / Requirements</label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about your current POS setup, number of daily orders, or voice AI questions..."
                  required
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "11px 14px",
                    fontSize: "14px",
                    resize: "vertical",
                  }}
                />
              </div>

              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "13px",
                  borderRadius: "10px",
                  fontWeight: 700,
                  fontSize: "14px",
                  boxShadow: "0 4px 16px var(--accent-glow)",
                  marginTop: "6px",
                }}
              >
                {loading ? (
                  <>
                    <span className="spinner" /> Transmitting Message to Support...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Send Inquiry to support@mychatbot.codes
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
