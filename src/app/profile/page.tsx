"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [lang, setLang] = useState<"ko" | "en">("ko");

  const t = {
    ko: {
      back: "← 뒤로",
      title: "점주 프로필",
      trustProfile: "VANGUARD 신뢰 프로필",
      trustSub: "귀하의 네트워크 평판과 주문량 보상입니다.",
      trustScore: "신뢰 점수",
      eliteLock: "7.0점에 도달하여 엘리트 전용 딜을 해제하세요.",
      eliteUnlocked: "🔥 엘리트 전용 딜이 해제되었습니다.",
      bizName: "매장명",
      bizAddr: "매장 주소",
      contact: "전화번호",
      prologue: "매장 프롤로그 / 소개",
      save: "프로필 저장",
      saving: "저장 중...",
      signOut: "로그아웃",
      success: "프로필이 성공적으로 업데이트되었습니다.",
      loading: "프로필 불러오는 중..."
    },
    en: {
      back: "← Back",
      title: "Owner Profile",
      trustProfile: "VANGUARD Trust Profile",
      trustSub: "Your network reputation and order volume rewards.",
      trustScore: "Trust Score",
      eliteLock: "Reach 7.0 to unlock Elite private deals.",
      eliteUnlocked: "🔥 Elite Deals unlocked.",
      bizName: "Business Name",
      bizAddr: "Business Address",
      contact: "Contact Number",
      prologue: "Store Prologue / Intro",
      save: "Save Profile",
      saving: "Saving...",
      signOut: "Sign Out",
      success: "Profile successfully updated.",
      loading: "Loading Profile..."
    }
  }[lang];

  const [profile, setProfile] = useState({
    restaurant_name: "",
    restaurant_address: "",
    phone_number: "",
    prologue: "",
    points: 0,
    trust_score: 0,
    level: 1
  });

  useEffect(() => {
    // Sync language
    const savedLang = localStorage.getItem("vanguard-lang") as "ko" | "en";
    if (savedLang) setLang(savedLang);

    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      setUser(user);

      // Fetch existing profile data
      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('restaurant_name, restaurant_address, phone_number, prologue, points, trust_score, level')
          .eq('id', user.id)
          .maybeSingle();

        if (fetchError) {
           console.error("VANGUARD: DB Retrieval Error", fetchError);
           setMessage(`DB 연동 오류: ${fetchError.message}`);
        }

        const metadata = user.user_metadata || {};
        
        if (!data) {
          // Profile doesn't exist in DB yet! Initialize using Auth Metadata
          const initialProfile = {
            restaurant_name: metadata.restaurant_name || metadata.business_name || "",
            restaurant_address: metadata.restaurant_address || metadata.business_address || "",
            phone_number: metadata.phone_number || "",
            prologue: metadata.prologue || "",
            points: 0,
            trust_score: 2.75,
            level: 1
          };

          setProfile(initialProfile);

          // Silent attempt to provision profile row
          await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
            ...initialProfile,
            updated_at: new Date().toISOString()
          });
        } else {
          // Sync DB data with UI, prioritizing DB values but falling back to metadata if DB values are missing
          setProfile({
            restaurant_name: data.restaurant_name || metadata.restaurant_name || "",
            restaurant_address: data.restaurant_address || metadata.restaurant_address || "",
            phone_number: data.phone_number || metadata.phone_number || "",
            prologue: data.prologue || metadata.prologue || "",
            points: data.points || 0,
            trust_score: data.trust_score || 2.75,
            level: data.level || 1
          });
        }
      } catch (e: any) {
        console.warn("VANGUARD: Profile load exception", e);
        setMessage("통신 장애가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }

      setLoading(false);
    }
    loadProfile();
  }, []);



  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          ...profile,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      setMessage("Profile successfully updated.");
    } catch (err: any) {
      console.warn(err);
      setMessage("Saved locally! (DB Note: Make sure columns are added to Supabase 'profiles' table!)");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading) return <div className="container" style={{ padding: "2rem", textAlign: "center" }}>{t.loading}</div>;

  return (
    <div className="container" style={{ padding: "0 1.5rem", paddingBottom: "100px" }}>
      
      <nav className="top-nav" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <a href="/" style={{ color: "var(--on-surface)", textDecoration: "none" }}>{t.back}</a>
          <h1 className="top-nav-title display-txt">{t.title}</h1>
        </div>
        <button 
          onClick={() => {
            const next = lang === "ko" ? "en" : "ko";
            setLang(next);
            localStorage.setItem("vanguard-lang", next);
          }}
          style={{ background: "var(--surface-variant)", border: "1px solid var(--outline-variant)", borderRadius: "var(--radius-md)", padding: "4px 10px", cursor: "pointer", fontWeight: "bold" }}
        >
          {lang === "ko" ? "EN" : "KR"}
        </button>
      </nav>

      <div className="section mt-4" style={{ background: "var(--surface-container-lowest)", padding: "1.5rem", borderRadius: "1rem", boxShadow: "var(--ambient-shadow)", display: "flex", gap: "1rem", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 className="title-lg" style={{ color: "var(--on-surface)" }}>{t.trustProfile}</h2>
          <p className="label-md mt-1" style={{ color: "var(--on-surface-variant)" }}>{t.trustSub}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--primary)" }}>Lv.{profile.level}</div>
          <div className="label-sm" style={{ fontWeight: 700, color: "var(--on-surface)" }}>{profile.points.toLocaleString()} PTS</div>
        </div>
      </div>
      
      <div className="section mt-4" style={{ background: "linear-gradient(135deg, rgba(230,190,138,0.1) 0%, rgba(200,150,100,0.05) 100%)", padding: "1.5rem", borderRadius: "1rem", boxShadow: "var(--ambient-shadow)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <span className="title-md" style={{ color: "var(--on-surface)" }}>{t.trustScore}</span>
          <span className="title-md" style={{ color: "var(--primary)", fontWeight: 800 }}>{Number(profile.trust_score).toFixed(2)} / 10.0</span>
        </div>
        <div style={{ height: "8px", background: "rgba(0,0,0,0.1)", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(profile.trust_score / 10) * 100}%`, background: "var(--primary)", transition: "width 1s ease" }}></div>
        </div>
        <p className="label-sm mt-3" style={{ color: "var(--on-surface-variant)" }}>
          {profile.trust_score >= 7.0 ? t.eliteUnlocked : t.eliteLock}
        </p>
      </div>

      <div className="section mt-4" style={{ background: "var(--surface-container-lowest)", padding: "1.5rem", borderRadius: "1rem", boxShadow: "var(--ambient-shadow)" }}>
        <form onSubmit={handleSave} className="flex-col gap-4">
          
          <div>
            <label className="label-md" style={{ color: "var(--on-surface-variant)", marginBottom: "4px", display: "block" }}>{t.bizName}</label>
            <input 
              type="text" 
              name="restaurant_name"
              value={profile.restaurant_name}
              onChange={handleChange}
              placeholder={lang === "ko" ? "예: 뱅가드 스테이크하우스" : "e.g. Vanguard Steakhouse"}
              style={{ width: "100%", padding: "12px", borderRadius: "0.5rem", border: "1px solid var(--outline-variant)" }}
            />
          </div>

          <div>
            <label className="label-md" style={{ color: "var(--on-surface-variant)", marginBottom: "4px", display: "block" }}>{t.bizAddr}</label>
            <input 
              type="text" 
              name="restaurant_address"
              value={profile.restaurant_address}
              onChange={handleChange}
              placeholder={lang === "ko" ? "예: 서울시 강남구..." : "123 Culinary Ave"}
              style={{ width: "100%", padding: "12px", borderRadius: "0.5rem", border: "1px solid var(--outline-variant)" }}
            />
          </div>

          <div>
            <label className="label-md" style={{ color: "var(--on-surface-variant)", marginBottom: "4px", display: "block" }}>{t.contact}</label>
            <input 
              type="tel" 
              name="phone_number"
              value={profile.phone_number}
              onChange={handleChange}
              placeholder="02-123-4567"
              style={{ width: "100%", padding: "12px", borderRadius: "0.5rem", border: "1px solid var(--outline-variant)" }}
            />
          </div>

          <div>
            <label className="label-md" style={{ color: "var(--on-surface-variant)", marginBottom: "4px", display: "block" }}>{t.prologue}</label>
            <textarea 
              name="prologue"
              value={profile.prologue}
              onChange={handleChange}
              placeholder={lang === "ko" ? "귀하의 매장 철학을 간단히 소개해 주세요..." : "Brief introduction of your culinary philosophy..."}
              rows={4}
              style={{ width: "100%", padding: "12px", borderRadius: "0.5rem", border: "1px solid var(--outline-variant)", resize: "vertical" }}
            />
          </div>

          {message && <p style={{ color: "var(--primary)", fontSize: "0.875rem", fontWeight: 600 }}>{t.success}</p>}

          <button className="btn-primary mt-2" type="submit" disabled={saving}>
            {saving ? t.saving : t.save}
          </button>
        </form>
      </div>

      <div className="mt-8" style={{ textAlign: "center" }}>
        <button 
          onClick={handleSignOut}
          style={{ background: "transparent", border: "none", color: "#d32f2f", fontWeight: 700, cursor: "pointer", padding: "1rem" }}
        >
          {t.signOut}
        </button>
      </div>

    </div>
  );
}
