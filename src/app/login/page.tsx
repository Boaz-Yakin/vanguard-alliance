"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Mode = "login" | "signup" | "onboarding";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<Mode>("login");
  const [lang, setLang] = useState<"ko" | "en">("ko");

  // Onboarding fields
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantAddress, setRestaurantAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const t = {
    ko: {
      loginTitle: "다시 오신 것을 환영합니다",
      signupTitle: "얼라이언스에 합류하세요",
      onboardingTitle: "매장 정보를 입력해주세요",
      onboardingSubtitle: "ufgo공동구매 딜이 레스토랑 이름으로 등록됩니다",
      email: "업무 이메일",
      password: "비밀번호",
      restaurantName: "매장명 (Business Name)",
      restaurantAddress: "매장 주소 (Business Address)",
      phone: "전화번호 (Contact Number)",
      signIn: "로그인",
      signUp: "회원가입",
      completeSetup: "시작하기 →",
      toSignup: "계정이 없으신가요? 회원가입",
      toLogin: "이미 계정이 있으신가요? 로그인",
      processing: "처리 중...",
      backToFeed: "← 피드로 돌아가기",
      skipForNow: "나중에 입력하기 →",
    },
    en: {
      loginTitle: "Welcome back to the collective.",
      signupTitle: "Join the Alliance.",
      onboardingTitle: "Set up your restaurant profile",
      onboardingSubtitle: "Your restaurant name will appear on group deals",
      email: "Work Email",
      password: "Password",
      restaurantName: "Business Name",
      restaurantAddress: "Business Address",
      phone: "Contact Number",
      signIn: "Sign In",
      signUp: "Sign Up",
      completeSetup: "Get Started →",
      toSignup: "Need an account? Sign up",
      toLogin: "Already have an account? Sign in",
      processing: "Processing...",
      backToFeed: "← Back to feed",
      skipForNow: "Skip for now →",
    }
  }[lang];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/";
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        if (data.user) {
          // Auto-create minimal profile immediately
          await supabase.from("profiles").upsert({
            id: data.user.id,
            email: data.user.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          setUserId(data.user.id);
          setUserEmail(data.user.email ?? null);
          setMode("onboarding"); // Move to onboarding step
        }
      }
    } catch (err: any) {
      setMessage(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  const handleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setLoading(true);

    try {
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        email: userEmail,
        restaurant_name: restaurantName,
        restaurant_address: restaurantAddress,
        phone_number: phoneNumber,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      window.location.href = "/";
    } catch (err: any) {
      setMessage(err.message || "Error saving profile.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: "12px 16px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--outline-variant)",
    fontSize: "1rem",
    background: "var(--surface)",
    color: "var(--on-surface)",
    width: "100%",
  };

  return (
    <div className="container" style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100vh", padding: "0 1.5rem" }}>

      {/* Lang toggle */}
      <div style={{ textAlign: "right", marginBottom: "1rem" }}>
        <button onClick={() => setLang(lang === "ko" ? "en" : "ko")} style={{
          background: "var(--surface-variant)", border: "1px solid var(--outline-variant)",
          borderRadius: "var(--radius-md)", padding: "4px 10px",
          cursor: "pointer", fontWeight: "700", fontSize: "0.8rem",
          color: "var(--on-surface-variant)"
        }}>
          {lang === "ko" ? "EN" : "KR"}
        </button>
      </div>

      <div style={{ background: "var(--surface-container-lowest)", padding: "2rem", borderRadius: "var(--radius-lg)", boxShadow: "var(--ambient-shadow)" }}>

        {/* LOGO */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h1 className="display-txt" style={{ color: "var(--primary)", fontSize: "2rem", marginBottom: "0.25rem" }}>VANGUARD</h1>
          <p className="body-md" style={{ color: "var(--on-surface-variant)" }}>
            {mode === "login" ? t.loginTitle : mode === "signup" ? t.signupTitle : t.onboardingSubtitle}
          </p>
        </div>

        {/* Onboarding progress indicator */}
        {mode === "onboarding" && (
          <div style={{ display: "flex", gap: "4px", marginBottom: "1.5rem" }}>
            <div style={{ flex: 1, height: "4px", borderRadius: "100px", background: "var(--primary)" }} />
            <div style={{ flex: 1, height: "4px", borderRadius: "100px", background: "var(--primary)" }} />
            <div style={{ flex: 1, height: "4px", borderRadius: "100px", background: "var(--outline-variant)" }} />
          </div>
        )}

        {/* Login / Signup Form */}
        {(mode === "login" || mode === "signup") && (
          <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <input type="email" placeholder={t.email} value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
            <input type="password" placeholder={t.password} value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />

            {message && <p className="label-md" style={{ color: "#d32f2f" }}>{message}</p>}

            <button className="btn-primary mt-2" type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? t.processing : (mode === "login" ? t.signIn : t.signUp)}
            </button>
          </form>
        )}

        {/* Onboarding Form */}
        {mode === "onboarding" && (
          <form onSubmit={handleOnboarding} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label className="label-md" style={{ display: "block", marginBottom: "4px", color: "var(--on-surface-variant)" }}>{t.restaurantName} *</label>
              <input type="text" value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} required placeholder="e.g. The Golden Fork" style={inputStyle} />
            </div>
            <div>
              <label className="label-md" style={{ display: "block", marginBottom: "4px", color: "var(--on-surface-variant)" }}>{t.restaurantAddress}</label>
              <input type="text" value={restaurantAddress} onChange={(e) => setRestaurantAddress(e.target.value)} placeholder="123 Culinary Ave, New York" style={inputStyle} />
            </div>
            <div>
              <label className="label-md" style={{ display: "block", marginBottom: "4px", color: "var(--on-surface-variant)" }}>{t.phone}</label>
              <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="02-123-4567" style={inputStyle} />
            </div>

            {message && <p className="label-md" style={{ color: "#d32f2f" }}>{message}</p>}

            <button className="btn-primary mt-2" type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? t.processing : t.completeSetup}
            </button>
            <button type="button" onClick={() => { window.location.href = "/"; }} style={{
              background: "transparent", border: "none", color: "var(--on-surface-variant)",
              textDecoration: "underline", cursor: "pointer", fontSize: "0.875rem"
            }}>
              {t.skipForNow}
            </button>
          </form>
        )}

        {/* Mode toggle */}
        {mode !== "onboarding" && (
          <div className="mt-4" style={{ textAlign: "center" }}>
            <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}
              style={{ background: "transparent", border: "none", color: "var(--on-surface-variant)", textDecoration: "underline", cursor: "pointer" }}>
              {mode === "login" ? t.toSignup : t.toLogin}
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: "2rem", textAlign: "center" }}>
        <a href="/" style={{ color: "var(--on-surface-variant)", textDecoration: "none" }}>{t.backToFeed}</a>
      </div>
    </div>
  );
}
