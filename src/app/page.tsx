"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { DealService } from "@/services/dealService";
import { supabase } from "@/lib/supabaseClient";
import { LoyaltyService } from "@/services/loyaltyService";
import { DispatchService } from "@/services/dispatchService";
import { NotificationService } from "@/services/notificationService";
import { GoogleSheetsService } from "@/services/googleSheetsService";
import NotificationCenter from "@/components/NotificationCenter";
import { generateAmazonInvoice } from "@/lib/invoiceGenerator";

// Helper: format ms remaining into a human-readable countdown
function formatCountdown(expiresAt: string | undefined, lang: "ko" | "en"): { label: string; urgent: boolean } {
  if (!expiresAt) return { label: lang === "ko" ? "진행중" : "Active", urgent: false };
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { label: lang === "ko" ? "마감" : "Closed", urgent: true };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);

  let label = "";
  if (lang === "ko") {
    if (days > 0) label += `${days}일 `;
    if (hours > 0 || days > 0) label += `${hours}시간 `;
    if (mins > 0 || hours > 0 || days > 0) label += `${mins}분 `;
    label += `${secs}초`;
  } else {
    if (days > 0) label += `${days}d `;
    if (hours > 0 || days > 0) label += `${hours}h `;
    if (mins > 0 || hours > 0 || days > 0) label += `${mins}m `;
    label += `${secs}s`;
  }

  const urgent = diff < (1000 * 60 * 60 * 6);
  return { label: label.trim(), urgent };
}


