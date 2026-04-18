"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DealService } from "@/services/dealService";
import { supabase } from "@/lib/supabaseClient";
import { GroupDeals } from "@/components/GroupDeals";

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

export default function Home() {
  const [activeTab, setActiveTab] = useState("All");
  const [lang, setLang] = useState<"ko" | "en">("ko");
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Modal States
  const [selectedDeal, setSelectedDeal] = useState<{id: string, unit: string, title: string} | null>(null);
  const [qty, setQty] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Countdown tick (fires every second to re-render timers)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  // Load Deals & Auth State
  useEffect(() => {
    async function loadData() {
      const dbDeals = await DealService.getActiveDeals();
      setDeals(dbDeals);
      
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      
      setLoading(false);
    }
    loadData();

    // Listen to Auth Changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleParticipateClick = (deal: any) => {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setSelectedDeal({ id: deal.id, unit: deal.unit, title: deal.title[lang] });
    setQty(1); // Default quantity
  };

  const handleModalConfirm = async () => {
    if (!selectedDeal) return;
    setIsSubmitting(true);

    // Optimistic UI Update based on user qty
    setDeals(prev => prev.map(d => {
      if (d.id === selectedDeal.id) {
        return { ...d, currentVol: d.currentVol + qty };
      }
      return d;
    }));

    // Perform real DB transaction
    await DealService.joinDeal(selectedDeal.id, qty);
    
    setIsSubmitting(false);
    setSelectedDeal(null);
  };

  const handleGroupDealJoin = (dealId: string, itemName: string, quantity: string) => {
    // Open modal with prefilled data for Alliance deal
    const unit = quantity.replace(/[0-9.\s]/g, '') || 'lb';
    const qtyNum = parseFloat(quantity) || 1;
    setSelectedDeal({ id: dealId, unit, title: itemName });
    setQty(qtyNum);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const filteredDeals = activeTab === "All" ? deals : deals.filter(d => d.category === activeTab);

  const t = {
    ko: {
      navTitle: "Collective Deals",
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
      }
    },
    en: {
      navTitle: "Collective Deals",
      hotDeals: "This Week's Hot Deals 🔥",
      hotDealsSub: "Join now for up to 24% off",
      participate: "Join Collective Deal",
      navHome: "Home",
      navHistory: "History",
      navProfile: user ? "Profile" : "Sign In",
      cats: {
        All: "View All",
        Meat: "Meats & Eggs",
        Veggie: "Vegetables",
        Sauce: "Sauces & Oils",
      }
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
        
        {/* Alliance Syndicate Deals (Phase 2) */}
        <div style={{ marginBottom: "2rem" }}>
          <GroupDeals 
            lang={lang} 
            onJoin={handleGroupDealJoin}
            trustScore={user ? 8.5 : 0} // High trust score to see Elite Deals when logged in
          />
        </div>

        {/* Banner */}
        <div className="section" style={{ background: "var(--surface-container-lowest)", marginBottom: "1.5rem", padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "var(--ambient-shadow)" }}>
          <div>
            <h2 className="headline-md" style={{ color: "var(--primary)" }}>{t.hotDeals}</h2>
            <p className="body-md mt-4">{t.hotDealsSub}</p>
          </div>
          <div style={{ fontSize: "2.5rem" }}>📦</div>
        </div>

        {/* Product List */}
        <div className="flex-col gap-4">
          {filteredDeals.map((deal) => {
            const countdown = formatCountdown(deal.expiresAt, lang);
            return (
            <div key={deal.id} className="product-card">
              <div className="product-img-wrapper" style={{ height: "200px" }}>
                <img src={deal.image} alt={deal.title[lang]} />
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
                  <div className="flex justify-between label-md" style={{ color: deal.currentVol >= deal.targetVol * 0.8 ? "var(--primary)" : "var(--on-surface-variant)" }}>
                    <span>{deal.statusText[lang]}</span>
                    <span>{deal.currentVol} {deal.unit} / {deal.targetVol} {deal.unit}</span>
                  </div>
                  <div className="progress-bg">
                    <div className="progress-fill" style={{ width: `${Math.min((deal.currentVol / deal.targetVol) * 100, 100)}%` }}></div>
                  </div>
                </div>

                <button 
                  className="btn-primary mt-4" 
                  style={{ width: "100%" }}
                  onClick={() => handleParticipateClick(deal)}
                  disabled={deal.currentVol >= deal.targetVol}
                >
                  {deal.currentVol >= deal.targetVol ? (lang === "ko" ? "마감됨" : "Closed") : t.participate}
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
            
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
              <input 
                type="number" 
                min="1"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value) || 1)}
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
