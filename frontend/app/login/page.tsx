"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogIn, UserPlus, ArrowLeft, Coffee, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import toast from "react-hot-toast";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    router.prefetch("/dashboard");
    router.prefetch("/cafes");

    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");
    if (accessToken && refreshToken) {
      auth.setTokens(accessToken, refreshToken);
      toast.success("Successfully logged in with Google!");
      router.push("/dashboard");
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (auth.isLoggedIn()) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = tab === "login" ? "/auth/login" : "/auth/register";
      const data: any = await api.post(endpoint, { email, password });
      auth.setTokens(data.access_token, data.refresh_token);
      toast.success(tab === "login" ? "Welcome back!" : "Account created successfully!");

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
      toast.error(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/google`;
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg-base)", padding: 20,
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        {/* Back to Home Link */}
        <div style={{ marginBottom: 20 }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-muted)",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <ArrowLeft size={16} /> Back to Haji Cafe Overview
          </Link>
        </div>

        {/* Logo & Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ marginBottom: 14, display: "flex", justifyContent: "center" }}>
            <img src="/logo.png" alt="Haji Cafe Logo" style={{ width: 72, height: 72, objectFit: "contain" }} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>Haji Cafe</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 14 }}>Cloud POS & AI Cafe Operations</p>
        </div>

        <div className="card" style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
          {/* Tabs */}
          <div style={{
            display: "flex", background: "var(--bg-surface)",
            borderRadius: 10, padding: 4, marginBottom: 24, gap: 4,
          }}>
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: "8px 0", border: "none", cursor: "pointer",
                  borderRadius: 8, fontWeight: 600, fontSize: 14,
                  background: tab === t ? "var(--accent)" : "transparent",
                  color: tab === t ? "#0f172a" : "var(--text-muted)",
                  transition: "all 0.2s",
                }}
              >
                {t === "login" ? "Login" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
            </div>
            <div>
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
              {loading
                ? <><span className="spinner" /> {tab === "login" ? "Signing in..." : "Creating..."}</>
                : tab === "login" ? <><LogIn size={16} /> Sign In</> : <><UserPlus size={16} /> Create Account</>
              }
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          <button onClick={handleGoogle} className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 20, color: "var(--text-faint)", fontSize: 12 }}>
          <ShieldCheck size={14} color="var(--success)" />
          <span>Secure Enterprise Connection</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="spinner spinner-light" style={{ width: 28, height: 28, borderWidth: 3 }} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
