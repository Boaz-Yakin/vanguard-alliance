"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DealService } from "@/services/dealService";
import { supabase } from "@/lib/supabaseClient";
import { LoyaltyService } from "@/services/loyaltyService";
import { DispatchService } from "@/services/dispatchService";

// Helper: format ms remaining into a human-readable countdown
function formatCountdown(expiresAt: string | undefined, lang: "ko" | "en"): { label: string; urgent: boolean } {
  if (!expiresAt) return { label: lang === "ko" ? "진행중" : "Active", urgent: false };
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { label: lang === "ko" ? "마감" : "Closed", urgent: true };

  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  if (hours < 1) return { label: `${mins}m ${secs}s`, urgent: true };
  if (hours < 24) return { label: lang === "ko" ? `${hours}시간 남음` : `${hours}h left`, urgent: hours < 6 };
  const days = Math.floor(hours / 24);
  return { label: lang === "ko" ? `${days}일 남음` : `${days}d left`, urgent: false };
}

// Helper: calculate current discount rate from deal tiers
function getCurrentDiscountRate(deal: { currentVolume: number; targetVolume: number; tiers?: { threshold: number; rate: number }[] }): number {
  if (!deal.tiers || !Array.isArray(deal.tiers)) return 0;
  const progress = deal.currentVolume / deal.targetVolume;
  let applicableRate = 0;
  const sortedTiers = [...deal.tiers].sort((a, b) => a.threshold - b.threshold);
  for (const tier of sortedTiers) {
    if (progress >= tier.threshold) applicableRate = tier.rate;
  }
  return applicableRate;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("All");
  const [lang, setLang] = useState<"ko" | "en">("ko");
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [trustScore, setTrustScore] = useState<number>(0);
  const [userLevel, setUserLevel] = useState<number>(1);
  
  // Modal States
  const [selectedDeal, setSelectedDeal] = useState<{id: string, unit: string, title: string} | null>(null);
  const [qty, setQty] = useState<number | "">(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Countdown tick (fires every second to re-render timers)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Stable deal loader
  const loadDeals = useCallback(async () => {
    const dbDeals = await DealService.getActiveDeals();
    setDeals(dbDeals);
    setLoading(false);
  }, []);

  // Load Deals on mount and on refreshKey change
  useEffect(() => {
    loadDeals();
  }, [refreshKey, loadDeals]);

  // Auth State (Run once) — also reload deals on auth change
  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      if (data.user) {
        // Admin override: always grant max privileges
        if (data.user.email === 'boaznyakin@gmail.com') {
          setTrustScore(9.99);
          setUserLevel(5);
        } else {
          const profile = await LoyaltyService.getProfile(data.user.id);
          if (profile) {
            setTrustScore(profile.trust_score || 0);
            setUserLevel(profile.level || 1);
          }
        }
      } else {
        setTrustScore(0);
        setUserLevel(1);
      }
    }
    checkUser();

    // Listen to Auth Changes — reload deals when user logs in/out
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event: string, session: any) => {
      setUser(session?.user || null);
      if (session?.user) {
        // Admin override: always grant max privileges
        if (session.user.email === 'boaznyakin@gmail.com') {
          setTrustScore(9.99);
          setUserLevel(5);
        } else {
          const profile = await LoyaltyService.getProfile(session.user.id);
          if (profile) {
            setTrustScore(profile.trust_score || 0);
            setUserLevel(profile.level || 1);
          } else {
            setTrustScore(0);
            setUserLevel(1);
          }
        }
      } else {
        setTrustScore(0);
        setUserLevel(1);
      }
      // Re-fetch deals after auth state change to prevent empty feed
      loadDeals();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [loadDeals]);

  const handleParticipateClick = (deal: any) => {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setSelectedDeal({ id: deal.id, unit: deal.unit, title: deal.title[lang] });
    setQty(1); // Default quantity
  };

  const handleModalConfirm = async () => {
    if (!selectedDeal || !user) return;
    setIsSubmitting(true);

    const deal = deals.find(d => d.id === selectedDeal.id);
    const finalQty = typeof qty === 'number' ? qty : 1;
    const amount = finalQty * (deal?.price || 10); // Mock amount calculation

    // 1. Perform real DB transaction
    await DealService.joinDeal(selectedDeal.id, finalQty);
    
    // 2. [Integration] Grant Loyalty Rewards
    const reward = await LoyaltyService.grantTransactionReward(user.id, amount);
    if (reward) {
      console.log(`[Loyalty] User reached Level ${reward.newLevel} with ${reward.newTrust} trust.`);
    }

    // 3. [Integration] Check for Dispatch Trigger (Phase 1.1)
    const updatedDeal = await DealService.getDealById(selectedDeal.id);
    if (updatedDeal && updatedDeal.currentVolume >= updatedDeal.targetVolume) {
      await DispatchService.dispatch({
        name: updatedDeal.supplierName || "Vanguard Vendor",
        email: updatedDeal.supplierEmail || "vendor@vanguard.test",
        preferredChannel: 'email'
      }, {
        subject: `[VANGUARD] Order Finalized: ${updatedDeal.title.en}`,
        body: `Deal ${updatedDeal.id} has reached target volume of ${updatedDeal.targetVolume} ${updatedDeal.unit}. Please fulfill.`
      });
    }
    
    setRefreshKey(prev => prev + 1);
    setIsSubmitting(false);
    setSelectedDeal(null);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const filteredDeals = activeTab === "All" ? deals : deals.filter(d => d.category === activeTab);

  const t = {
    ko: {
      navTitle: "뱅가드 공동구매",
      hotDeals: "이번 주 핫딜 🔥",
      hotDealsSub: "지금 참여하면 최대 24% 할인",
      participate: "공동구매 참여하기",
      navHome: "홈",
      navHistory: "주문내역",
      navProfile: user ? "프로필" : "로그인",
      cats: {
        All: "전체보기",
        Meat: "정육/계란",
        Veggie: "농산물",
        Sauce: "소스/오일",
      },
      adminNav: "관리화면"
    },
    en: {
      navTitle: "VANGUARD ALLIANCE",
      hotDeals: "This Week's Hot Deals 🔥",
      hotDealsSub: "Join now for up to 24% off",
      participate: "Join Group Buy",
      navHome: "Home",
      navHistory: "History",
      navProfile: user ? "Profile" : "Sign In",
      cats: {
        All: "View All",
        Meat: "Meats & Eggs",
        Veggie: "Vegetables",
        Sauce: "Sauces & Oils",
      },
      adminNav: "COMMAND"
    }
  }[lang];

  return (
    <div className="container">
      {/* Top Glass Nav */}
      <nav className="top-nav">
        <h1 className="top-nav-title display-txt">{t.navTitle}</h1>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <button 
            onClick={() => setLang(lang === "ko" ? "en" : "ko")}
            style={{ 
              background: "var(--surface-variant)", 
              border: "1px solid var(--outline-variant)", 
              borderRadius: "var(--radius-md)", 
              padding: "4px 8px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "0.8rem",
              color: "var(--on-surface-variant)"
            }}
          >
            {lang === "ko" ? "EN" : "KR"}
          </button>
          {user && user.email === 'boaznyakin@gmail.com' && (
            <button 
              onClick={() => window.location.href = "/commander"} 
              style={{ 
                background: "var(--primary-container)", 
                border: "1px solid var(--primary)", 
                borderRadius: "var(--radius-md)", 
                padding: "4px 12px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "0.8rem",
                color: "var(--on-primary-container)"
              }}
            >
              {t.adminNav}
            </button>
          )}
          <button style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--on-surface)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
           </svg>
          </button>
        </div>
      </nav>

      {/* Category Chips */}
      <div className="chip-container mb-4">
        {["All", "Meat", "Veggie", "Sauce"].map((cat) => (
          <button 
            key={cat} 
            className={`chip ${activeTab === cat ? 'active' : ''}`}
            onClick={() => setActiveTab(cat)}
          >
            {t.cats[cat as keyof typeof t.cats]}
          </button>
        ))}
      </div>

      {/* Feed Section */}
      <div style={{ padding: "0 1.5rem" }}>

        {/* Banner */}
        <div className="section" style={{ background: "var(--surface-container-lowest)", marginBottom: "1.5rem", padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "var(--ambient-shadow)" }}>
          <div>
            <h2 className="headline-md" style={{ color: "var(--primary)" }}>{t.hotDeals}</h2>
            <p className="body-md mt-4">{t.hotDealsSub}</p>
          </div>
          <div style={{ fontSize: "2.5rem" }}>📦</div>
        </div>

        {/* Unified Group Buy List */}
        <div className="flex-col gap-4">
          {filteredDeals.map((deal) => {
            const isCompleted = deal.currentVolume >= deal.targetVolume || new Date(deal.expiresAt) < new Date() || deal.status === 'completed';
            const isEliteOnly = deal.is_private && userLevel < 5;
            const countdown = isCompleted ? { urgent: false, label: lang === "ko" ? "조기 마감" : "Closed" } : formatCountdown(deal.expiresAt, lang);
            const discountRate = getCurrentDiscountRate(deal);
            return (
            <div key={deal.id} className="product-card" style={{ opacity: isCompleted ? 0.7 : 1, position: "relative" }}>
              {isCompleted && (
                <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "rgba(0,0,0,0.05)", pointerEvents: "none" }} />
              )}
              <div className="product-img-wrapper" style={{ height: "200px", position: "relative" }}>
                {isCompleted && (
                  <div style={{
                    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(-15deg)",
                    border: "3px solid #c62828", color: "#c62828", fontSize: "1.3rem", fontWeight: 900,
                    padding: "6px 16px", borderRadius: "8px", textTransform: "uppercase", letterSpacing: "3px",
                    zIndex: 20, pointerEvents: "none", 
                    background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(4px)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    WebkitTextStroke: "1px #c62828", textShadow: "1px 1px 2px rgba(255,255,255,0.8)"
                  }}>
                    {lang === "ko" ? "마감" : "CLOSED"}
                  </div>
                )}
                <img src={deal.image} alt={deal.title[lang]} style={{ filter: isCompleted ? "grayscale(100%)" : "none" }} />
                {/* Live Countdown Badge */}
                <div style={{
                  position: "absolute", top: "16px", left: "16px",
                  background: countdown.urgent ? "var(--primary)" : "var(--surface-container-lowest)",
                  color: countdown.urgent ? "var(--on-primary)" : "var(--on-surface)",
                  padding: "4px 10px", borderRadius: "100px",
                  fontSize: "0.75rem", fontWeight: 700,
                  display: "flex", alignItems: "center", gap: "4px",
                  animation: countdown.urgent ? "pulse 1.5s infinite" : "none"
                }}>
                  {countdown.urgent && <span>🔥</span>}
                  {countdown.label}
                </div>

                {/* Discount Badge */}
                <div style={{
                  position: "absolute", top: "16px", right: "16px",
                  background: "var(--secondary-container)",
                  color: "var(--on-secondary-fixed)",
                  padding: "4px 10px", borderRadius: "100px",
                  fontSize: "0.85rem", fontWeight: 800,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                }}>
                  -{(discountRate * 100).toFixed(0)}%
                </div>
              </div>
              <div className="card-content">
                <h3 className="body-lg" style={{ fontWeight: 700, color: "var(--on-surface)" }}>{deal.title[lang]}</h3>
                
                <div className="flex items-center justify-between mt-4">
                  <div>
                    <span className="headline-md" style={{ fontWeight: 800 }}>${deal.price}</span>
                    <span className="label-md" style={{ marginLeft: "4px", color: "var(--on-surface-variant)" }}>/ {deal.unit}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="progress-bg" style={{ position: "relative", overflow: "visible", marginTop: "24px", marginBottom: "20px" }}>
                    <div className="progress-fill" style={{ width: `${Math.min((deal.currentVolume / deal.targetVolume) * 100, 100)}%`, zIndex: 1 }}></div>
                    
                    {/* Integrated Tier Indicators (Separated Top/Bottom) */}
                    {deal.tiers?.map((tier: any, idx: number) => {
                      const pos = tier.threshold * 100;
                      const isReached = (deal.currentVolume / deal.targetVolume) >= tier.threshold;
                      return (
                        <div key={idx} style={{ position: "absolute", left: `${pos}%`, top: 0, bottom: 0, width: "3px", background: isReached ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.15)", zIndex: 3, pointerEvents: "none" }}>
                          {/* Discount Label - MOVED TO TOP */}
                          <div style={{ 
                            position: "absolute", left: 0, top: "-20px", transform: "translateX(-50%)",
                            fontSize: "0.7rem", fontWeight: 900, color: isReached ? "var(--primary)" : "var(--on-surface-variant)",
                            whiteSpace: "nowrap"
                          }}>
                            {(tier.rate * 100).toFixed(0)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Volume Stats - KEPT AT BOTTOM */}
                  <div className="flex justify-between label-md mt-2" style={{ color: deal.currentVolume >= deal.targetVolume * 0.8 ? "var(--primary)" : "var(--on-surface-variant)" }}>
                    <span>{deal.statusText[lang]}</span>
                    <span>{deal.currentVolume} {deal.unit} / {deal.targetVolume} {deal.unit}</span>
                  </div>
                </div>

                <button 
                  className="btn-primary mt-4" 
                  style={{ 
                    width: "100%",
                    background: isEliteOnly ? "var(--surface-variant)" : "",
                    color: isEliteOnly ? "var(--on-surface-variant)" : ""
                  }}
                  onClick={() => handleParticipateClick(deal)}
                  disabled={isCompleted || isEliteOnly}
                >
                  {isCompleted 
                    ? (lang === "ko" ? "마감됨" : "Closed") 
                    : isEliteOnly 
                      ? (lang === "ko" ? "엘리트 전용" : "Elite Only") 
                      : t.participate}
                </button>
              </div>
            </div>
            );
          })}
        </div>
      </div>


      {/* Bottom Nav */}
      <div className="bottom-nav">
        <a href="#" className="nav-item active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          {t.navHome}
        </a>
        <a href="/my-deals" className="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
          {t.navHistory}
        </a>
        <a 
          href={user ? "/profile" : "/login"} 
          className="nav-item"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          {t.navProfile}
        </a>
      </div>

      {/* Participation Modal */}
      {selectedDeal && (
        <div className="modal-overlay" style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.5)", zIndex: 1000,
          display: "flex", justifyContent: "center", alignItems: "flex-end", // align-items flex-end for bottom sheet
        }}>
          <div className="mobile-bottom-sheet">
            <h3 className="headline-md mb-2" style={{ color: "var(--on-surface)" }}>
              {lang === "ko" ? "수량 입력" : "Enter Quantity"}
            </h3>
            <p className="body-md mb-4" style={{ color: "var(--on-surface-variant)" }}>
              {selectedDeal.title}
            </p>
            
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
              <input 
                type="number" 
                min="1"
                value={qty}
                onChange={(e) => setQty(e.target.value === "" ? "" : Number(e.target.value))}
                style={{
                  flex: 1, padding: "12px", borderRadius: "0.5rem",
                  border: "1px solid var(--outline-variant)",
                  fontSize: "1.2rem", textAlign: "center"
                }}
              />
              <span className="title-md" style={{ color: "var(--on-surface-variant)" }}>
                {selectedDeal.unit}
              </span>
            </div>

            {/* Reward Preview (Modular Loyalty Integration) */}
            <div style={{ 
              marginBottom: "1.5rem", 
              padding: "8px 12px", 
              background: "var(--surface-low)", 
              borderRadius: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--brand-on-surface-variant)" }}>
                {lang === "ko" ? "예상 적립 포인트" : "Expected Points"}
              </span>
              <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--brand-primary)" }}>
                +{LoyaltyService.calculatePoints((Number(qty) || 1) * 25)} P
              </span>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button 
                onClick={() => setSelectedDeal(null)}
                style={{
                  flex: 1, padding: "12px", borderRadius: "100px",
                  background: "var(--surface-variant)", color: "var(--on-surface-variant)",
                  border: "none", fontWeight: 700, cursor: "pointer"
                }}
              >
                {lang === "ko" ? "취소" : "Cancel"}
              </button>
              <button 
                onClick={handleModalConfirm}
                disabled={isSubmitting}
                className="btn-primary"
                style={{ flex: 1, padding: "12px" }}
              >
                {isSubmitting 
                  ? (lang === "ko" ? "처리중..." : "Processing...") 
                  : (lang === "ko" ? "확인" : "Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
