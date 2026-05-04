"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { GoogleSheetsService } from "@/services/googleSheetsService";
import { AuthChangeEvent } from "@supabase/supabase-js";
import { verifyAndResetPassword } from "./actions";

type Mode = "login" | "signup" | "onboarding" | "forgot" | "updatePassword";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  // Verification fields for Zero-Email reset
  const [resetRestaurantName, setResetRestaurantName] = useState("");
  const [resetPhone, setResetPhone] = useState("");

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
      forgotTitle: "정보 인증 및 비밀번호 재설정",
      updateTitle: "새 비밀번호 설정",
      onboardingSubtitle: "Vanguard 빅딜이 레스토랑 이름으로 등록됩니다",
      email: "업무 이메일",
      password: "비밀번호",
      newPassword: "새 비밀번호",
      restaurantName: "매장명 (Business Name)",
      restaurantAddress: "매장 주소 (Business Address)",
      phone: "전화번호 (Contact Number)",
      signIn: "로그인",
      signUp: "회원가입",
      sendReset: "정보 확인 및 즉시 재설정",
      completeSetup: "시작하기 →",
      toSignup: "계정이 없으신가요? 회원가입",
      toLogin: "이미 계정이 있으신가요? 로그인",
      processing: "처리 중...",
      backToFeed: "← 돌아가기",
      skipForNow: "나중에 입력하기 →",
      forgotPassword: "이메일/비밀번호를 잊으셨나요?",
      updatePassword: "비밀번호 변경하기",
      updateSuccess: "비밀번호가 성공적으로 변경되었습니다. 이제 로그인하세요.",
      verifyPrompt: "가입 시 입력했던 매장명과 전화번호를 입력해주세요.",
    },
    en: {
      loginTitle: "Welcome back to the collective.",
      signupTitle: "Join the Alliance.",
      onboardingTitle: "Set up your restaurant profile",
      forgotTitle: "Verify & Reset Password",
      updateTitle: "Set New Password",
      onboardingSubtitle: "Your restaurant name will appear on group deals",
      email: "Work Email",
      password: "Password",
      newPassword: "New Password",
      restaurantName: "Business Name",
      restaurantAddress: "Business Address",
      phone: "Contact Number",
      signIn: "Sign In",
      signUp: "Sign Up",
      sendReset: "Verify & Reset Now",
      completeSetup: "Get Started →",
      toSignup: "Need an account? Sign up",
      toLogin: "Already have an account? Sign in",
      processing: "Processing...",
      backToFeed: "← Back",
      skipForNow: "Skip for now →",
      forgotPassword: "Forgot email or password?",
      updatePassword: "Update Password",
      updateSuccess: "Password updated successfully. Please login.",
      verifyPrompt: "Please enter your business name and phone number used during signup.",
    }
  }[lang];

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("updatePassword");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

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
          await supabase.from("profiles").upsert({
            id: data.user.id,
            email: data.user.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          setUserId(data.user.id);
          setUserEmail(data.user.email ?? null);
          setMode("onboarding");
        }
      }
    } catch (err: any) {
      setMessage(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleZeroEmailReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (!newPassword) {
        setMessage(lang === "ko" ? "새 비밀번호를 입력해주세요." : "Please enter a new password.");
        setLoading(false);
        return;
      }

      const result = await verifyAndResetPassword({
        email: email.trim(),
        restaurantName: resetRestaurantName.trim(),
        phoneNumber: resetPhone.trim(),
        newPassword: newPassword,
      });

      if (result.success) {
        setMessage(t.updateSuccess);
        setTimeout(() => setMode("login"), 2000);
      } else {
        setMessage(result.message);
      }
    } catch (err: any) {
      setMessage(lang === "ko" ? "시스템 오류가 발생했습니다." : "System error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setMessage(t.updateSuccess);
      setTimeout(() => setMode("login"), 2000);
    } catch (err: any) {
      setMessage(err.message || "Error updating password.");
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

      // 1. [Integration] Log to Google Sheets
      await GoogleSheetsService.logUser({
        userId: userId,
        email: userEmail || "",
        storeName: restaurantName,
        phone: phoneNumber,
        address: restaurantAddress,
      });

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
    background: "var(--surface-pure)",
    color: "var(--brand-on-surface)",
    width: "100%",
  };

  return (
    <div className="container" style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100vh", padding: "0 1.5rem" }}>

      <div style={{ textAlign: "right", marginBottom: "1rem" }}>
        <button onClick={() => setLang(lang === "ko" ? "en" : "ko")} style={{
          background: "var(--surface-high)", border: "1px solid var(--outline-variant)",
          borderRadius: "var(--radius-md)", padding: "4px 10px",
          cursor: "pointer", fontWeight: "700", fontSize: "0.8rem",
          color: "var(--brand-on-surface)"
        }}>
          {lang === "ko" ? "EN" : "KR"}
        </button>
      </div>

      <div style={{ background: "var(--surface-pure)", padding: "2rem", borderRadius: "var(--radius-lg)", boxShadow: "var(--ambient-shadow)" }}>

        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h1 className="display-txt" style={{ color: "var(--brand-primary)", fontSize: "2rem", marginBottom: "0.25rem" }}>VANGUARD</h1>
          <p className="body-md" style={{ color: "var(--brand-on-surface-variant)" }}>
            {mode === "login" ? t.loginTitle : mode === "signup" ? t.signupTitle : mode === "forgot" ? t.forgotTitle : mode === "updatePassword" ? t.updateTitle : t.onboardingSubtitle}
          </p>
        </div>

        {(mode === "login" || mode === "signup") && (
          <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <input type="email" placeholder={t.email} value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
            <input type="password" placeholder={t.password} value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
            
            {mode === "login" && (
              <div style={{ textAlign: "right" }}>
                <button type="button" onClick={() => { setMode("forgot"); setMessage(""); }} style={{
                  background: "transparent", border: "none", color: "var(--brand-on-surface-variant)",
                  fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline"
                }}>
                  {t.forgotPassword}
                </button>
              </div>
            )}

            {message && <p className="label-md" style={{ color: "#d32f2f", padding: "4px 0" }}>{message}</p>}

            <button className="btn-primary mt-2" type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? t.processing : (mode === "login" ? t.signIn : t.signUp)}
            </button>
          </form>
        )}

        {mode === "updatePassword" && (
          <form onSubmit={handleUpdatePassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p className="body-md" style={{ textAlign: "center", marginBottom: "0.5rem" }}>{t.updateTitle}</p>
            <input type="password" placeholder={t.newPassword} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required style={inputStyle} />
            {message && <p className="label-md" style={{ color: message === t.updateSuccess ? "var(--brand-secondary)" : "#d32f2f", padding: "4px 0" }}>{message}</p>}
            <button className="btn-primary mt-2" type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? t.processing : t.updatePassword}
            </button>
          </form>
        )}

        {mode === "onboarding" && (
          <form onSubmit={handleOnboarding} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label className="label-md" style={{ display: "block", marginBottom: "4px", color: "var(--brand-on-surface-variant)" }}>{t.restaurantName} *</label>
              <input type="text" value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} required placeholder="e.g. The Golden Fork" style={inputStyle} />
            </div>
            <div>
              <label className="label-md" style={{ display: "block", marginBottom: "4px", color: "var(--brand-on-surface-variant)" }}>{t.restaurantAddress}</label>
              <input type="text" value={restaurantAddress} onChange={(e) => setRestaurantAddress(e.target.value)} placeholder="123 Culinary Ave, New York" style={inputStyle} />
            </div>
            <div>
              <label className="label-md" style={{ display: "block", marginBottom: "4px", color: "var(--brand-on-surface-variant)" }}>{t.phone}</label>
              <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="02-123-4567" style={inputStyle} />
            </div>
            {message && <p className="label-md" style={{ color: "#d32f2f" }}>{message}</p>}
            <button className="btn-primary mt-2" type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? t.processing : t.completeSetup}
            </button>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={handleZeroEmailReset} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p className="label-md" style={{ color: "var(--brand-on-surface-variant)", marginBottom: "0.5rem", textAlign: "center" }}>
              {t.verifyPrompt}
            </p>
            <input type="email" placeholder={t.email} value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
            <input type="text" placeholder={t.restaurantName} value={resetRestaurantName} onChange={(e) => setResetRestaurantName(e.target.value)} required style={inputStyle} />
            <input type="tel" placeholder={t.phone} value={resetPhone} onChange={(e) => setResetPhone(e.target.value)} required style={inputStyle} />
            
            <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid var(--outline-variant)" }}>
              <input type="password" placeholder={t.newPassword} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required style={inputStyle} />
            </div>

            {message && (
              <div style={{ 
                padding: "16px", borderRadius: "12px", 
                background: message === t.updateSuccess ? "#e8f5e9" : "#fff5f5",
                color: message === t.updateSuccess ? "#2e7d32" : "#c62828",
                border: `1px solid ${message === t.updateSuccess ? "#c8e6c9" : "#ffcdd2"}`
              }}>
                <p className="label-md" style={{ fontWeight: "700", lineHeight: "1.5" }}>{message}</p>
              </div>
            )}

            <button className="btn-primary mt-2" type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? t.processing : t.sendReset}
            </button>
          </form>
        )}

        {(mode === "login" || mode === "signup") && (
          <div className="mt-4" style={{ textAlign: "center" }}>
            <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}
              style={{ background: "transparent", border: "none", color: "var(--brand-on-surface-variant)", textDecoration: "underline", cursor: "pointer" }}>
              {mode === "login" ? t.toSignup : t.toLogin}
            </button>
          </div>
        )}

        {(mode === "forgot" || mode === "updatePassword") && (
          <div className="mt-4" style={{ textAlign: "center" }}>
            <button type="button" onClick={() => { setMode("login"); setMessage(""); }}
              style={{ background: "transparent", border: "none", color: "var(--brand-on-surface-variant)", textDecoration: "underline", cursor: "pointer" }}>
              {t.toLogin}
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: "2rem", textAlign: "center" }}>
        <a href="/" style={{ color: "var(--brand-on-surface-variant)", textDecoration: "none" }}>{t.backToFeed}</a>
      </div>
    </div>
  );
}
