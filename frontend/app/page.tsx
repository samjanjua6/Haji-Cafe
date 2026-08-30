"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/auth";
import toast from "react-hot-toast";

import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingHero from "@/components/landing/LandingHero";
import LandingStats from "@/components/landing/LandingStats";
import LandingAiPlayground from "@/components/landing/LandingAiPlayground";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingCalculator from "@/components/landing/LandingCalculator";
import LandingHowItWorks from "@/components/landing/LandingHowItWorks";
import LandingPricing from "@/components/landing/LandingPricing";
import LandingTestimonials from "@/components/landing/LandingTestimonials";
import LandingFaq from "@/components/landing/LandingFaq";
import LandingContact from "@/components/landing/LandingContact";
import LandingFooter from "@/components/landing/LandingFooter";
import AuthModal from "@/components/landing/AuthModal";

function LandingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<"login" | "register">("login");

  // Handle Google OAuth callback parameters
  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");
    if (accessToken && refreshToken) {
      auth.setTokens(accessToken, refreshToken);
      toast.success("Successfully authenticated with Google!");
      router.push("/dashboard");
    }

    const authAction = searchParams.get("auth");
    if (authAction === "login" || authAction === "register") {
      setAuthDefaultTab(authAction);
      setAuthModalOpen(true);
    }
  }, [searchParams, router]);

  const handleOpenAuth = (tab: "login" | "register") => {
    setAuthDefaultTab(tab);
    setAuthModalOpen(true);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--bg-base)",
        color: "var(--text-primary)",
      }}
    >
      {/* Sticky Header */}
      <LandingNavbar onOpenAuth={handleOpenAuth} />

      {/* Main Content Sections */}
      <main style={{ flex: 1 }}>
        <LandingHero onOpenAuth={handleOpenAuth} />
        <LandingStats />
        <LandingAiPlayground />
        <LandingFeatures />
        <LandingCalculator onOpenAuth={handleOpenAuth} />
        <LandingHowItWorks onOpenAuth={handleOpenAuth} />
        <LandingPricing onOpenAuth={handleOpenAuth} />
        <LandingTestimonials />
        <LandingFaq />
        <LandingContact />
      </main>

      {/* Comprehensive Footer */}
      <LandingFooter />

      {/* Popup Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authDefaultTab}
      />
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "var(--bg-base)",
          }}
        >
          <span className="spinner spinner-light" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
      }
    >
      <LandingPageContent />
    </Suspense>
  );
}
