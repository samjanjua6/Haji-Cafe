"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, LogIn, UserPlus, Mail, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import toast from "react-hot-toast";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}

export default function AuthModal({ isOpen, onClose, defaultTab = "login" }: AuthModalProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab, isOpen]);

  useEffect(() => {
    if (isOpen) {
      router.prefetch("/dashboard");
      router.prefetch("/cafes");
    }
  }, [isOpen, router]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = tab === "login" ? "/auth/login" : "/auth/register";
      const data: any = await api.post(endpoint, { email, password });
      auth.setTokens(data.access_token, data.refresh_token);
      toast.success(tab === "login" ? "Welcome back to Haji Cafe!" : "Account created successfully!");
      onClose();

      // If user is kitchen@gmail.com, route directly to Kitchen Display System (KDS)
      if (email.trim().toLowerCase() === "kitchen@gmail.com") {
        try {
          const profile: any = await api.get("/auth/me");
          const branchId = profile.scopes?.[0]?.branchId || 1;
          router.push(`/branches/${branchId}/kitchen`);
          return;
        } catch {
          router.push("/branches/1/kitchen");
          return;
        }
      }

      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Authentication failed. Please check your credentials.");
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/google`;
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          padding: "32px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
          position: "relative",
          animation: "scaleIn 0.2s ease-out",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          type="button"
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "50%",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-primary)";
            e.currentTarget.style.borderColor = "var(--accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-muted)";
            e.currentTarget.style.borderColor = "var(--border)";
          }}
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "16px",
              background: "linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(234,88,12,0.1) 100%)",
              border: "1px solid var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px auto",
              boxShadow: "0 4px 20px var(--accent-glow)",
            }}
          >
            <img src="/logo.png" alt="Haji Cafe" style={{ width: 36, height: 36, objectFit: "contain" }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
            {tab === "login" ? "Welcome to Haji Cafe" : "Start Your Free Cafe Trial"}
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            {tab === "login"
              ? "Sign in to access POS, branches, and AI voice operations"
              : "Launch your modern cloud POS and AI assistant in minutes"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-surface)",
            borderRadius: 12,
            padding: 4,
            marginBottom: 20,
            gap: 4,
            border: "1px solid var(--border)",
          }}
        >
          {(["login", "register"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: "9px 0",
                border: "none",
                cursor: "pointer",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 13,
                background: tab === t ? "var(--accent)" : "transparent",
                color: tab === t ? "#0f172a" : "var(--text-muted)",
                boxShadow: tab === t ? "0 2px 8px var(--accent-glow)" : "none",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {t === "login" ? <LogIn size={15} /> : <UserPlus size={15} />}
              {t === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, marginBottom: 6 }}>
              <Mail size={12} color="var(--accent)" /> Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@hajicafe.com"
              required
              autoComplete="email"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                padding: "11px 14px",
                borderRadius: "10px",
                fontSize: "14px",
              }}
            />
          </div>

          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, marginBottom: 6 }}>
              <Lock size={12} color="var(--accent)" /> Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                padding: "11px 14px",
                borderRadius: "10px",
                fontSize: "14px",
              }}
            />
          </div>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: 14,
              fontWeight: 700,
              borderRadius: "10px",
              marginTop: 6,
            }}
          >
            {loading ? (
              <>
                <span className="spinner" />
                {tab === "login" ? "Verifying Credentials..." : "Setting Up Cafe Account..."}
              </>
            ) : tab === "login" ? (
              <>
                <LogIn size={16} /> Enter POS & Dashboard
              </>
            ) : (
              <>
                <Sparkles size={16} /> Create Free Account
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em" }}>
            OR CONTINUE WITH
          </span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        {/* Google OAuth Button */}
        <button
          onClick={handleGoogle}
          type="button"
          className="btn btn-ghost"
          style={{
            width: "100%",
            justifyContent: "center",
            padding: "11px",
            borderRadius: "10px",
            fontWeight: 600,
            fontSize: 13,
            gap: 10,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
              fill="#34A853"
            />
            <path
              d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        {/* Security badge footer */}
        <div
          style={{
            marginTop: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            color: "var(--text-faint)",
            fontSize: 11,
          }}
        >
          <ShieldCheck size={14} color="var(--success)" />
          <span>256-bit Encrypted SSL • Fast Tokenized Auth</span>
        </div>
      </div>
    </div>
  );
}