export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("All");
  const [lang, setLang] = useState<"ko" | "en">("ko");
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Modal States
  const [selectedDeal, setSelectedDeal] = useState<{id: string, unit: string, title: string, title_en?: string} | null>(null);
  const [qty, setQty] = useState<number | "">(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Countdown tick (fires every second to re-render timers)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Sync language from localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem("vanguard-lang") as "ko" | "en";
    if (savedLang) setLang(savedLang);
  }, []);

  const toggleLang = () => {
    const newLang = lang === "ko" ? "en" : "ko";
    setLang(newLang);
    localStorage.setItem("vanguard-lang", newLang);
  };

  // Load Deals — independent of auth state
  useEffect(() => {
    let cancelled = false;
    async function loadDeals() {
      try {
        const dbDeals = await DealService.getActiveDeals();
        if (!cancelled) {
          setDeals(dbDeals);
        }
      } catch (e) {
        console.error("[VANGUARD] Failed to load deals:", e);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadDeals();
    return () => { cancelled = true; };
  }, [refreshKey]);

  // Auth State — completely separate from deals loading
  useEffect(() => {
    let mounted = true;

    // Initial check
    supabase.auth.getUser().then(({ data }: { data: any }) => {
      if (mounted) {
        setUser(data.user);
      }
    });

    // Listen to Auth Changes — does NOT reload deals
    const { data: authListener } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      if (!mounted) return;
      const u = session?.user || null;
      setUser(u);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleParticipateClick = (deal: any) => {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setSelectedDeal({ 
      id: deal.id, 
      unit: deal.unit, 
      title: deal.title[lang],
      title_en: deal.title.en // EXACT ENGLISH NAME FROM ADMIN
    });
    setQty(1); // Default quantity
  };

  const handleModalConfirm = async () => {
    if (!selectedDeal || !user) return;
    setIsSubmitting(true);

    const deal = deals.find(d => d.id === selectedDeal.id);
    const finalQty = typeof qty === 'number' ? qty : 1;
    const amount = finalQty * (deal?.price || 10); // Mock amount calculation

    // 1. Fetch user profile for more detailed logging
    const { data: profile } = await supabase
      .from("profiles")
      .select("restaurant_name, phone_number, restaurant_address, tax_id")
      .eq("id", user.id)
      .single();

    // 2. Perform real DB transaction
    await DealService.joinDeal(selectedDeal.id, finalQty);
    
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

    // 4. [Integration] Generate PDF and get Base64
    const pdfResult = await generateAmazonInvoice({
      orderId: Math.random().toString(36).substring(2, 15), 
      userId: user.id,
      date: new Date().toLocaleDateString(),
      restaurantName: profile?.restaurant_name || "Business Member",
      restaurantAddress: profile?.restaurant_address || "Registered Address",
      restaurantPhone: profile?.phone_number || "N/A",
      taxId: profile?.tax_id, // EXACT TAX ID FROM PROFILE
      items: [{
        name: selectedDeal.title_en || selectedDeal.title, // EXACT ENGLISH NAME FROM ADMIN
        qty: finalQty,
        price: deal?.price || 0,
        total: amount
      }],
      grandTotal: amount
    }) as { pdfBase64: string, fileName: string } | null;

    // 6. [Integration] Log to Google Sheets with PDF Base64
    await GoogleSheetsService.logTransaction({
      userId: user.id,
      email: user.email || "unknown",
      storeName: profile?.restaurant_name || user.user_metadata?.restaurant_name || "N/A",
      phone: profile?.phone_number || user.user_metadata?.phone_number || "N/A",
      item: selectedDeal.title,
      qty: finalQty,
      amount: amount,
      pdfBase64: pdfResult?.pdfBase64,
      pdfName: pdfResult?.fileName
    });
    
    setRefreshKey(prev => prev + 1);
    setIsSubmitting(false);
    setSelectedDeal(null);

    // 4. [Notification] Create immediate order confirmation alert
    await NotificationService.createNotification({
      user_id: user.id,
      type: 'order_status',
      title: lang === "ko" ? "📦 주문 완료" : "📦 Order Placed",
      message: lang === "ko" 
        ? `${selectedDeal.title} 빅딜 참여가 완료되었습니다.` 
        : `Successfully joined ${selectedDeal.title} big deal.`,
      link: "/my-deals"
    });

    // 5. [Notification] Create deal milestone alert if target reached
    if (updatedDeal && updatedDeal.currentVolume >= updatedDeal.targetVolume) {
      await NotificationService.createNotification({
        user_id: user.id,
        type: 'deal_status',
        title: lang === "ko" ? "🎊 빅딜 성사!" : "🎊 Big Deal Achieved!",
        message: lang === "ko"
          ? `${selectedDeal.title}의 목표 수량이 달성되었습니다! 공급이 확정되었습니다.`
          : `Target volume for ${selectedDeal.title} reached! Fulfillment confirmed.`,
        link: "/"
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const filteredDeals = (activeTab === "All" ? deals : deals.filter(d => d.category === activeTab))
    .sort((a, b) => {
      const aDone = a.currentVolume >= a.targetVolume || new Date(a.expiresAt) < new Date() || a.status === 'completed';
      const bDone = b.currentVolume >= b.targetVolume || new Date(b.expiresAt) < new Date() || b.status === 'completed';
      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;
      return 0;
    });

  const maxDiscountRate = deals.reduce((max, deal) => {
    const dealMax = deal.tiers?.reduce((tMax: number, tier: any) => Math.max(tMax, tier.rate), 0) || 0;
    return Math.max(max, dealMax);
  }, 0);
  const displayMaxDiscount = maxDiscountRate > 0 ? Math.round(maxDiscountRate * 100) : 24;

  const t = {
    ko: {
      navTitle: "뱅가드 빅딜",
      hotDeals: "이번 주 빅딜 🔥",
      hotDealsSub: `지금 참여하여 목표 수량을 달성하세요`,
      participate: "빅딜 참여하기",
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
      hotDeals: "This Week's Big Deals 🔥",
      hotDealsSub: `Join now to reach target volume`,
      participate: "Join Big Deal",
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
            onClick={toggleLang}
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
          {user && (
            <button 
              onClick={() => router.push("/notifications")}
              className="notification-bell-container"
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--on-surface)", position: "relative" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {/* Optional: Add a simple red dot here later if needed */}
            </button>
          )}
          {!user && (
            <button 
              onClick={() => router.push("/login")}
              className="notification-bell-container"
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--on-surface)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </button>
          )}
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
            const countdown = isCompleted ? { label: lang === "ko" ? "조기 마감" : "Closed", urgent: false } : formatCountdown(deal.expiresAt, lang);
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
                  position: "absolute", bottom: "12px", left: "12px",
                  background: countdown.urgent ? "var(--primary)" : "rgba(255, 255, 255, 0.9)",
                  color: countdown.urgent ? "var(--on-primary)" : "var(--on-surface)",
                  backdropFilter: "blur(8px)",
                  padding: "4px 8px", borderRadius: "6px",
                  fontSize: "0.7rem", fontWeight: 700,
                  display: "flex", alignItems: "center", gap: "4px",
                  animation: countdown.urgent ? "pulse 1.5s infinite" : "none",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  zIndex: 15
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
                  <div className="progress-bg" style={{ position: "relative", overflow: "visible", marginTop: "24px", marginBottom: "20px" }}>
                    <div className="progress-fill" style={{ width: `${Math.min((deal.currentVolume / deal.targetVolume) * 100, 100)}%`, zIndex: 1 }}></div>
                    
                    <div style={{ 
                      position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                      fontSize: "0.75rem", fontWeight: 800, color: (deal.currentVolume / deal.targetVolume) >= 0.5 ? "white" : "var(--primary)",
                      zIndex: 2
                    }}>
                      {Math.round((deal.currentVolume / deal.targetVolume) * 100)}%
                    </div>
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
                    width: "100%"
                  }}
                  onClick={() => handleParticipateClick(deal)}
                  disabled={isCompleted}
                >
                  {isCompleted 
                    ? (lang === "ko" ? "마감됨" : "Closed") 
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
            
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              {/* Minus Button */}
              <button 
                onClick={() => setQty(prev => Math.max(1, (typeof prev === 'number' ? prev : 1) - 1))}
                style={{
                  width: "48px", height: "48px", borderRadius: "12px",
                  background: "var(--surface-variant)", color: "var(--on-surface-variant)",
                  border: "none", fontSize: "1.5rem", fontWeight: "bold", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}
              >
                -
              </button>

              <div style={{ flex: 1, position: "relative" }}>
                <input 
                  type="number" 
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value === "" ? "" : Number(e.target.value))}
                  style={{
                    width: "100%", padding: "12px", borderRadius: "12px",
                    border: "2px solid var(--outline-variant)",
                    fontSize: "1.4rem", textAlign: "center", fontWeight: "700",
                    background: "var(--surface-container-lowest)",
                    color: "var(--on-surface)",
                    WebkitAppearance: "none", margin: 0, MozAppearance: "textfield"
                  }}
                />
              </div>

              {/* Plus Button */}
              <button 
                onClick={() => setQty(prev => (typeof prev === 'number' ? prev : 0) + 1)}
                style={{
                  width: "48px", height: "48px", borderRadius: "12px",
                  background: "var(--primary)", color: "var(--on-primary)",
                  border: "none", fontSize: "1.5rem", fontWeight: "bold", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}
              >
                +
              </button>

              <span className="title-md" style={{ color: "var(--on-surface-variant)", minWidth: "40px" }}>
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
